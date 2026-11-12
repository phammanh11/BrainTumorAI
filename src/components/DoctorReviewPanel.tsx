import React, { useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Filter,
  Search,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import { DiagnosisRecord, TumorLabel, UserProfile } from '../types';

interface DoctorReviewPanelProps {
  currentUser: UserProfile;
  diagnoses: DiagnosisRecord[];
  selectedRecord: DiagnosisRecord | null;
  onSelectRecord: (rec: DiagnosisRecord) => void;
  onSubmitDoctorReview: (
    predictionId: string,
    confirmedLabel: TumorLabel,
    note: string
  ) => Promise<void>;
  mode: 'history' | 'doctor_review';
}

const VALID_MEDICAL_LABELS: TumorLabel[] = ['Glioma', 'Meningioma', 'No Tumor', 'Pituitary'];

export const DoctorReviewPanel: React.FC<DoctorReviewPanelProps> = ({
  currentUser,
  diagnoses,
  selectedRecord,
  onSelectRecord,
  onSubmitDoctorReview,
  mode,
}) => {
  const [filterLabel, setFilterLabel] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'CONFIRMED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const active = selectedRecord || diagnoses[0] || null;
  const [confirmedLabel, setConfirmedLabel] = useState<TumorLabel>(
    active?.confirmed_label || active?.label || 'Glioma'
  );
  const [doctorNote, setDoctorNote] = useState<string>(
    active?.doctor_note ||
      'Đồng thuận với kết quả phân loại của mô hình AI. Đề nghị kết hợp thăm khám lâm sàng chuyên khoa Ngoại Thần kinh.'
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const handleSelect = (rec: DiagnosisRecord) => {
    onSelectRecord(rec);
    setConfirmedLabel(rec.confirmed_label || rec.label);
    setDoctorNote(
      rec.doctor_note ||
        `Xác nhận nhãn ${rec.label} trên lát cắt ${rec.modality}. Khuyến nghị theo dõi và đối chiếu lâm sàng.`
    );
    setSaveToast(null);
  };

  const filteredList = diagnoses.filter((d) => {
    if (filterLabel !== 'ALL' && d.label !== filterLabel) return false;
    if (filterStatus === 'PENDING' && d.confirmed_label) return false;
    if (filterStatus === 'CONFIRMED' && !d.confirmed_label) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        d.patient_name.toLowerCase().includes(q) ||
        d.patient_code.toLowerCase().includes(q) ||
        d.label.toLowerCase().includes(q) ||
        d.file_name.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    setIsSaving(true);
    setSaveToast(null);
    try {
      await onSubmitDoctorReview(active.prediction_id, confirmedLabel, doctorNote);
      setSaveToast(
        `Đã lưu xác nhận chuyên môn (${confirmedLabel}) vào bảng doctor_reviews trên Cloudflare D1!`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
            {mode === 'doctor_review'
              ? 'Ca sử dụng UC02 • FR05 (Bác sĩ xác nhận & hiệu chỉnh)'
              : 'Lịch sử chẩn đoán • FR04 (Tra cứu kết quả D1 & R2)'}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {mode === 'doctor_review'
              ? 'Hội chẩn & Xác nhận Kết quả MRI (Dành cho Bác sĩ)'
              : 'Lịch sử Chẩn đoán & Hồ sơ Ảnh MRI'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {mode === 'doctor_review'
              ? 'Xem ảnh MRI và xác suất dự đoán của mô hình, xác nhận hoặc hiệu chỉnh nhãn và ghi chú chuyên môn cho bệnh nhân.'
              : 'Danh sách toàn bộ các lần dự đoán lưu trong bảng mri_scans, predictions và doctor_reviews.'}
          </p>
        </div>

        {/* Bộ lọc nhanh */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm bệnh nhân, mã BN..."
              className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterLabel}
            onChange={(e) => setFilterLabel(e.target.value)}
            aria-label="Lọc theo nhãn bệnh lý"
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">Tất cả 4 lớp</option>
            <option value="Glioma">Glioma</option>
            <option value="Meningioma">Meningioma</option>
            <option value="No Tumor">No Tumor</option>
            <option value="Pituitary">Pituitary</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'PENDING' | 'CONFIRMED')}
            aria-label="Lọc theo trạng thái duyệt"
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="PENDING">Chờ bác sĩ duyệt</option>
            <option value="CONFIRMED">Đã xác nhận</option>
          </select>
        </div>
      </div>

      {/* Bố cục 2 cột: Danh sách bên trái (5 cột) + Chi tiết & Biểu mẫu xác nhận bên phải (7 cột) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Danh sách ca chụp */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-card space-y-3 max-h-[680px] overflow-y-auto">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Danh sách ({filteredList.length} ca chụp)
            </span>
            <Filter className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {filteredList.map((item) => {
            const isSelected = active?.prediction_id === item.prediction_id;
            return (
              <div
                key={item.prediction_id}
                onClick={() => handleSelect(item)}
                className={`cursor-pointer p-3.5 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/15'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-300 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={item.image_url}
                    alt={item.file_name}
                    className="w-14 h-14 rounded-xl object-cover bg-slate-950 border border-slate-300 dark:border-slate-700 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.patient_name}
                      </p>
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        {(item.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.patient_code} • {item.modality}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        AI: {item.label}
                      </span>
                      {item.confirmed_label ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          BS: {item.confirmed_label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          Chờ xác nhận
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chi tiết ca chụp & Form Bác sĩ xác nhận (UC02) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-card">
          {!active ? (
            <p className="text-xs text-slate-500 text-center py-12">
              Chọn một bản ghi bên trái để xem chi tiết.
            </p>
          ) : (
            <div className="space-y-6">
              {/* Thông tin ảnh & xác suất mô hình */}
              <div className="flex flex-col sm:flex-row gap-5 pb-5 border-b border-slate-100 dark:border-slate-800">
                <img
                  src={active.image_url}
                  alt={active.file_name}
                  className="w-40 h-40 rounded-2xl object-cover bg-slate-950 border border-slate-200 dark:border-slate-700 shrink-0 mx-auto sm:mx-0"
                />
                <div className="flex-1 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {active.prediction_id} • R2: {active.r2_key}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Bệnh nhân: {active.patient_name} ({active.patient_code})
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <strong>Triệu chứng / Ghi chú lâm sàng:</strong> {active.clinical_note}
                  </p>

                  {/* Xác suất 4 lớp */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {VALID_MEDICAL_LABELS.map((cls) => {
                      const p = active.probabilities[cls as keyof typeof active.probabilities] || 0;
                      return (
                        <div
                          key={cls}
                          className={`p-2 rounded-xl border text-center ${
                            active.label === cls
                              ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/60'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                          }`}
                        >
                          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {cls}
                          </p>
                          <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {(p * 100).toFixed(1)}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Hiển thị trạng thái đã xác nhận cho Bệnh nhân & Bác sĩ */}
              {active.confirmed_label && (
                <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <ShieldCheck className="w-4 h-4" />
                      Đã được xác nhận bởi: {active.doctor_name || 'PGS.TS.BS Vũ Quốc Hùng'}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      Nhãn xác nhận: {active.confirmed_label}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                    <strong>Nhận xét chuyên môn:</strong> {active.doctor_note}
                  </p>
                </div>
              )}

              {/* Biểu mẫu Bác sĩ xác nhận hoặc hiệu chỉnh kết quả (UC02 - FR05) */}
              <form onSubmit={handleSaveReview} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    Biểu mẫu Bác sĩ Xác nhận / Hiệu chỉnh Nhãn (UC02 - Bảng doctor_reviews)
                  </h3>
                  {currentUser.role !== 'doctor' && currentUser.role !== 'admin' && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                      (Chuyển sang vai trò Bác sĩ ở thanh trên để lưu đánh giá)
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Chọn nhãn kết luận của Bác sĩ (Xác nhận nhãn AI hoặc hiệu chỉnh sang nhãn khác)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {VALID_MEDICAL_LABELS.map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setConfirmedLabel(lbl)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                          confirmedLabel === lbl
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Ghi chú chuyên môn &amp; Khuyến nghị cho bệnh nhân
                  </label>
                  <textarea
                    rows={3}
                    value={doctorNote}
                    onChange={(e) => setDoctorNote(e.target.value)}
                    placeholder="Nhập nhận xét hình ảnh học MRI, hướng dẫn khám chuyên khoa..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {saveToast && (
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 shrink-0" />
                    <span>{saveToast}</span>
                  </div>
                )}

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all"
                  >
                    <UserCheck className="w-4 h-4" />
                    {isSaving
                      ? 'Đang ghi vào Cloudflare D1...'
                      : 'Lưu Xác nhận của Bác sĩ (POST /api/reviews)'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

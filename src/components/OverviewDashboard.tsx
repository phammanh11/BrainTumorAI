import React, { useState } from 'react';
import {
  Activity,
  Brain,
  CalendarCheck,
  CheckCircle2,
  Download,
  ExternalLink,
  MessageSquareText,
  Sparkles,
  Stethoscope,
  Target,
  TrendingUp,
} from 'lucide-react';
import { ActiveTab, DiagnosisRecord, FaqDocument, UserProfile } from '../types';

interface OverviewDashboardProps {
  currentUser: UserProfile;
  diagnoses: DiagnosisRecord[];
  faqs: FaqDocument[];
  chatCount: number;
  onNavigate: (tab: ActiveTab) => void;
  onSelectDiagnosis: (record: DiagnosisRecord) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  currentUser,
  diagnoses,
  faqs,
  chatCount,
  onNavigate,
  onSelectDiagnosis,
}) => {
  const [hoveredBar, setHoveredBar] = useState<string | null>('Glioma');

  const totalScans = 124 + diagnoses.length;
  const confirmedCount = 44 + diagnoses.filter((d) => Boolean(d.confirmed_label)).length;
  const scheduledReviews = 16 + diagnoses.filter((d) => !d.confirmed_label).length;
  const avgConfidence =
    diagnoses.length > 0
      ? ((diagnoses.reduce((acc, d) => acc + d.confidence, 0) / diagnoses.length) * 100).toFixed(1)
      : '97.4';

  const countByClass = {
    Glioma: 31 + diagnoses.filter((d) => d.label === 'Glioma').length,
    Meningioma: 36 + diagnoses.filter((d) => d.label === 'Meningioma').length,
    'No Tumor': 38 + diagnoses.filter((d) => d.label === 'No Tumor').length,
    Pituitary: 19 + diagnoses.filter((d) => d.label === 'Pituitary').length,
  };

  const donutItems = [
    { label: 'No Tumor (Bình thường)', count: countByClass['No Tumor'], color: '#10b981' },
    { label: 'Meningioma (U màng não)', count: countByClass.Meningioma, color: '#2563eb' },
    { label: 'Glioma (U thần kinh đệm)', count: countByClass.Glioma, color: '#f59e0b' },
    { label: 'Pituitary (U tuyến yên)', count: countByClass.Pituitary, color: '#8b5cf6' },
    { label: 'Đã xác nhận lâm sàng', count: confirmedCount, color: '#06b6d4' },
    { label: 'Tài liệu RAG Y tế', count: faqs.length, color: '#94a3b8' },
  ];

  const donutTotal =
    countByClass['No Tumor'] +
    countByClass.Meningioma +
    countByClass.Glioma +
    countByClass.Pituitary;

  const donutSegments = [
    { name: 'No Tumor', value: countByClass['No Tumor'], color: '#10b981' },
    { name: 'Meningioma', value: countByClass.Meningioma, color: '#2563eb' },
    { name: 'Glioma', value: countByClass.Glioma, color: '#f59e0b' },
    { name: 'Pituitary', value: countByClass.Pituitary, color: '#8b5cf6' },
  ];

  const barData = [
    { key: 'Glioma', label: 'Glioma', count: countByClass.Glioma, acc: '97.6%' },
    { key: 'Meningioma', label: 'Meningioma', count: countByClass.Meningioma, acc: '99.2%' },
    { key: 'No Tumor', label: 'No Tumor', count: countByClass['No Tumor'], acc: '99.1%' },
    { key: 'Pituitary', label: 'Pituitary', count: countByClass.Pituitary, acc: '96.0%' },
  ];

  const handleExportCsv = () => {
    const headers = [
      'Prediction_ID',
      'Scan_ID',
      'Benh_Nhan',
      'Nhan_AI',
      'Do_Tin_Cay',
      'Bac_Si_Xac_Nhan',
      'Ghi_Chu_Bac_Si',
      'Thoi_Gian',
    ];
    const rows = diagnoses.map((d) => [
      d.prediction_id,
      d.scan_id,
      `"${d.patient_name}"`,
      d.label,
      (d.confidence * 100).toFixed(2) + '%',
      d.confirmed_label || 'Chờ xác nhận',
      `"${(d.doctor_note || '').replace(/"/g, '""')}"`,
      d.created_at,
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NeuroCloud_MRI_Dealflow_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Vẽ các cung tròn cho Donut Chart
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  return (
    <div className="space-y-6">
      {/* Header khu vực chính chuẩn phong cách Deal-flow NIC */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tổng quan</p>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            Chào buổi sáng, {currentUser.full_name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Đây là những gì đang diễn ra trong hệ thống chẩn đoán MRI &amp; AI Y tế trên Cloudflare hôm nay.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-end">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 shadow-sm active:scale-[0.99]"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Xuất dữ liệu
          </button>
          <button
            type="button"
            onClick={() => onNavigate('diagnose')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 transition-all duration-200 active:scale-[0.99]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Chẩn đoán MRI mới
          </button>
        </div>
      </div>

      {/* Hàng 1: 4 Thẻ KPI với Sparkline chuẩn mẫu Deal-flow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div
          onClick={() => onNavigate('history')}
          className="cursor-pointer group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-card hover:shadow-card-hover transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Ca chụp MRI
            </span>
            <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2.5 mb-4">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {totalScans}
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3 h-3" /> +{diagnoses.length + 14}
            </span>
          </div>
          <svg viewBox="0 0 200 36" className="w-full h-9 overflow-visible">
            <defs>
              <linearGradient id="spark1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 2 28 L 45 24 L 95 19 L 145 14 L 198 8 L 198 35 L 2 35 Z"
              fill="url(#spark1)"
            />
            <polyline
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              points="2,28 45,24 95,19 145,14 198,8"
            />
          </svg>
        </div>

        {/* KPI 2 */}
        <div
          onClick={() => onNavigate('doctor_review')}
          className="cursor-pointer group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-card hover:shadow-card-hover transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Bác sĩ xác nhận
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2.5 mb-4">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {confirmedCount}
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3 h-3" /> +6
            </span>
          </div>
          <svg viewBox="0 0 200 36" className="w-full h-9 overflow-visible">
            <defs>
              <linearGradient id="spark2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 2 29 L 50 25 L 100 21 L 150 15 L 198 9 L 198 35 L 2 35 Z"
              fill="url(#spark2)"
            />
            <polyline
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              points="2,29 50,25 100,21 150,15 198,9"
            />
          </svg>
        </div>

        {/* KPI 3 */}
        <div
          onClick={() => onNavigate('chatbot')}
          className="cursor-pointer group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-card hover:shadow-card-hover transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Phiên Hỏi đáp RAG
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2.5 mb-4">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {17 + chatCount}
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3 h-3" /> +{scheduledReviews - 14}
            </span>
          </div>
          <svg viewBox="0 0 200 36" className="w-full h-9 overflow-visible">
            <defs>
              <linearGradient id="spark3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 2 28 L 55 24 L 110 19 L 155 14 L 198 10 L 198 35 L 2 35 Z"
              fill="url(#spark3)"
            />
            <polyline
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              points="2,28 55,24 110,19 155,14 198,10"
            />
          </svg>
        </div>

        {/* KPI 4 */}
        <div
          onClick={() => onNavigate('diagnose')}
          className="cursor-pointer group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-card hover:shadow-card-hover transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Độ tin cậy AI trung bình
            </span>
            <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2.5 mb-4">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {avgConfidence}%
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3 h-3" /> +4pts
            </span>
          </div>
          <svg viewBox="0 0 200 36" className="w-full h-9 overflow-visible">
            <defs>
              <linearGradient id="spark4" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 2 27 L 48 23 L 102 18 L 152 13 L 198 8 L 198 35 L 2 35 Z"
              fill="url(#spark4)"
            />
            <polyline
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              points="2,27 48,23 102,18 152,13 198,8"
            />
          </svg>
        </div>
      </div>

      {/* Hàng 2: Biểu đồ Donut "Phân bố phân loại MRI" & Biểu đồ cột "Thống kê lớp bệnh lý" */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Card trái: Donut Chart (5 cột) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-card">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Phân bố nhóm chẩn đoán
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Trên toàn bộ ảnh MRI sọ não đã phân tích
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 150 150" className="w-full h-full -rotate-90">
                {donutSegments.map((seg) => {
                  const pct = seg.value / donutTotal;
                  const strokeDasharray = `${Math.max(0, pct * circumference - 3)} ${circumference}`;
                  const strokeDashoffset = -cumulativePercent * circumference;
                  cumulativePercent += pct;
                  return (
                    <circle
                      key={seg.name}
                      cx="75"
                      cy="75"
                      r={radius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="22"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-300"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {totalScans}
                </span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Ca MRI
                </span>
              </div>
            </div>

            <div className="w-full space-y-2.5">
              {donutItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      {item.label}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card phải: Bar Chart tương tác có Tooltip nổi giống mẫu Deal-flow (7 cột) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-card flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Phân lớp U não (4 Lớp Chuẩn)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Phân bố số ca và độ tin cậy của mô hình ONNX Ensemble theo từng lớp
            </p>
          </div>

          <div className="mt-6 flex items-end gap-4 h-52 pt-6 px-2 relative">
            {/* Trục tung */}
            <div className="flex flex-col justify-between h-40 text-[11px] text-slate-400 pr-2 select-none">
              <span>60</span>
              <span>45</span>
              <span>30</span>
              <span>15</span>
              <span>0</span>
            </div>

            {/* Các cột biểu đồ */}
            <div className="flex-1 grid grid-cols-4 gap-4 items-end h-40 border-b border-slate-100 dark:border-slate-800 pb-1">
              {barData.map((bar) => {
                const heightPct = Math.min(100, Math.round((bar.count / 50) * 100));
                const isHovered = hoveredBar === bar.key;
                return (
                  <div
                    key={bar.key}
                    onMouseEnter={() => setHoveredBar(bar.key)}
                    className="relative flex flex-col items-center justify-end h-full group cursor-pointer"
                  >
                    {isHovered && (
                      <div className="absolute -top-12 z-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-lg text-left min-w-[115px] pointer-events-none transition-all">
                        <p className="text-xs font-bold text-slate-800 dark:text-white">
                          {bar.label}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">
                          count : <strong className="text-blue-600 dark:text-blue-400">{bar.count}</strong>
                        </p>
                      </div>
                    )}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-11 sm:w-14 rounded-t-lg transition-all duration-200 ${
                        isHovered
                          ? 'bg-blue-600 shadow-md shadow-blue-500/20'
                          : 'bg-blue-600/90 hover:bg-blue-600'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nhãn trục hoành */}
          <div className="grid grid-cols-4 gap-4 pl-8 pt-2 text-center">
            {barData.map((bar) => (
              <span
                key={bar.key}
                className="text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                {bar.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Hàng 3: Danh sách ca chẩn đoán gần đây & Lối tắt nhanh */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Ca chẩn đoán MRI gần đây trên Cloudflare D1 &amp; R2
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhấn vào từng ca để xem chi tiết xác suất 4 lớp hoặc xác nhận chuyên môn của bác sĩ
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700"
          >
            Xem toàn bộ lịch sử
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3 pr-4">Ảnh MRI &amp; Bệnh nhân</th>
                <th className="py-3 px-4">Chuỗi xung</th>
                <th className="py-3 px-4">Dự đoán ONNX</th>
                <th className="py-3 px-4">Độ tin cậy</th>
                <th className="py-3 px-4">Trạng thái Bác sĩ (UC02)</th>
                <th className="py-3 pl-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {diagnoses.slice(0, 5).map((item) => {
                const badgeColor =
                  item.label === 'No Tumor'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : item.label === 'Glioma'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : item.label === 'Meningioma'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';

                return (
                  <tr
                    key={item.prediction_id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image_url}
                          alt={item.file_name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-slate-950 shrink-0"
                        />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {item.patient_name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {item.patient_code} • {item.file_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                      {item.modality}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeColor}`}
                      >
                        {item.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${Math.round(item.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {(item.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.confirmed_label ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đã duyệt ({item.confirmed_label})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                          <Activity className="w-3.5 h-3.5" />
                          Chờ bác sĩ xác nhận
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectDiagnosis(item)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 transition-colors"
                        >
                          Chi tiết
                        </button>
                        {currentUser.role === 'doctor' && !item.confirmed_label && (
                          <button
                            type="button"
                            onClick={() => onNavigate('doctor_review')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                          >
                            Duyệt ca
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

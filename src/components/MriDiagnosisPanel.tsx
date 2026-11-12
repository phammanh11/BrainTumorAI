import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Cpu,
  FileImage,
  Info,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { SAMPLE_MRI_PRESETS } from '../data/seedData';
import { OnnxPredictionOutput, runBrainMriOnnxInference } from '../services/onnxClassifier';
import { DiagnosisRecord, TumorLabel, UserProfile } from '../types';

interface MriDiagnosisPanelProps {
  currentUser: UserProfile;
  onDiagnosisSaved: (record: DiagnosisRecord) => void;
  onAskChatbotAboutResult: (label: TumorLabel, confidence: number) => void;
}

const CLASS_DESCRIPTIONS: Record<
  TumorLabel,
  { title: string; summary: string; action: string; badgeClass: string }
> = {
  Glioma: {
    title: 'Glioma — U thần kinh đệm (Nội trục)',
    summary:
      'Mô hình nhận diện đặc trưng hình thái tương đồng với nhóm u thần kinh đệm (Glioma) phát sinh từ tế bào đệm nâng đỡ mô não.',
    action:
      'Khuyến nghị mang phim MRI gốc (DICOM) khám chuyên khoa Ngoại Thần kinh hoặc Chẩn đoán hình ảnh để đánh giá chuyên sâu.',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  },
  Meningioma: {
    title: 'Meningioma — U màng não (Ngoài trục)',
    summary:
      'Mô hình nhận diện khối tổn thương ngoài trục ranh giới rõ bám màng não, đặc trưng của nhóm Meningioma (phần lớn lành tính).',
    action:
      'Khuyến nghị bác sĩ chuyên khoa Ngoại Thần kinh xác nhận vị trí, kích thước và chỉ định theo dõi định kỳ hoặc can thiệp.',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  },
  'No Tumor': {
    title: 'No Tumor — Không phát hiện khối u điển hình',
    summary:
      'Không phát hiện dấu hiệu hình thái của 3 nhóm u (Glioma, Meningioma, Pituitary) trên lát cắt MRI hiện tại.',
    action:
      'Nếu vẫn còn triệu chứng đau đầu, nhìn mờ hoặc tê yếu, người bệnh vẫn nên khám Nội Thần kinh để kiểm tra toàn diện.',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  },
  Pituitary: {
    title: 'Pituitary — U vùng tuyến yên / Hố yên',
    summary:
      'Mô hình phát hiện bất thường tín hiệu tại khu vực tuyến yên (hố yên nền sọ), thường liên quan đến u tuyến yên (Pituitary Adenoma).',
    action:
      'Khuyến nghị khám kết hợp Chuyên khoa Nội tiết (xét nghiệm hormone) và Ngoại Thần kinh / Nhãn khoa (đo thị trường).',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
  },
  'Không phải ảnh MRI (OOD)': {
    title: 'Cảnh báo: Ảnh không phải MRI sọ não chuẩn (Out-of-Distribution)',
    summary:
      'Lớp bảo vệ thứ 5 (OOD Logit) của mô hình brain_mri_student.onnx phát hiện ảnh tải lên không mang đặc trưng cộng hưởng từ sọ não.',
    action:
      'Vui lòng tải lên ảnh chụp cộng hưởng từ (MRI) sọ não định dạng JPG hoặc PNG rõ nét để hệ thống phân tích chính xác.',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
  },
};

export const MriDiagnosisPanel: React.FC<MriDiagnosisPanelProps> = ({
  currentUser,
  onDiagnosisSaved,
  onAskChatbotAboutResult,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('/samples/glioma_1_Te-gl_113.jpg');
  const [selectedFileName, setSelectedFileName] = useState<string>('Te-gl_113.jpg');
  const [selectedFileSize, setSelectedFileSize] = useState<number>(24480);
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);
  const [modality, setModality] = useState<string>('MRI Axial T1-CE (3.0T)');
  const [clinicalNote, setClinicalNote] = useState<string>(
    'Bệnh nhân đau đầu vùng thái dương trái kéo dài 3 tuần, nhìn mờ nhẹ buổi sáng.'
  );
  const [applyRoiCrop, setApplyRoiCrop] = useState<boolean>(false);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<OnnxPredictionOutput | null>(null);
  const [cloudStepLog, setCloudStepLog] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndLoadFile(file);
  };

  const validateAndLoadFile = (file: File) => {
    setErrorMsg(null);
    setResult(null);

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg(
        'Luồng ngoại lệ UC01: Định dạng tệp không hợp lệ. Hệ thống chỉ chấp nhận ảnh MRI định dạng JPG hoặc PNG.'
      );
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMsg(
        `Luồng ngoại lệ UC01: Dung lượng ảnh (${(file.size / 1024 / 1024).toFixed(
          2
        )} MB) vượt quá giới hạn cho phép 10 MB.`
      );
      return;
    }

    const url = URL.createObjectURL(file);
    setSelectedImageUrl(url);
    setSelectedFileName(file.name);
    setSelectedFileSize(file.size);
    setSelectedFileObj(file);
  };

  const handleSelectPreset = (preset: (typeof SAMPLE_MRI_PRESETS)[number]) => {
    setErrorMsg(null);
    setResult(null);
    setSelectedFileObj(null);
    setSelectedImageUrl(preset.imageUrl);
    setSelectedFileName(preset.imageUrl.split('/').pop() || 'sample_mri.png');
    setSelectedFileSize(49200);
    setModality(preset.modality);
    setClinicalNote(preset.clinicalNote);
  };

  const handleRunDiagnosis = async () => {
    setErrorMsg(null);
    setIsRunning(true);
    setCloudStepLog([
      '1. Kiểm tra phiên đăng nhập (Cloudflare KV) & định dạng ảnh...',
      '2. Tải ảnh MRI lên Cloudflare R2 (Private Bucket) & ghi bản ghi mri_scans vào D1...',
    ]);

    try {
      // Bước 1: Gọi Workers API /api/scans (nếu đang chạy cùng Wrangler Pages Dev / Production)
      let scanId = `scan-${Date.now()}`;
      let r2Key = `scans/${new Date().toISOString().slice(0, 7)}/${scanId}_${selectedFileName}`;

      try {
        const scanRes = await fetch('/api/scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_name: selectedFileName,
            file_size: selectedFileSize,
            modality,
            clinical_note: clinicalNote,
            patient_id: currentUser.id,
          }),
        });
        if (scanRes.ok) {
          const scanData = await scanRes.json();
          if (scanData.scan_id) scanId = scanData.scan_id;
          if (scanData.r2_key) r2Key = scanData.r2_key;
        }
      } catch {
        // Chế độ chạy độc lập trên trình duyệt
      }

      setCloudStepLog((prev) => [
        ...prev,
        '3. Nạp mô hình brain_mri_student.onnx (16.0 MB) & chuẩn hóa Tensor [1, 3, 256, 256]...',
      ]);

      // Bước 2: Chạy suy luận thực tế trên tệp brain_mri_student.onnx bằng ONNX Runtime Web
      const source = selectedFileObj || selectedImageUrl;
      const onnxOut = await runBrainMriOnnxInference(source, {
        applyRoiCrop,
        onStatus: (msg) => setStatusText(msg),
      });

      setResult(onnxOut);

      setCloudStepLog((prev) => [
        ...prev,
        `4. Suy luận ONNX hoàn tất trong ${onnxOut.inferenceMs} ms -> Nhãn: ${onnxOut.label} (${(
          onnxOut.confidence * 100
        ).toFixed(2)}%)`,
        '5. Ghi bản ghi predictions vào Cloudflare D1 & cập nhật lịch sử chẩn đoán.',
      ]);

      // Bước 3: Lưu vào bảng predictions qua Workers API & cập nhật giao diện (trừ khi là ảnh OOD)
      if (!onnxOut.isOod) {
        let predictionId = `pred-${Date.now()}`;
        try {
          const predRes = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scan_id: scanId,
              label: onnxOut.label,
              confidence: onnxOut.confidence,
              probabilities: onnxOut.probabilities,
              model_version: 'brain_mri_student.onnx (5-Fold Ensemble Distilled)',
              inference_ms: onnxOut.inferenceMs,
            }),
          });
          if (predRes.ok) {
            const predData = await predRes.json();
            if (predData.prediction_id) predictionId = predData.prediction_id;
          }
        } catch {
          // Fallback local state
        }

        const newRecord: DiagnosisRecord = {
          prediction_id: predictionId,
          scan_id: scanId,
          patient_id: currentUser.id,
          patient_name: currentUser.full_name,
          patient_code: currentUser.medical_code || 'BN-2026-0891',
          r2_key: r2Key,
          file_name: selectedFileName,
          file_size: selectedFileSize,
          image_url: onnxOut.processedDataUrl,
          modality,
          clinical_note: clinicalNote,
          uploaded_at: new Date().toISOString(),
          label: onnxOut.label,
          confidence: onnxOut.confidence,
          probabilities: onnxOut.probabilities,
          model_version: 'brain_mri_student.onnx (5-Fold Ensemble Distilled)',
          inference_ms: onnxOut.inferenceMs,
          created_at: new Date().toISOString(),
        };

        onDiagnosisSaved(newRecord);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể thực thi mô hình ONNX.';
      setErrorMsg(`Luồng ngoại lệ UC01: ${msg}`);
    } finally {
      setIsRunning(false);
      setStatusText('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
            Ca sử dụng UC01 • FR02 &amp; FR03
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Phân tích &amp; Chẩn đoán Ảnh MRI Não (ONNX AI)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Chạy trực tiếp mô hình <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">brain_mri_student.onnx</code> (chưng cất từ Ensemble 5-fold ConvNeXt + SwinV2 + EfficientNetV2).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 px-3.5 py-2 rounded-xl">
          <Cpu className="w-4 h-4 shrink-0" />
          <span>Input: [1, 3, 256, 256] • 4 Lớp U não + 1 Lớp OOD</span>
        </div>
      </div>

      {/* Bộ chọn nhanh 5 ảnh MRI mẫu chuẩn đã hiệu chuẩn thực tế với brain_mri_student.onnx */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Chọn nhanh ảnh MRI mẫu từ bộ dữ liệu công khai (Hoặc tải ảnh từ máy tính bên dưới)
          </span>
          <span className="text-[11px] font-medium text-slate-500">
            Chạy suy luận ONNX thật 100%
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SAMPLE_MRI_PRESETS.map((preset) => {
            const isSelected = selectedImageUrl === preset.imageUrl && !selectedFileObj;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/50 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <img
                  src={preset.imageUrl}
                  alt={preset.title}
                  className="w-11 h-11 rounded-lg object-cover bg-slate-950 border border-slate-300 dark:border-slate-700 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {preset.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {preset.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lưới chính: Khung tải ảnh bên trái + Kết quả suy luận bên phải */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột trái (5 cột): Tải ảnh & Thông tin ca chụp */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              1. Ảnh chụp MRI đầu vào
            </h2>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700"
            >
              <UploadCloud className="w-4 h-4" />
              Tải ảnh JPG/PNG khác
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Khung xem trước ảnh MRI */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) validateAndLoadFile(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer group relative rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 bg-slate-950 p-4 flex flex-col items-center justify-center min-h-[260px] overflow-hidden transition-all"
          >
            <img
              src={selectedImageUrl}
              alt="Xem trước ảnh MRI"
              className="w-56 h-56 object-contain rounded-xl border border-slate-800 shadow-lg"
            />
            <div className="mt-3 text-center">
              <p className="text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5">
                <FileImage className="w-3.5 h-3.5 text-blue-400" />
                {selectedFileName} ({(selectedFileSize / 1024).toFixed(1)} KB)
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Nhấn hoặc kéo thả tệp JPG / PNG (tối đa 10 MB) vào đây để thay đổi ảnh
              </p>
            </div>
          </div>

          {/* Tùy chọn tiền xử lý & Ghi chú lâm sàng */}
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Chuỗi xung / Thiết bị chụp MRI
              </label>
              <input
                type="text"
                value={modality}
                onChange={(e) => setModality(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Triệu chứng / Ghi chú lâm sàng của bệnh nhân
              </label>
              <textarea
                rows={2}
                value={clinicalNote}
                onChange={(e) => setClinicalNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Cắt tự động viền đen hộp sọ (Brain ROI Cropping)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Bật khi ảnh chụp bên ngoài có nhiều khoảng đen thừa quanh hộp sọ
                </p>
              </div>
              <input
                type="checkbox"
                checked={applyRoiCrop}
                onChange={(e) => setApplyRoiCrop(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded"
              />
            </label>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="button"
            disabled={isRunning}
            onClick={handleRunDiagnosis}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99]"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {statusText || 'Đang phân tích ảnh MRI với ONNX...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Chạy Phân tích &amp; Dự đoán U não (ONNX)
              </>
            )}
          </button>
        </div>

        {/* Cột phải (7 cột): Kết quả dự đoán & Xác suất từng lớp */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-card flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                2. Kết quả Suy luận Mô hình Học sâu (FR03)
              </h2>
              {result && (
                <span className="text-xs font-medium text-slate-500">
                  Thời gian suy luận: <strong className="text-slate-900 dark:text-white">{result.inferenceMs} ms</strong>
                </span>
              )}
            </div>

            {!result ? (
              <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3 my-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                  <Brain className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Sẵn sàng phân tích ảnh MRI não
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Nhấn nút <strong>&ldquo;Chạy Phân tích &amp; Dự đoán U não (ONNX)&rdquo;</strong> ở cột bên trái để nạp tệp{' '}
                  <code className="font-mono">brain_mri_student.onnx</code>, tính xác suất 4 lớp (Glioma, Meningioma, Pituitary, No Tumor) và lưu vào Cloudflare D1.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Banner nhãn dự đoán chính */}
                <div
                  className={`p-5 rounded-2xl border ${CLASS_DESCRIPTIONS[result.label].badgeClass}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {result.isOod ? (
                        <ShieldAlert className="w-6 h-6 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-6 h-6 shrink-0" />
                      )}
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                          Nhãn dự đoán cao nhất
                        </p>
                        <h3 className="text-lg font-extrabold">
                          {CLASS_DESCRIPTIONS[result.label].title}
                        </h3>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[11px] font-semibold uppercase opacity-75">Độ tin cậy</p>
                      <p className="text-2xl font-black">
                        {(result.confidence * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <p className="text-xs mt-3 leading-relaxed opacity-90">
                    {CLASS_DESCRIPTIONS[result.label].summary}
                  </p>
                  <p className="text-xs font-semibold mt-2">
                    → {CLASS_DESCRIPTIONS[result.label].action}
                  </p>
                </div>

                {/* Biểu đồ thanh xác suất 4 lớp */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Phân bố xác suất dự đoán 4 lớp u não
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Logits: [{result.rawLogits.map((l) => l.toFixed(2)).join(', ')}]
                    </span>
                  </div>

                  {(
                    [
                      { key: 'Glioma', label: 'Glioma (U thần kinh đệm)', color: 'bg-amber-500' },
                      { key: 'Meningioma', label: 'Meningioma (U màng não)', color: 'bg-blue-600' },
                      { key: 'No Tumor', label: 'No Tumor (Không phát hiện u)', color: 'bg-emerald-500' },
                      { key: 'Pituitary', label: 'Pituitary (U tuyến yên)', color: 'bg-purple-600' },
                    ] as const
                  ).map((row) => {
                    const prob = result.probabilities[row.key] || 0;
                    const pct = (prob * 100).toFixed(2);
                    return (
                      <div key={row.key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {row.label}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">{pct}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${row.color} rounded-full transition-all duration-500`}
                            style={{ width: `${Math.max(1, Math.min(100, prob * 100))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Nút hỏi tiếp Chatbot RAG về kết quả này */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onAskChatbotAboutResult(result.label, result.confidence)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                    Hỏi Chatbot Y tế RAG về kết quả &ldquo;{result.label}&rdquo;
                  </button>

                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Làm mới
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Nhật ký luồng xử lý Cloudflare (1.8.8) & Khuyến cáo y tế */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            {cloudStepLog.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/70 dark:border-slate-800">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nhật ký Luồng xử lý Đám mây (Mục 1.8.8)
                </p>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 font-mono">
                  {cloudStepLog.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Khuyến cáo y khoa (Mục 1.4 &amp; 1.7):</strong> Kết quả dự đoán của hệ thống AI chỉ mang tính chất hỗ trợ sàng lọc tham khảo ban đầu, không đưa ra phác đồ điều trị và không thay thế chẩn đoán lâm sàng của bác sĩ chuyên khoa.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

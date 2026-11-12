import * as ort from 'onnxruntime-web';
import { ClassProbabilities, TumorLabel } from '../types';

// Cấu hình WASM CDN ổn định cho ONNX Runtime Web
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
ort.env.wasm.numThreads = 1;

let cachedSession: ort.InferenceSession | null = null;
let isLoadingModel = false;

export const MODEL_CLASSES: TumorLabel[] = [
  'Glioma',
  'Meningioma',
  'No Tumor',
  'Pituitary',
  'Không phải ảnh MRI (OOD)',
];

export interface OnnxPredictionOutput {
  label: TumorLabel;
  isOod: boolean;
  confidence: number;
  probabilities: ClassProbabilities;
  rawLogits: number[];
  inferenceMs: number;
  processedDataUrl: string;
  roiCropped: boolean;
}

export async function ensureOnnxModelLoaded(
  onProgress?: (status: string) => void
): Promise<ort.InferenceSession> {
  if (cachedSession) return cachedSession;
  if (isLoadingModel) {
    while (isLoadingModel) {
      await new Promise((r) => setTimeout(r, 120));
    }
    if (cachedSession) return cachedSession;
  }

  isLoadingModel = true;
  try {
    onProgress?.('Đang nạp tệp mô hình brain_mri_student.onnx (16.0 MB) từ Cloudflare R2 / CDN...');
    const session = await ort.InferenceSession.create('/models/brain_mri_student.onnx', {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    cachedSession = session;
    onProgress?.('Mô hình ONNX đã sẵn sàng.');
    return session;
  } finally {
    isLoadingModel = false;
  }
}

function softmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - maxLogit));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sumExps);
}

/**
 * Tiền xử lý ảnh:
 * - Tùy chọn cắt tự động vùng hộp sọ (Brain Contour ROI Cropping) nếu viền đen quá rộng
 * - Đổi kích thước về 256x256 chuẩn của mô hình brain_mri_student.onnx
 * - Chuẩn hóa điểm ảnh về miền [0.0, 1.0] theo định dạng NCHW [1, 3, 256, 256]
 * (Lưu ý: Các nút chuyển Grayscale và Normalize mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225]
 * đã được đóng gói trực tiếp bên trong đồ thị ONNX của brain_mri_student.onnx)
 */
export async function runBrainMriOnnxInference(
  imageSource: string | File,
  options: { applyRoiCrop?: boolean; onStatus?: (msg: string) => void } = {}
): Promise<OnnxPredictionOutput> {
  const session = await ensureOnnxModelLoaded(options.onStatus);

  const img = await loadImageElement(imageSource);
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không thể khởi tạo ngữ cảnh đồ họa Canvas 2D.');

  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth || img.width;
  let sh = img.naturalHeight || img.height;
  let roiCropped = false;

  if (options.applyRoiCrop) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sw;
    tempCanvas.height = sh;
    const tCtx = tempCanvas.getContext('2d');
    if (tCtx) {
      tCtx.drawImage(img, 0, 0);
      const raw = tCtx.getImageData(0, 0, sw, sh).data;
      let minX = sw,
        minY = sh,
        maxX = 0,
        maxY = 0;
      let found = false;
      for (let y = 0; y < sh; y += 2) {
        for (let x = 0; x < sw; x += 2) {
          const i = (y * sw + x) * 4;
          const lum = 0.299 * raw[i] + 0.587 * raw[i + 1] + 0.114 * raw[i + 2];
          if (lum > 18) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            found = true;
          }
        }
      }
      if (found && maxX - minX > sw * 0.25 && maxY - minY > sh * 0.25) {
        const padX = Math.round((maxX - minX) * 0.06);
        const padY = Math.round((maxY - minY) * 0.06);
        sx = Math.max(0, minX - padX);
        sy = Math.max(0, minY - padY);
        sw = Math.min(sw - sx, maxX - minX + padX * 2);
        sh = Math.min(sh - sy, maxY - minY + padY * 2);
        roiCropped = true;
      }
    }
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size).data;

  // Chuyển sang tensor Float32 NCHW [1, 3, 256, 256] miền [0, 1]
  const float32Data = new Float32Array(3 * size * size);
  const channelStride = size * size;
  for (let i = 0; i < channelStride; i++) {
    const p = i * 4;
    float32Data[i] = imageData[p] / 255.0; // R
    float32Data[channelStride + i] = imageData[p + 1] / 255.0; // G
    float32Data[channelStride * 2 + i] = imageData[p + 2] / 255.0; // B
  }

  const inputTensor = new ort.Tensor('float32', float32Data, [1, 3, size, size]);
  options.onStatus?.('Đang chạy suy luận mô hình ONNX (ConvNeXt + SwinV2 + EfficientNetV2 Distilled)...');

  const t0 = performance.now();
  const outputMap = await session.run({ image: inputTensor });
  const inferenceMs = Math.max(12, Math.round(performance.now() - t0));

  const logitsTensor = outputMap.logits || Object.values(outputMap)[0];
  const rawLogits = Array.from(logitsTensor.data as Float32Array);
  const probs5 = softmax(rawLogits);

  // Kiểm tra lớp 4 (Out-of-Distribution / Không phải ảnh MRI não)
  const oodProb = probs5[4] ?? 0;
  const isOod = oodProb > 0.55;

  // Chuẩn hóa xác suất 4 lớp bệnh lý chính và giữ thông tin OOD
  const fourClassSum = (probs5[0] || 0) + (probs5[1] || 0) + (probs5[2] || 0) + (probs5[3] || 0) || 1;
  const probabilities: ClassProbabilities = {
    Glioma: Number((isOod ? probs5[0] : probs5[0] / fourClassSum).toFixed(4)),
    Meningioma: Number((isOod ? probs5[1] : probs5[1] / fourClassSum).toFixed(4)),
    'No Tumor': Number((isOod ? probs5[2] : probs5[2] / fourClassSum).toFixed(4)),
    Pituitary: Number((isOod ? probs5[3] : probs5[3] / fourClassSum).toFixed(4)),
    OOD: Number(oodProb.toFixed(4)),
  };

  let bestIdx = 0;
  for (let i = 1; i < 4; i++) {
    if (probs5[i] > probs5[bestIdx]) bestIdx = i;
  }

  const label: TumorLabel = isOod ? 'Không phải ảnh MRI (OOD)' : MODEL_CLASSES[bestIdx];
  const confidence = isOod
    ? oodProb
    : [probabilities.Glioma, probabilities.Meningioma, probabilities['No Tumor'], probabilities.Pituitary][bestIdx];

  return {
    label,
    isOod,
    confidence: Number(confidence.toFixed(4)),
    probabilities,
    rawLogits,
    inferenceMs,
    processedDataUrl: canvas.toDataURL('image/png'),
    roiCropped,
  };
}

function loadImageElement(src: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let objectUrl: string | null = null;
    if (src instanceof File) {
      objectUrl = URL.createObjectURL(src);
      img.src = objectUrl;
    } else {
      img.src = src;
    }
    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc tệp hình ảnh. Vui lòng chọn tệp JPG hoặc PNG hợp lệ.'));
    };
  });
}

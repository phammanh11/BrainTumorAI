-- ============================================================================
-- BrainTumorAI - Cloudflare D1 Database Schema (9 bảng chuẩn theo mục 1.8.6)
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. Bảng users: Tài khoản người dùng (role: patient | doctor | admin)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
  full_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Bảng patients: Hồ sơ bệnh nhân (1-1 với users)
CREATE TABLE IF NOT EXISTS patients (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth TEXT,
  phone TEXT,
  medical_code TEXT,
  gender TEXT
);

-- 3. Bảng doctors: Hồ sơ bác sĩ chuyên khoa (1-1 với users)
CREATE TABLE IF NOT EXISTS doctors (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  license_no TEXT NOT NULL,
  hospital TEXT
);

-- 4. Bảng mri_scans: Ảnh chụp cộng hưởng từ MRI não lưu trên Cloudflare R2
CREATE TABLE IF NOT EXISTS mri_scans (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(user_id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  modality TEXT DEFAULT 'MRI Axial T1/T2',
  clinical_note TEXT,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Bảng predictions: Kết quả dự đoán từ mô hình AI (ONNX Distilled Student / Ensemble)
CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL UNIQUE REFERENCES mri_scans(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  confidence REAL NOT NULL,
  probabilities TEXT NOT NULL, -- Chuỗi JSON xác suất từng lớp
  model_version TEXT NOT NULL,
  inference_ms INTEGER DEFAULT 42,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Bảng doctor_reviews: Bác sĩ xác nhận hoặc hiệu chỉnh nhãn và ghi chú chuyên môn
CREATE TABLE IF NOT EXISTS doctor_reviews (
  id TEXT PRIMARY KEY,
  prediction_id TEXT NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES doctors(user_id) ON DELETE CASCADE,
  confirmed_label TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. Bảng chat_sessions: Phiên hội thoại với Chatbot RAG Y tế
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Tư vấn thông tin u não & MRI',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. Bảng chat_messages: Tin nhắn trong phiên hội thoại (sender: user | bot)
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'bot')),
  content TEXT NOT NULL,
  sources_json TEXT, -- Nguồn trích dẫn FAQ từ Vectorize RAG
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. Bảng faq_documents: Bộ dữ liệu hỏi đáp y tế phục vụ truy xuất RAG (Vectorize)
CREATE TABLE IF NOT EXISTS faq_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  category TEXT DEFAULT 'Kiến thức u não & Phân loại',
  keywords TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Các chỉ mục tối ưu hóa truy vấn trên Cloudflare D1
CREATE INDEX IF NOT EXISTS idx_mri_scans_patient ON mri_scans(patient_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_scan ON predictions(scan_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_prediction ON doctor_reviews(prediction_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_faq_category ON faq_documents(category);

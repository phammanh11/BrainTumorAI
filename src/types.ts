export type UserRole = 'patient' | 'doctor' | 'admin';

export type TumorLabel = 'Glioma' | 'Meningioma' | 'No Tumor' | 'Pituitary' | 'Không phải ảnh MRI (OOD)';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  created_at: string;
  // Thông tin mở rộng từ bảng patients hoặc doctors
  date_of_birth?: string;
  phone?: string;
  medical_code?: string;
  specialty?: string;
  license_no?: string;
  hospital?: string;
}

export interface ClassProbabilities {
  Glioma: number;
  Meningioma: number;
  'No Tumor': number;
  Pituitary: number;
  OOD?: number;
}

export interface DiagnosisRecord {
  prediction_id: string;
  scan_id: string;
  patient_id: string;
  patient_name: string;
  patient_code: string;
  r2_key: string;
  file_name: string;
  file_size: number;
  image_url: string;
  modality: string;
  clinical_note: string;
  uploaded_at: string;
  label: TumorLabel;
  confidence: number;
  probabilities: ClassProbabilities;
  model_version: string;
  inference_ms: number;
  created_at: string;
  // Thông tin xác nhận của bác sĩ (bảng doctor_reviews)
  review_id?: string;
  doctor_id?: string;
  doctor_name?: string;
  confirmed_label?: TumorLabel;
  doctor_note?: string;
  reviewed_at?: string;
}

export interface FaqDocument {
  id: string;
  title: string;
  content: string;
  source: string;
  category: string;
  keywords: string;
  updated_at: string;
}

export interface ChatSource {
  id: string;
  title: string;
  source: string;
  category?: string;
  score?: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender: 'user' | 'bot';
  content: string;
  sources?: ChatSource[];
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export type ActiveTab =
  | 'overview'
  | 'diagnose'
  | 'history'
  | 'doctor_review'
  | 'chatbot'
  | 'faq_admin'
  | 'cloud_arch';

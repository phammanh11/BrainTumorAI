import React from 'react';
import {
  Cloud,
  Cpu,
  Database,
  HardDrive,
  KeyRound,
  Layers,
  Lock,
  Network,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { DiagnosisRecord, FaqDocument } from '../types';

interface CloudArchitecturePanelProps {
  diagnoses: DiagnosisRecord[];
  faqs: FaqDocument[];
  chatMessagesCount: number;
}

export const CloudArchitecturePanel: React.FC<CloudArchitecturePanelProps> = ({
  diagnoses,
  faqs,
  chatMessagesCount,
}) => {
  const cloudServices = [
    {
      layer: 'Giao diện Web (Frontend)',
      service: 'Cloudflare Pages (*.pages.dev)',
      desc: 'Phục vụ ứng dụng React + TypeScript + Tailwind CSS tĩnh cho Bệnh nhân, Bác sĩ và Quản trị viên; tự động CI/CD từ GitHub.',
      icon: Layers,
      status: 'Active • Free Tier',
    },
    {
      layer: 'Xử lý Nghiệp vụ & Bảo mật',
      service: 'Cloudflare Workers + Rate Limiting',
      desc: 'Cung cấp 10 REST API xác thực, tải ảnh MRI, lưu dự đoán, bác sĩ xác nhận và điều phối RAG; tích hợp giới hạn tần suất chống lạm dụng.',
      icon: Server,
      status: 'Active • Serverless',
    },
    {
      layer: 'Suy luận Học sâu (AI Inference)',
      service: 'ONNX Runtime Web + Cloudflare R2',
      desc: 'Chạy tệp mô hình brain_mri_student.onnx (16 MB, chưng cất từ Ensemble 5-fold ConvNeXt + SwinV2 + EfficientNetV2) không vướng giới hạn 10ms CPU Worker Free.',
      icon: Cpu,
      status: 'Ready • 16.0 MB ONNX',
    },
    {
      layer: 'Cơ sở dữ liệu Quan hệ',
      service: 'Cloudflare D1 (SQLite Edge)',
      desc: 'Lưu trữ 9 bảng dữ liệu chuẩn hóa: users, patients, doctors, mri_scans, predictions, doctor_reviews, chat_sessions, chat_messages, faq_documents.',
      icon: Database,
      status: '9 Tables Synced',
    },
    {
      layer: 'Lưu trữ Đối tượng (Object Storage)',
      service: 'Cloudflare R2 (Private Bucket)',
      desc: 'Lưu trữ riêng tư ảnh chụp MRI (scans/*) và tệp trọng số mô hình ONNX; chỉ truy cập qua Worker sau khi kiểm tra phân quyền.',
      icon: HardDrive,
      status: 'Private Access Only',
    },
    {
      layer: 'Phiên đăng nhập & Bộ nhớ đệm',
      service: 'Cloudflare Workers KV',
      desc: 'Lưu trữ phiên đăng nhập dạng khóa-giá trị (sess:<token>) tốc độ cao tại biên, có thời hạn (TTL 24h) và thu hồi tức thì khi đăng xuất.',
      icon: KeyRound,
      status: 'TTL 86400s',
    },
    {
      layer: 'Chatbot Y tế RAG',
      service: 'Workers AI + Vectorize + AI Gateway',
      desc: 'Nhúng câu hỏi bằng @cf/baai/bge-m3, tìm đoạn FAQ trong Vectorize và sinh câu trả lời tiếng Việt qua AI Gateway.',
      icon: Network,
      status: 'Grounded RAG',
    },
  ];

  const d1Tables = [
    { name: 'users', pk: 'id (PK)', fields: 'email, password_hash, role, full_name, created_at', rows: 6 },
    { name: 'patients', pk: 'user_id (PK, FK)', fields: 'date_of_birth, phone, medical_code', rows: 3 },
    { name: 'doctors', pk: 'user_id (PK, FK)', fields: 'specialty, license_no, hospital', rows: 2 },
    { name: 'mri_scans', pk: 'id (PK)', fields: 'patient_id (FK), r2_key, uploaded_at', rows: diagnoses.length },
    {
      name: 'predictions',
      pk: 'id (PK)',
      fields: 'scan_id (FK), label, confidence, probabilities (JSON), model_version, created_at',
      rows: diagnoses.length,
    },
    {
      name: 'doctor_reviews',
      pk: 'id (PK)',
      fields: 'prediction_id (FK), doctor_id (FK), confirmed_label, note, created_at',
      rows: diagnoses.filter((d) => Boolean(d.confirmed_label)).length,
    },
    { name: 'chat_sessions', pk: 'id (PK)', fields: 'user_id (FK), created_at', rows: 2 },
    {
      name: 'chat_messages',
      pk: 'id (PK)',
      fields: 'session_id (FK), sender, content, created_at',
      rows: chatMessagesCount,
    },
    {
      name: 'faq_documents',
      pk: 'id (PK)',
      fields: 'title, content, source (Indexed in Vectorize)',
      rows: faqs.length,
    },
  ];

  const apiEndpoints = [
    { method: 'POST', path: '/api/auth/register', desc: 'Đăng ký tài khoản mới (Băm mật khẩu SHA-256)', auth: 'Công khai' },
    { method: 'POST', path: '/api/auth/login', desc: 'Đăng nhập & cấp phát phiên vào Cloudflare KV', auth: 'Công khai' },
    { method: 'POST', path: '/api/auth/logout', desc: 'Đăng xuất & thu hồi phiên trong KV', auth: 'Đã đăng nhập' },
    { method: 'POST', path: '/api/scans', desc: 'Tải ảnh MRI (JPG/PNG) lên R2 & ghi mri_scans', auth: 'Bệnh nhân' },
    { method: 'POST', path: '/api/predict', desc: 'Lưu kết quả suy luận mô hình ONNX vào D1', auth: 'Bệnh nhân' },
    { method: 'GET', path: '/api/predictions', desc: 'Danh sách lịch sử chẩn đoán MRI', auth: 'Chủ sở hữu, Bác sĩ' },
    { method: 'GET', path: '/api/predictions/:id', desc: 'Chi tiết một kết quả dự đoán & đánh giá', auth: 'Chủ sở hữu, Bác sĩ' },
    { method: 'POST', path: '/api/reviews', desc: 'Bác sĩ xác nhận hoặc hiệu chỉnh nhãn, ghi chú', auth: 'Bác sĩ' },
    { method: 'POST', path: '/api/chat', desc: 'Truy vấn Vectorize RAG & sinh câu trả lời Workers AI', auth: 'Đã đăng nhập' },
    { method: 'GET', path: '/api/chat/history', desc: 'Lịch sử hội thoại Chatbot RAG từ D1', auth: 'Đã đăng nhập' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
          Mục 1.8.5 – 1.8.11 • Kiến trúc Serverless Đám mây Cloudflare
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Kiến trúc Hệ thống Cloud, Cơ sở dữ liệu D1 &amp; Thiết kế API
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Ánh xạ đầy đủ toàn bộ các tầng dịch vụ Cloudflare trong gói miễn phí (Free Tier) theo đặc tả kỹ thuật.
        </p>
      </div>

      {/* Các tầng dịch vụ Cloudflare */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cloudServices.map((srv) => {
          const Icon = srv.icon;
          return (
            <div
              key={srv.service}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-card space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  {srv.status}
                </span>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {srv.layer}
                </p>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {srv.service}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {srv.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bảng 9 Bảng Cơ sở dữ liệu D1 & 10 REST API */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 9 Bảng D1 (6 cột) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Thiết kế Cơ sở dữ liệu D1 (9 Bảng - Mục 1.8.6)
              </h2>
              <p className="text-xs text-slate-500">
                File migration: <code className="font-mono">migrations/0001_schema.sql</code>
              </p>
            </div>
            <Database className="w-5 h-5 text-blue-600" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] uppercase text-slate-400">
                  <th className="py-2 pr-3">Bảng D1</th>
                  <th className="py-2 px-3">Các trường chính</th>
                  <th className="py-2 pl-3 text-right">Bản ghi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {d1Tables.map((tb) => (
                  <tr key={tb.name}>
                    <td className="py-2.5 pr-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {tb.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      <strong className="text-slate-800 dark:text-slate-100">{tb.pk}</strong>, {tb.fields}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-bold text-slate-900 dark:text-white">
                      {tb.rows}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 10 API Endpoints (6 cột) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Thiết kế Workers API (10 Endpoint - Mục 1.8.7)
              </h2>
              <p className="text-xs text-slate-500">
                Triển khai tại: <code className="font-mono">functions/api/[[route]].ts</code>
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] uppercase text-slate-400">
                  <th className="py-2 pr-2">Method</th>
                  <th className="py-2 px-2">Đường dẫn</th>
                  <th className="py-2 px-2">Chức năng</th>
                  <th className="py-2 pl-2 text-right">Quyền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {apiEndpoints.map((ep) => (
                  <tr key={`${ep.method}-${ep.path}`}>
                    <td className="py-2.5 pr-2">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          ep.method === 'POST'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {ep.method}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {ep.path}
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">{ep.desc}</td>
                    <td className="py-2.5 pl-2 text-right font-medium text-slate-500">
                      {ep.auth}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

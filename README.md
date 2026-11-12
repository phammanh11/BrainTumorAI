# BrainTumorAI — Hệ thống Hỗ trợ Phát hiện U não từ Ảnh MRI & Chatbot Y tế RAG trên Cloudflare

Mini-project môn **Điện toán đám mây**: Hệ thống phân loại ảnh MRI não 4 lớp (`Glioma`, `Meningioma`, `No Tumor`, `Pituitary` + lớp thứ 5 phát hiện ảnh ngoài miền `OOD`) bằng mô hình học sâu **`brain_mri_student.onnx`** (chưng cất từ tổ hợp Ensemble 5-fold `ConvNeXt` + `SwinV2` + `EfficientNetV2`), tích hợp **Chatbot hỏi đáp y tế RAG** và triển khai toàn bộ trên nền tảng Serverless **Cloudflare**.

---

## 1. Kiến trúc Dịch vụ Cloudflare (Mục 1.8.5 & 1.8.11)

| Tầng hệ thống | Dịch vụ Cloudflare | Mã nguồn / Cấu hình trong dự án |
|---|---|---|
| **Giao diện Web (2 vai trò + Quản trị)** | **Cloudflare Pages** (`*.pages.dev`) | `src/App.tsx`, `src/components/*` |
| **Xử lý nghiệp vụ & Bảo mật** | **Cloudflare Workers / Pages Functions** | `functions/api/[[route]].ts` |
| **Suy luận AI (ONNX 16 MB)** | **ONNX Runtime Web + Cloudflare R2** | `public/models/brain_mri_student.onnx`, `src/services/onnxClassifier.ts` |
| **Cơ sở dữ liệu quan hệ (9 bảng)** | **Cloudflare D1** (`DB`) | `migrations/0001_schema.sql`, `migrations/0002_seed.sql` |
| **Lưu trữ ảnh MRI & Mô hình** | **Cloudflare R2** (`MRI_BUCKET`) | `wrangler.toml`, `POST /api/scans` |
| **Phiên đăng nhập (TTL & Thu hồi)** | **Cloudflare KV** (`SESSION_KV`) | `POST /api/auth/login`, `POST /api/auth/logout` |
| **Chatbot Y tế RAG** | **Workers AI + Vectorize + AI Gateway** | `POST /api/chat`, `faq_documents` |

---

## 2. Hướng dẫn Chạy Thử Nghiệm Cục Bộ (Local Development)

```bash
# 1. Cài đặt thư viện
npm install

# 2. Chạy giao diện phát triển nhanh với Vite (hỗ trợ chạy trực tiếp ONNX Runtime Web trên trình duyệt)
npm run dev

# 3. Khởi tạo cơ sở dữ liệu Cloudflare D1 cục bộ (9 bảng + dữ liệu mẫu)
npm run db:init:local

# 4. Build và chạy mô phỏng đầy đủ Cloudflare Pages + Workers + D1 + R2 + KV
npm run build
npm run pages:dev
```

---

## 3. Hướng dẫn Triển khai lên Cloudflare Miễn phí (`*.pages.dev`)

```bash
# Đăng nhập tài khoản Cloudflare
npx wrangler login

# Tạo D1 Database, R2 Bucket, KV Namespace và Vectorize Index
npx wrangler d1 create brain-tumor-db
npx wrangler r2 bucket create brain-mri-private-bucket
npx wrangler kv namespace create SESSION_KV
npx wrangler vectorize create brain-tumor-faq-index --dimensions=1024 --metric=cosine

# Cập nhật database_id và kv id vào file wrangler.toml, sau đó nạp bảng D1
npm run db:init:remote

# Build và triển khai lên địa chỉ *.pages.dev
npm run pages:deploy
```

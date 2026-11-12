// ============================================================================
// BrainTumorAI - Cloudflare Workers / Pages Functions API
// Triển khai đầy đủ các API theo mục 1.8.7, 1.8.8 và Bảo mật mục 1.8.9
// Kết nối: Cloudflare D1 (DB), R2 (MRI_BUCKET), KV (SESSION_KV),
//          Vectorize (FAQ_VECTORIZE), Workers AI + AI Gateway (AI)
// ============================================================================

export interface Env {
  DB?: D1Database;
  MRI_BUCKET?: R2Bucket;
  SESSION_KV?: KVNamespace;
  FAQ_VECTORIZE?: VectorizeIndex;
  AI?: {
    run: (model: string, input: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>;
  };
  AI_GATEWAY_ID?: string;
  MODEL_VERSION?: string;
  MAX_UPLOAD_MB?: string;
}

interface SessionUser {
  id: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  full_name: string;
  exp: number;
}

// Bộ nhớ đệm Rate Limiting nhẹ tại biên Worker (1.8.9)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, bucket: 'predict' | 'chat' | 'general'): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const maxReqs = bucket === 'predict' ? 20 : bucket === 'chat' ? 30 : 120;
  const key = `${bucket}:${ip}`;
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxReqs) return false;
  entry.count += 1;
  return true;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

async function getSessionUser(request: Request, env: Env): Promise<SessionUser | null> {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  if (env.SESSION_KV) {
    const raw = await env.SESSION_KV.get(`sess:${token}`);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as SessionUser;
      if (parsed.exp && Date.now() > parsed.exp) {
        await env.SESSION_KV.delete(`sess:${token}`);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
  const rateBucket = path.includes('/predict') ? 'predict' : path.includes('/chat') ? 'chat' : 'general';
  if (!checkRateLimit(clientIp, rateBucket)) {
    return jsonResponse(
      { error: 'Quá giới hạn tần suất gọi API (Workers Rate Limiting). Vui lòng thử lại sau 1 phút.' },
      429
    );
  }

  try {
    // ------------------------------------------------------------------------
    // 1. POST /api/auth/register (Công khai - FR01)
    // ------------------------------------------------------------------------
    if (method === 'POST' && path === '/api/auth/register') {
      const body = (await request.json()) as {
        email?: string;
        password?: string;
        full_name?: string;
        role?: 'patient' | 'doctor';
        phone?: string;
        date_of_birth?: string;
        specialty?: string;
        license_no?: string;
      };

      if (!body.email || !body.password || !body.full_name) {
        return jsonResponse({ error: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu.' }, 400);
      }

      const role = body.role === 'doctor' ? 'doctor' : 'patient';
      const userId = `usr-${role.slice(0, 3)}-${crypto.randomUUID().slice(0, 8)}`;
      const passwordHash = await sha256Hex(body.password);

      if (env.DB) {
        const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first();
        if (existing) {
          return jsonResponse({ error: 'Email này đã được đăng ký trên hệ thống.' }, 409);
        }

        await env.DB.prepare(
          'INSERT INTO users (id, email, password_hash, role, full_name, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
          .bind(userId, body.email, passwordHash, role, body.full_name, new Date().toISOString())
          .run();

        if (role === 'patient') {
          await env.DB.prepare(
            'INSERT INTO patients (user_id, date_of_birth, phone, medical_code, gender) VALUES (?, ?, ?, ?, ?)'
          )
            .bind(
              userId,
              body.date_of_birth || '1995-01-01',
              body.phone || '0900 000 000',
              `BN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
              'Chưa cập nhật'
            )
            .run();
        } else {
          await env.DB.prepare(
            'INSERT INTO doctors (user_id, specialty, license_no, hospital) VALUES (?, ?, ?, ?)'
          )
            .bind(
              userId,
              body.specialty || 'Chẩn đoán hình ảnh Thần kinh',
              body.license_no || 'CCHN-BYT-2026',
              'Bệnh viện Đa khoa Trung ương'
            )
            .run();
        }
      }

      const token = crypto.randomUUID();
      const sessionUser: SessionUser = {
        id: userId,
        email: body.email,
        role,
        full_name: body.full_name,
        exp: Date.now() + 86400_000,
      };

      if (env.SESSION_KV) {
        await env.SESSION_KV.put(`sess:${token}`, JSON.stringify(sessionUser), { expirationTtl: 86400 });
      }

      return jsonResponse({ token, user: sessionUser }, 201);
    }

    // ------------------------------------------------------------------------
    // 2. POST /api/auth/login (Công khai - FR01)
    // ------------------------------------------------------------------------
    if (method === 'POST' && path === '/api/auth/login') {
      const body = (await request.json()) as { email?: string; password?: string };
      if (!body.email || !body.password) {
        return jsonResponse({ error: 'Vui lòng nhập email và mật khẩu.' }, 400);
      }

      const passwordHash = await sha256Hex(body.password);
      if (env.DB) {
        const userRow = await env.DB.prepare(
          'SELECT id, email, password_hash, role, full_name FROM users WHERE email = ?'
        )
          .bind(body.email)
          .first<{ id: string; email: string; password_hash: string; role: 'patient' | 'doctor' | 'admin'; full_name: string }>();

        if (!userRow || userRow.password_hash !== passwordHash) {
          return jsonResponse({ error: 'Email hoặc mật khẩu không chính xác.' }, 401);
        }

        const token = crypto.randomUUID();
        const sessionUser: SessionUser = {
          id: userRow.id,
          email: userRow.email,
          role: userRow.role,
          full_name: userRow.full_name,
          exp: Date.now() + 86400_000,
        };

        if (env.SESSION_KV) {
          await env.SESSION_KV.put(`sess:${token}`, JSON.stringify(sessionUser), { expirationTtl: 86400 });
        }

        return jsonResponse({ token, user: sessionUser });
      }

      return jsonResponse({ error: 'Chưa kết nối cơ sở dữ liệu D1.' }, 503);
    }

    // ------------------------------------------------------------------------
    // 3. POST /api/auth/logout (Đã đăng nhập - FR01)
    // ------------------------------------------------------------------------
    if (method === 'POST' && path === '/api/auth/logout') {
      const auth = request.headers.get('Authorization') || '';
      const token = auth.replace(/^Bearer\s+/i, '').trim();
      if (token && env.SESSION_KV) {
        await env.SESSION_KV.delete(`sess:${token}`);
      }
      return jsonResponse({ success: true, message: 'Đã đăng xuất và thu hồi phiên trong Cloudflare KV.' });
    }

    // ------------------------------------------------------------------------
    // 4. POST /api/scans - Tải ảnh MRI lên R2 & ghi mri_scans vào D1 (FR02)
    // ------------------------------------------------------------------------
    if (method === 'POST' && path === '/api/scans') {
      const user = await getSessionUser(request, env);
      const contentType = request.headers.get('Content-Type') || '';
      const scanId = `scan-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`;

      let fileName = 'mri_scan.png';
      let fileSize = 0;
      let modality = 'MRI Axial T1/T2';
      let clinicalNote = '';
      let patientId = user?.id || 'usr-pat-01';
      let fileBuffer: ArrayBuffer | null = null;
      let mimeType = 'image/png';

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        modality = (formData.get('modality') as string) || modality;
        clinicalNote = (formData.get('clinical_note') as string) || '';
        patientId = (formData.get('patient_id') as string) || patientId;

        if (!file) {
          return jsonResponse({ error: 'Không tìm thấy tệp ảnh MRI tải lên.' }, 400);
        }
        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
          return jsonResponse({ error: 'Định dạng không hợp lệ. Chỉ chấp nhận ảnh MRI định dạng JPG hoặc PNG.' }, 400);
        }
        if (file.size > 10 * 1024 * 1024) {
          return jsonResponse({ error: 'Dung lượng ảnh vượt quá giới hạn 10 MB.' }, 400);
        }
        fileName = file.name;
        fileSize = file.size;
        mimeType = file.type;
        fileBuffer = await file.arrayBuffer();
      } else {
        const body = (await request.json()) as {
          file_name?: string;
          file_size?: number;
          modality?: string;
          clinical_note?: string;
          patient_id?: string;
        };
        fileName = body.file_name || fileName;
        fileSize = body.file_size || 48000;
        modality = body.modality || modality;
        clinicalNote = body.clinical_note || '';
        patientId = body.patient_id || patientId;
      }

      const r2Key = `scans/${new Date().toISOString().slice(0, 7)}/${scanId}_${fileName}`;

      if (env.MRI_BUCKET && fileBuffer) {
        await env.MRI_BUCKET.put(r2Key, fileBuffer, {
          httpMetadata: { contentType: mimeType },
          customMetadata: { patientId, scanId },
        });
      }

      if (env.DB) {
        await env.DB.prepare(
          'INSERT INTO mri_scans (id, patient_id, r2_key, file_name, file_size, modality, clinical_note, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(scanId, patientId, r2Key, fileName, fileSize, modality, clinicalNote, new Date().toISOString())
          .run();
      }

      return jsonResponse({
        scan_id: scanId,
        r2_key: r2Key,
        file_name: fileName,
        file_size: fileSize,
        uploaded_at: new Date().toISOString(),
      }, 201);
    }

    // ------------------------------------------------------------------------
    // 5. POST /api/predict - Ghi kết quả dự đoán mô hình ONNX vào D1 (FR03)
    // ------------------------------------------------------------------------
    if (method === 'POST' && path === '/api/predict') {
      const body = (await request.json()) as {
        scan_id: string;
        label: string;
        confidence: number;
        probabilities: Record<string, number>;
        model_version?: string;
        inference_ms?: number;
      };

      if (!body.scan_id || !body.label) {
        return jsonResponse({ error: 'Thiếu thông tin scan_id hoặc nhãn dự đoán.' }, 400);
      }

      const predId = `pred-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`;
      const modelVer = body.model_version || env.MODEL_VERSION || 'brain_mri_student.onnx (5-Fold Ensemble Distilled)';
      const createdAt = new Date().toISOString();

      if (env.DB) {
        await env.DB.prepare(
          'INSERT INTO predictions (id, scan_id, label, confidence, probabilities, model_version, inference_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(
            predId,
            body.scan_id,
            body.label,
            body.confidence,
            JSON.stringify(body.probabilities || {}),
            modelVer,
            body.inference_ms || 38,
            createdAt
          )
          .run();
      }

      return jsonResponse({
        prediction_id: predId,
        scan_id: body.scan_id,
        label: body.label,
        confidence: body.confidence,
        probabilities: body.probabilities,
        model_version: modelVer,
        created_at: createdAt,
      }, 201);
    }

    // ------------------------------------------------------------------------
    // 6. GET /api/predictions & GET /api/predictions/:id (FR04)
    // ------------------------------------------------------------------------
    if (method === 'GET' && path.startsWith('/api/predictions')) {
      const user = await getSessionUser(request, env);
      const parts = path.split('/').filter(Boolean); // ['api', 'predictions', ':id']
      const targetId = parts.length === 3 ? parts[2] : null;

      if (env.DB) {
        let query = `
          SELECT
            p.id AS prediction_id,
            p.scan_id,
            p.label,
            p.confidence,
            p.probabilities,
            p.model_version,
            p.inference_ms,
            p.created_at,
            s.patient_id,
            s.r2_key,
            s.file_name,
            s.modality,
            s.clinical_note,
            u.full_name AS patient_name,
            r.id AS review_id,
            r.confirmed_label,
            r.note AS doctor_note,
            r.created_at AS reviewed_at,
            du.full_name AS doctor_name
          FROM predictions p
          JOIN mri_scans s ON s.id = p.scan_id
          LEFT JOIN users u ON u.id = s.patient_id
          LEFT JOIN doctor_reviews r ON r.prediction_id = p.id
          LEFT JOIN users du ON du.id = r.doctor_id
        `;

        if (targetId) {
          query += ' WHERE p.id = ? ORDER BY r.created_at DESC LIMIT 1';
          const row = await env.DB.prepare(query).bind(targetId).first();
          return jsonResponse({ prediction: row });
        }

        if (user && user.role === 'patient') {
          query += ' WHERE s.patient_id = ? ORDER BY p.created_at DESC';
          const { results } = await env.DB.prepare(query).bind(user.id).all();
          return jsonResponse({ predictions: results });
        }

        query += ' ORDER BY p.created_at DESC';
        const { results } = await env.DB.prepare(query).all();
        return jsonResponse({ predictions: results });
      }

      return jsonResponse({ predictions: [] });
    }

    // ------------------------------------------------------------------------
    // 7. POST /api/reviews - Bác sĩ xác nhận hoặc hiệu chỉnh kết quả (UC02 - FR05)
    // ------------------------------------------------------------------------
    if (method === 'POST' && path === '/api/reviews') {
      const user = await getSessionUser(request, env);
      if (user && user.role !== 'doctor' && user.role !== 'admin') {
        return jsonResponse({ error: 'Chỉ tài khoản Bác sĩ mới có quyền xác nhận kết quả lâm sàng.' }, 403);
      }

      const body = (await request.json()) as {
        prediction_id: string;
        doctor_id?: string;
        confirmed_label: string;
        note: string;
      };

      if (!body.prediction_id || !body.confirmed_label) {
        return jsonResponse({ error: 'Thiếu mã dự đoán hoặc nhãn xác nhận của bác sĩ.' }, 400);
      }

      const reviewId = `rev-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`;
      const doctorId = user?.id || body.doctor_id || 'usr-doc-01';
      const createdAt = new Date().toISOString();

      if (env.DB) {
        await env.DB.prepare(
          'INSERT INTO doctor_reviews (id, prediction_id, doctor_id, confirmed_label, note, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
          .bind(reviewId, body.prediction_id, doctorId, body.confirmed_label, body.note || '', createdAt)
          .run();
      }

      return jsonResponse({
        review_id: reviewId,
        prediction_id: body.prediction_id,
        doctor_id: doctorId,
        confirmed_label: body.confirmed_label,
        note: body.note,
        created_at: createdAt,
      }, 201);
    }

    // ------------------------------------------------------------------------
    // 8. POST /api/chat - Chatbot RAG Y tế (Vectorize + Workers AI + D1) (UC03 - FR06)
    // ------------------------------------------------------------------------
    if (method === 'POST' && path === '/api/chat') {
      const user = await getSessionUser(request, env);
      const body = (await request.json()) as {
        question: string;
        session_id?: string;
        user_id?: string;
        active_diagnosis?: string;
      };

      const question = (body.question || '').trim();
      if (!question) {
        return jsonResponse({ error: 'Vui lòng nhập câu hỏi y tế.' }, 400);
      }

      let matchedFaqs: Array<{ id: string; title: string; content: string; source: string; category: string }> = [];

      // Bước 1: Tìm vector trong Cloudflare Vectorize nếu đã cấu hình
      if (env.AI && env.FAQ_VECTORIZE && env.DB) {
        try {
          const embResp = (await env.AI.run('@cf/baai/bge-m3', { text: [question] })) as {
            data?: number[][];
          };
          const vector = embResp?.data?.[0];
          if (vector) {
            const vecMatches = await env.FAQ_VECTORIZE.query(vector, { topK: 3, returnMetadata: true });
            const ids = vecMatches.matches.map((m) => m.id);
            if (ids.length > 0) {
              const placeholders = ids.map(() => '?').join(',');
              const { results } = await env.DB.prepare(
                `SELECT id, title, content, source, category FROM faq_documents WHERE id IN (${placeholders})`
              )
                .bind(...ids)
                .all<{ id: string; title: string; content: string; source: string; category: string }>();
              matchedFaqs = results || [];
            }
          }
        } catch {
          // Chuyển sang truy xuất từ khóa trên D1 nếu Vectorize chưa khởi tạo
        }
      }

      // Bước 2: Truy xuất kết hợp trên bảng faq_documents trong D1
      if (matchedFaqs.length === 0 && env.DB) {
        const { results } = await env.DB.prepare(
          'SELECT id, title, content, source, category, keywords FROM faq_documents'
        ).all<{ id: string; title: string; content: string; source: string; category: string; keywords: string }>();

        const qLower = question.toLowerCase();
        const scored = (results || []).map((doc) => {
          let score = 0;
          const text = `${doc.title} ${doc.content} ${doc.keywords || ''}`.toLowerCase();
          for (const word of qLower.split(/\s+/)) {
            if (word.length >= 3 && text.includes(word)) score += 2;
          }
          return { doc, score };
        });
        scored.sort((a, b) => b.score - a.score);
        matchedFaqs = scored.filter((s) => s.score > 0).slice(0, 3).map((s) => s.doc);
      }

      // Bước 3: Sinh câu trả lời bằng Workers AI (qua AI Gateway) chỉ dựa trên đoạn FAQ
      let answer = '';
      if (matchedFaqs.length === 0) {
        answer =
          'Hệ thống hiện không tìm thấy thông tin phù hợp trong bộ dữ liệu hỏi đáp y tế đã kiểm chứng cho câu hỏi này. Để đảm bảo an toàn y khoa, bạn vui lòng trao đổi trực tiếp với Bác sĩ chuyên khoa Thần kinh hoặc Chẩn đoán hình ảnh để được tư vấn chính xác.';
      } else if (env.AI) {
        const contextText = matchedFaqs
          .map((d, idx) => `[Tài liệu ${idx + 1}: ${d.title} - Nguồn: ${d.source}]\n${d.content}`)
          .join('\n\n');

        const systemPrompt = `Bạn là Trợ lý AI Y tế của hệ thống BrainTumorAI triển khai trên Cloudflare.
Quy tắc bắt buộc:
1. Chỉ trả lời dựa trên các đoạn FAQ y khoa được cung cấp dưới đây. Tuyệt đối không tự bịa thông tin hoặc kê đơn thuốc.
2. Trả lời bằng tiếng Việt rõ ràng, đồng cảm, dễ hiểu cho bệnh nhân và bác sĩ.
3. Luôn nhắc rõ kết quả AI chỉ mang tính hỗ trợ tham khảo, không thay thế chẩn đoán lâm sàng của bác sĩ.

DỮ LIỆU FAQ TRUY XUẤT TỪ VECTORIZE / D1:
${contextText}`;

        try {
          const llmRes = (await env.AI.run(
            '@cf/meta/llama-3.1-8b-instruct',
            {
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: question },
              ],
              max_tokens: 600,
              temperature: 0.2,
            },
            env.AI_GATEWAY_ID ? { gateway: { id: env.AI_GATEWAY_ID } } : undefined
          )) as { response?: string };

          answer = llmRes?.response || '';
        } catch {
          answer = '';
        }
      }

      if (!answer && matchedFaqs.length > 0) {
        answer = matchedFaqs
          .map((f) => `**${f.title}**\n${f.content}\n*(Nguồn: ${f.source})*`)
          .join('\n\n---\n\n');
      }

      // Bước 4: Lưu hội thoại vào chat_sessions và chat_messages trong D1 (FR07)
      const sessionId = body.session_id || `sess-${Date.now()}`;
      const userId = user?.id || body.user_id || 'usr-pat-01';

      if (env.DB) {
        await env.DB.prepare(
          'INSERT OR IGNORE INTO chat_sessions (id, user_id, title, created_at) VALUES (?, ?, ?, ?)'
        )
          .bind(sessionId, userId, question.slice(0, 60), new Date().toISOString())
          .run();

        await env.DB.prepare(
          'INSERT INTO chat_messages (id, session_id, sender, content, sources_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
          .bind(`msg-u-${Date.now()}`, sessionId, 'user', question, null, new Date().toISOString())
          .run();

        await env.DB.prepare(
          'INSERT INTO chat_messages (id, session_id, sender, content, sources_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
          .bind(
            `msg-b-${Date.now() + 1}`,
            sessionId,
            'bot',
            answer,
            JSON.stringify(matchedFaqs.map((f) => ({ id: f.id, title: f.title, source: f.source }))),
            new Date().toISOString()
          )
          .run();
      }

      return jsonResponse({
        session_id: sessionId,
        answer,
        sources: matchedFaqs.map((f) => ({
          id: f.id,
          title: f.title,
          source: f.source,
          category: f.category,
        })),
      });
    }

    // ------------------------------------------------------------------------
    // 9. GET /api/chat/history - Lịch sử hội thoại chatbot (FR07)
    // ------------------------------------------------------------------------
    if (method === 'GET' && path === '/api/chat/history') {
      const user = await getSessionUser(request, env);
      if (env.DB) {
        const userId = user?.id || url.searchParams.get('user_id') || 'usr-pat-01';
        const { results: sessions } = await env.DB.prepare(
          'SELECT id, user_id, title, created_at FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC'
        )
          .bind(userId)
          .all();

        const { results: messages } = await env.DB.prepare(
          `SELECT m.id, m.session_id, m.sender, m.content, m.sources_json, m.created_at
           FROM chat_messages m
           JOIN chat_sessions s ON s.id = m.session_id
           WHERE s.user_id = ?
           ORDER BY m.created_at ASC`
        )
          .bind(userId)
          .all();

        return jsonResponse({ sessions, messages });
      }
      return jsonResponse({ sessions: [], messages: [] });
    }

    // ------------------------------------------------------------------------
    // 10. GET / POST / DELETE /api/faq - Quản lý bộ câu hỏi đáp y tế (FR08)
    // ------------------------------------------------------------------------
    if (path.startsWith('/api/faq')) {
      if (method === 'GET' && env.DB) {
        const { results } = await env.DB.prepare(
          'SELECT id, title, content, source, category, keywords, updated_at FROM faq_documents ORDER BY id ASC'
        ).all();
        return jsonResponse({ faqs: results });
      }

      if (method === 'POST' && env.DB) {
        const body = (await request.json()) as {
          id?: string;
          title: string;
          content: string;
          source: string;
          category?: string;
          keywords?: string;
        };
        const faqId = body.id || `faq-${Date.now().toString().slice(-4)}`;
        await env.DB.prepare(
          'INSERT OR REPLACE INTO faq_documents (id, title, content, source, category, keywords, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(
            faqId,
            body.title,
            body.content,
            body.source,
            body.category || 'Kiến thức u não & Phân loại',
            body.keywords || '',
            new Date().toISOString().slice(0, 10)
          )
          .run();

        return jsonResponse({ id: faqId, status: 'indexed' }, 201);
      }
    }

    // ------------------------------------------------------------------------
    // 11. GET /api/cloud/status - Kiểm tra trạng thái kiến trúc Cloudflare
    // ------------------------------------------------------------------------
    if (method === 'GET' && path === '/api/cloud/status') {
      return jsonResponse({
        platform: 'Cloudflare Serverless Stack',
        bindings: {
          pages: true,
          workers_api: true,
          d1_database: Boolean(env.DB),
          r2_bucket: Boolean(env.MRI_BUCKET),
          kv_session: Boolean(env.SESSION_KV),
          vectorize_index: Boolean(env.FAQ_VECTORIZE),
          workers_ai: Boolean(env.AI),
          ai_gateway: env.AI_GATEWAY_ID || 'brain-tumor-ai-gateway',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return jsonResponse({ error: `Không tìm thấy API endpoint: ${method} ${path}` }, 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi máy chủ nội bộ Worker';
    return jsonResponse({ error: message }, 500);
  }
};

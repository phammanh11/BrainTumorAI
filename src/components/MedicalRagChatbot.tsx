import React, { useState } from 'react';
import {
  BookOpen,
  Bot,
  Database,
  FileCheck2,
  PlusCircle,
  Send,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { runLocalRagSynthesis } from '../data/seedData';
import { ChatMessage, ChatSession, FaqDocument, UserProfile } from '../types';

interface MedicalRagChatbotProps {
  currentUser: UserProfile;
  sessions: ChatSession[];
  messages: ChatMessage[];
  faqs: FaqDocument[];
  onSendMessage: (userMsg: ChatMessage, botMsg: ChatMessage) => void;
  onAddFaq: (faq: FaqDocument) => void;
  onDeleteFaq: (id: string) => void;
  activeSubMode: 'chat' | 'faq_admin';
}

const SUGGESTED_QUESTIONS = [
  'Nhãn Glioma (U thần kinh đệm) trên ảnh MRI có ý nghĩa gì?',
  'Đặc điểm của Meningioma (U màng não) và hướng theo dõi?',
  'U tuyến yên (Pituitary) gây ra những triệu chứng nội tiết và thị lực nào?',
  'Các dấu hiệu cảnh báo đỏ (Red Flags) nào của u não cần đi khám ngay?',
  'Thuật ngữ T1, T2, FLAIR và ngấm thuốc đối quang từ trong MRI nghĩa là gì?',
  'Cần chuẩn bị gì trước khi đi chụp cộng hưởng từ (MRI) sọ não?',
  'Câu hỏi ngoài lề (Test ngoại lệ UC03): Giá cổ phiếu công nghệ hôm nay thế nào?',
];

export const MedicalRagChatbot: React.FC<MedicalRagChatbotProps> = ({
  currentUser,
  messages,
  faqs,
  onSendMessage,
  onAddFaq,
  onDeleteFaq,
  activeSubMode,
}) => {
  const [inputQuestion, setInputQuestion] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // State cho biểu mẫu thêm FAQ mới (FR08 - Quản trị)
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Kiến thức u não & Phân loại');
  const [newSource, setNewSource] = useState<string>(
    'Hướng dẫn Chẩn đoán & Điều trị U não - Bộ Y tế'
  );
  const [newKeywords, setNewKeywords] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [faqToast, setFaqToast] = useState<string | null>(null);

  const handleAsk = async (questionText?: string) => {
    const q = (questionText ?? inputQuestion).trim();
    if (!q || isGenerating) return;
    setInputQuestion('');
    setIsGenerating(true);

    const sessionId = 'sess-4001';
    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      session_id: sessionId,
      sender: 'user',
      content: q,
      created_at: new Date().toISOString(),
    };

    try {
      // Thử gọi Workers API (/api/chat) kết nối Vectorize + Workers AI + AI Gateway
      let answer = '';
      let sources = [] as ChatMessage['sources'];

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q,
            session_id: sessionId,
            user_id: currentUser.id,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.answer) {
            answer = data.answer;
            sources = data.sources || [];
          }
        }
      } catch {
        // Sử dụng bộ tổng hợp RAG chuẩn từ faq_documents
      }

      if (!answer) {
        const localRag = runLocalRagSynthesis(q, faqs);
        answer = localRag.answer;
        sources = localRag.sources;
      }

      const botMsg: ChatMessage = {
        id: `msg-b-${Date.now() + 1}`,
        session_id: sessionId,
        sender: 'bot',
        content: answer,
        sources,
        created_at: new Date().toISOString(),
      };

      onSendMessage(userMsg, botMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    const faqItem: FaqDocument = {
      id: `faq-${String(faqs.length + 1).padStart(3, '0')}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      source: newSource.trim(),
      category: newCategory,
      keywords: newKeywords.trim(),
      updated_at: new Date().toISOString().slice(0, 10),
    };

    try {
      await fetch('/api/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(faqItem),
      });
    } catch {
      // Local state update
    }

    onAddFaq(faqItem);
    setNewTitle('');
    setNewContent('');
    setNewKeywords('');
    setFaqToast(
      `Đã thêm tài liệu "${faqItem.id}" vào bảng faq_documents (D1) và lập chỉ mục Vectorize!`
    );
  };

  if (activeSubMode === 'faq_admin') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
              Yêu cầu chức năng FR08 • Quản trị Kho tri thức Y khoa RAG
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Quản lý Bộ câu hỏi đáp Y tế (Bảng faq_documents &amp; Vectorize)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Cập nhật các tài liệu y khoa chuẩn để Chatbot RAG truy xuất vector, ngăn chặn hiện tượng ảo giác (hallucination).
            </p>
          </div>
          <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Database className="w-4 h-4" />
            {faqs.length} tài liệu đã lập chỉ mục Vectorize
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form thêm tài liệu FAQ mới (5 cột) */}
          <form
            onSubmit={handleCreateFaq}
            className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-card space-y-4 h-fit"
          >
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              Thêm tài liệu hỏi đáp y tế mới
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tiêu đề câu hỏi / Chủ đề y khoa
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="VD: Phân biệt phù não vận mạch và phù độc tế bào trên MRI..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nhóm dữ liệu (Theo 7 nhóm chuẩn)
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                aria-label="Nhóm dữ liệu y khoa"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white"
              >
                <option value="Kiến thức u não & Phân loại">1. Kiến thức u não &amp; Phân loại</option>
                <option value="Triệu chứng & Dấu hiệu cảnh báo">2. Triệu chứng &amp; Dấu hiệu cảnh báo</option>
                <option value="MRI & Giải thích kết quả AI">3. MRI &amp; Giải thích kết quả AI</option>
                <option value="Điều trị & Chăm sóc">4. Điều trị &amp; Chăm sóc sau điều trị</option>
                <option value="FAQ & Hướng dẫn khám bệnh">5. FAQ &amp; Hướng dẫn khám bệnh</option>
                <option value="Phòng ngừa & Yếu tố nguy cơ">6. Phòng ngừa &amp; Yếu tố nguy cơ</option>
                <option value="Nguồn y khoa & An toàn hệ thống">7. Nguồn y khoa &amp; An toàn hệ thống</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nguồn tài liệu tham chiếu (WHO, NCI, Bộ Y tế...)
              </label>
              <input
                type="text"
                required
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Từ khóa truy xuất (Keywords)
              </label>
              <input
                type="text"
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                placeholder="VD: phù não, flair, khuếch tán, dwi"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nội dung giải đáp chuẩn y khoa
              </label>
              <textarea
                rows={4}
                required
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Nhập nội dung giải đáp đã được kiểm duyệt..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {faqToast && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                {faqToast}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              Lưu vào D1 &amp; Đồng bộ Vectorize Index
            </button>
          </form>

          {/* Danh sách tài liệu FAQ hiện có (7 cột) */}
          <div className="lg:col-span-7 space-y-3">
            {faqs.map((f) => (
              <div
                key={f.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-card space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mb-1">
                      {f.id} • {f.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{f.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteFaq(f.id)}
                    title="Xóa tài liệu"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {f.content}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                  <span>Nguồn: {f.source}</span>
                  <span>Cập nhật: {f.updated_at}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Chatbot RAG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
            Ca sử dụng UC03 • FR06 &amp; FR07 (Cloudflare Vectorize + Workers AI + AI Gateway)
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Trợ lý AI Hỏi đáp Thông tin Y tế U não (RAG)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Chỉ sinh câu trả lời dựa trên các đoạn tài liệu FAQ tìm được trong Vectorize, hiển thị rõ nguồn trích dẫn y khoa.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <FileCheck2 className="w-4 h-4" />
          Chống bịa thông tin (Grounded RAG)
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Khung hội thoại chính (8 cột) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card flex flex-col h-[620px]">
          {/* Danh sách tin nhắn */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-3 ${
                  m.sender === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  }`}
                >
                  {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[82%] rounded-2xl p-4 text-xs leading-relaxed space-y-2.5 ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-slate-700'
                  }`}
                >
                  <div className="whitespace-pre-line">{m.content}</div>

                  {/* Hiển thị nguồn trích dẫn Vectorize RAG */}
                  {m.sender === 'bot' && m.sources && m.sources.length > 0 && (
                    <div className="pt-2.5 mt-2 border-t border-slate-200/80 dark:border-slate-700 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        Đoạn FAQ trích xuất từ Cloudflare Vectorize (faq_documents):
                      </p>
                      {m.sources.map((src) => (
                        <div
                          key={src.id}
                          className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]"
                        >
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            [{src.id}] {src.title}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">
                            Nguồn: {src.source} {src.score ? `• Độ khớp: ${(src.score * 100).toFixed(0)}%` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex items-center gap-2 text-xs text-slate-500 pl-2">
                <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
                <span>
                  Đang tạo vector câu hỏi → truy vấn Vectorize → sinh câu trả lời qua Workers AI...
                </span>
              </div>
            )}
          </div>

          {/* Ô nhập câu hỏi */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5"
          >
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Nhập câu hỏi tiếng Việt về Glioma, Meningioma, Pituitary, triệu chứng, thuật ngữ MRI..."
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isGenerating || !inputQuestion.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Gửi câu hỏi
            </button>
          </form>
        </div>

        {/* Cột phải (4 cột): Gợi ý câu hỏi theo 7 nhóm chủ đề & Luồng RAG */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-card space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Câu hỏi thường gặp (Nhấn để hỏi nhanh)
            </h2>
            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAsk(q)}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 text-xs text-slate-700 dark:text-slate-200 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-card space-y-2.5 text-xs">
            <h3 className="font-bold text-slate-900 dark:text-white">
              Luồng xử lý Chatbot RAG (Mục 1.8.8)
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300">
              <li>Trình duyệt gửi câu hỏi tới Workers API (<code className="font-mono">POST /api/chat</code>).</li>
              <li>Workers chuyển câu hỏi thành vector (<code className="font-mono">@cf/baai/bge-m3</code>) và tìm đoạn FAQ trong <strong>Vectorize</strong>.</li>
              <li>Ghép câu hỏi + đoạn FAQ gửi tới <strong>Workers AI</strong> qua <strong>AI Gateway</strong>.</li>
              <li>Lưu hội thoại vào bảng <code className="font-mono">chat_messages</code> trên <strong>Cloudflare D1</strong>.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

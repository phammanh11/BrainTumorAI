import React, { useEffect, useState } from 'react';
import {
  Activity,
  Bell,
  BookOpenCheck,
  Brain,
  Cloud,
  FolderClock,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  PanelLeft,
  Search,
  Sparkles,
  Stethoscope,
  Sun,
  UserCheck,
} from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { CloudArchitecturePanel } from './components/CloudArchitecturePanel';
import { DoctorReviewPanel } from './components/DoctorReviewPanel';
import { MedicalRagChatbot } from './components/MedicalRagChatbot';
import { MriDiagnosisPanel } from './components/MriDiagnosisPanel';
import { OverviewDashboard } from './components/OverviewDashboard';
import {
  DEMO_USERS,
  INITIAL_CHAT_MESSAGES,
  INITIAL_CHAT_SESSIONS,
  INITIAL_DIAGNOSES,
  INITIAL_FAQ_DOCUMENTS,
  runLocalRagSynthesis,
} from './data/seedData';
import {
  ActiveTab,
  ChatMessage,
  ChatSession,
  DiagnosisRecord,
  FaqDocument,
  TumorLabel,
  UserProfile,
  UserRole,
} from './types';

export function App() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Quản lý tài khoản & phiên đăng nhập (FR01)
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_USERS.patient);
  const [sessionToken, setSessionToken] = useState<string>('kv-sess-demo-patient');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  // Dữ liệu ứng dụng đồng bộ với Cloudflare D1 / R2 / Vectorize
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[]>(INITIAL_DIAGNOSES);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<DiagnosisRecord | null>(
    INITIAL_DIAGNOSES[0]
  );
  const [faqs, setFaqs] = useState<FaqDocument[]>(INITIAL_FAQ_DOCUMENTS);
  const [chatSessions] = useState<ChatSession[]>(INITIAL_CHAT_SESSIONS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Đồng bộ dữ liệu từ Cloudflare Workers API khi chạy với Wrangler
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/faq');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.faqs) && data.faqs.length > 0) {
            setFaqs(data.faqs);
          }
        }
      } catch {
        // Sử dụng dữ liệu khởi tạo cục bộ
      }
    })();
  }, []);

  const handleSwitchRole = (role: UserRole) => {
    const profile = DEMO_USERS[role];
    setCurrentUser(profile);
    setSessionToken(`kv-sess-${role}-${Date.now()}`);
  };

  const handleDiagnosisSaved = (newRec: DiagnosisRecord) => {
    setDiagnoses((prev) => [newRec, ...prev]);
    setSelectedDiagnosis(newRec);
  };

  const handleAskChatbotAboutResult = (label: TumorLabel, confidence: number) => {
    const q = `Kết quả phân tích ảnh MRI của tôi dự đoán nhãn "${label}" với độ tin cậy ${(
      confidence * 100
    ).toFixed(1)}%. Xin giải thích ý nghĩa nhãn này và hướng khám tiếp theo?`;
    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      session_id: 'sess-4001',
      sender: 'user',
      content: q,
      created_at: new Date().toISOString(),
    };
    const rag = runLocalRagSynthesis(q, faqs);
    const botMsg: ChatMessage = {
      id: `msg-b-${Date.now() + 1}`,
      session_id: 'sess-4001',
      sender: 'bot',
      content: rag.answer,
      sources: rag.sources,
      created_at: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg, botMsg]);
    setActiveTab('chatbot');
  };

  const handleSubmitDoctorReview = async (
    predictionId: string,
    confirmedLabel: TumorLabel,
    note: string
  ) => {
    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          prediction_id: predictionId,
          doctor_id: currentUser.id,
          confirmed_label: confirmedLabel,
          note,
        }),
      });
    } catch {
      // Cập nhật trực tiếp vào state
    }

    const updated = diagnoses.map((d) =>
      d.prediction_id === predictionId
        ? {
            ...d,
            review_id: `rev-${Date.now()}`,
            doctor_id: currentUser.id,
            doctor_name:
              currentUser.role === 'doctor' ? currentUser.full_name : 'PGS.TS.BS Vũ Quốc Hùng',
            confirmed_label: confirmedLabel,
            doctor_note: note,
            reviewed_at: new Date().toISOString(),
          }
        : d
    );
    setDiagnoses(updated);
    const found = updated.find((u) => u.prediction_id === predictionId) || null;
    setSelectedDiagnosis(found);
  };

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutGrid },
    { id: 'diagnose', label: 'Chẩn đoán MRI', icon: Brain, badge: 'ONNX' },
    { id: 'history', label: 'Lịch sử chẩn đoán', icon: FolderClock, badge: String(diagnoses.length) },
    {
      id: 'doctor_review',
      label: 'Bác sĩ xác nhận',
      icon: Stethoscope,
      badge: String(diagnoses.filter((d) => !d.confirmed_label).length),
    },
    { id: 'chatbot', label: 'Hỏi đáp AI (RAG)', icon: MessageSquareText },
    { id: 'faq_admin', label: 'Quản lý FAQ Y tế', icon: BookOpenCheck },
    { id: 'cloud_arch', label: 'Kiến trúc Cloud & D1', icon: Cloud },
  ];

  const initials = currentUser.full_name
    .split(' ')
    .slice(-2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100">
      {/* Sidebar bên trái chuẩn mẫu Deal-flow NIC */}
      <aside
        className={`${
          sidebarOpen ? 'w-60' : 'w-0 overflow-hidden'
        } hidden md:flex flex-col shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-all duration-200 select-none sticky top-0 h-screen`}
      >
        {/* Logo & Tên hệ thống */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/30 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-none truncate">
              BrainTumorAI
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-1 truncate">
              Cloudflare Medical
            </p>
          </div>
        </div>

        {/* Danh mục KHÔNG GIAN LÀM VIỆC */}
        <div className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              KHÔNG GIAN LÀM VIỆC
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-50/90 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Khung chuyển nhanh Vai trò (Bệnh nhân / Bác sĩ / Quản trị) */}
          <div className="px-2">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Vai trò đang chọn
                </span>
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { r: 'patient', label: 'Bệnh nhân' },
                    { r: 'doctor', label: 'Bác sĩ' },
                    { r: 'admin', label: 'Quản trị' },
                  ] as const
                ).map((roleBtn) => (
                  <button
                    key={roleBtn.r}
                    type="button"
                    onClick={() => handleSwitchRole(roleBtn.r)}
                    className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      currentUser.role === roleBtn.r
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-blue-600'
                    }`}
                  >
                    {roleBtn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Thẻ thông tin tài khoản dưới đáy Sidebar giống mẫu Deal-flow */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-800">
            <div
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {currentUser.full_name}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              title="Đổi tài khoản / Đăng xuất (FR01)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Khu vực nội dung chính bên phải */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Thanh Topbar trên cùng chuẩn mẫu Deal-flow NIC */}
        <header className="h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Đóng mở thanh bên"
              className="hidden md:inline-flex p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Menu di động"
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Thanh tìm kiếm với phím tắt ⌘K */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (globalSearch.trim()) {
                  setActiveTab('history');
                }
              }}
              className="relative flex-1"
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Tìm ca chụp MRI, bệnh nhân, câu hỏi y tế..."
                className="w-full pl-9 pr-12 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none transition-all"
              />
              <span className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                ⌘K
              </span>
            </form>
          </div>

          {/* Cụm nút bên phải: Hỏi AI, Chuông thông báo, Dark Mode, Avatar */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('chatbot')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:border-blue-500 shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Hỏi AI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('doctor_review')}
              title="Ca chụp chờ xác nhận"
              className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {diagnoses.filter((d) => !d.confirmed_label).length || 1}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label="Chuyển chế độ Sáng / Tối"
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              title={`Tài khoản: ${currentUser.full_name} (${currentUser.role})`}
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center shadow-sm transition-transform active:scale-95"
            >
              {initials}
            </button>
          </div>
        </header>

        {/* Thanh điều hướng rút gọn trên điện thoại (Mobile Responsive) */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    activeTab === item.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nội dung màn hình chính */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewDashboard
              currentUser={currentUser}
              diagnoses={diagnoses}
              faqs={faqs}
              chatCount={chatMessages.length}
              onNavigate={(tab) => setActiveTab(tab)}
              onSelectDiagnosis={(rec) => {
                setSelectedDiagnosis(rec);
                setActiveTab('history');
              }}
            />
          )}

          {activeTab === 'diagnose' && (
            <MriDiagnosisPanel
              currentUser={currentUser}
              onDiagnosisSaved={handleDiagnosisSaved}
              onAskChatbotAboutResult={handleAskChatbotAboutResult}
            />
          )}

          {(activeTab === 'history' || activeTab === 'doctor_review') && (
            <DoctorReviewPanel
              currentUser={currentUser}
              diagnoses={diagnoses}
              selectedRecord={selectedDiagnosis}
              onSelectRecord={setSelectedDiagnosis}
              onSubmitDoctorReview={handleSubmitDoctorReview}
              mode={activeTab === 'doctor_review' ? 'doctor_review' : 'history'}
            />
          )}

          {(activeTab === 'chatbot' || activeTab === 'faq_admin') && (
            <MedicalRagChatbot
              currentUser={currentUser}
              sessions={chatSessions}
              messages={chatMessages}
              faqs={faqs}
              onSendMessage={(uMsg, bMsg) =>
                setChatMessages((prev) => [...prev, uMsg, bMsg])
              }
              onAddFaq={(newFaq) => setFaqs((prev) => [newFaq, ...prev])}
              onDeleteFaq={(id) => setFaqs((prev) => prev.filter((f) => f.id !== id))}
              activeSubMode={activeTab === 'faq_admin' ? 'faq_admin' : 'chat'}
            />
          )}

          {activeTab === 'cloud_arch' && (
            <CloudArchitecturePanel
              diagnoses={diagnoses}
              faqs={faqs}
              chatMessagesCount={chatMessages.length}
            />
          )}
        </main>

        {/* Footer thông tin học thuật & cảnh báo y khoa */}
        <footer className="px-6 py-4 border-t border-slate-200/70 dark:border-slate-800/80 text-center sm:flex sm:items-center sm:justify-between text-[11px] text-slate-400">
          <div className="flex items-center justify-center gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>
              Mini-project Điện toán Đám mây • Triển khai trên Cloudflare (Pages, Workers, D1, R2, KV, Vectorize, Workers AI)
            </span>
          </div>
          <p className="mt-1 sm:mt-0">
            Kết quả dự đoán chỉ mang tính hỗ trợ tham khảo, không thay thế chẩn đoán y khoa của bác sĩ.
          </p>
        </footer>
      </div>

      {/* Modal Đăng nhập / Đăng ký / Phân quyền (FR01) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(user, token) => {
          setCurrentUser(user);
          setSessionToken(token);
        }}
      />
    </div>
  );
}

export default App;

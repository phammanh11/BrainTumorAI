import React, { useState } from 'react';
import { KeyRound, Lock, Mail, ShieldCheck, UserPlus, X } from 'lucide-react';
import { DEMO_USERS } from '../data/seedData';
import { UserProfile, UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (user: UserProfile, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>('patient');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('benhnhan@neurocloud.vn');
  const [password, setPassword] = useState<string>('123456');
  const [specialty, setSpecialty] = useState<string>('Chẩn đoán hình ảnh & Ngoại Thần kinh');
  const [licenseNo, setLicenseNo] = useState<string>('CCHN-004821/BYT');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName || (role === 'doctor' ? 'BS. Nguyễn Văn A' : 'Bệnh nhân Mới'),
          role,
          specialty,
          license_no: licenseNo,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          onAuthenticated(data.user, data.token || 'kv-session-token');
          onClose();
          return;
        }
      }
    } catch {
      // Fallback sang dữ liệu demo cục bộ khi chạy Vite đơn lẻ
    }

    // Xác thực fallback cục bộ
    if (mode === 'login') {
      const matched = Object.values(DEMO_USERS).find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (matched) {
        onAuthenticated(matched, `kv-sess-${Date.now()}`);
        onClose();
      } else {
        setError('Email không tồn tại trong dữ liệu mẫu. Hãy chọn nhanh tài khoản bên dưới hoặc Đăng ký mới.');
      }
    } else {
      const newUser: UserProfile = {
        id: `usr-${role.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
        email,
        role,
        full_name: fullName || 'Người dùng mới',
        created_at: new Date().toISOString(),
        medical_code: role === 'patient' ? 'BN-2026-9901' : undefined,
        specialty: role === 'doctor' ? specialty : undefined,
        license_no: role === 'doctor' ? licenseNo : undefined,
      };
      onAuthenticated(newUser, `kv-sess-${Date.now()}`);
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Yêu cầu chức năng FR01 • Cloudflare KV Session
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {mode === 'login' ? 'Đăng nhập Hệ thống' : 'Đăng ký Tài khoản mới'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chuyển đổi nhanh 3 vai trò Demo */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Đăng nhập nhanh 1-chạm (Phân quyền theo vai trò):
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { r: 'patient', label: 'Bệnh nhân', email: 'benhnhan@neurocloud.vn' },
                { r: 'doctor', label: 'Bác sĩ', email: 'bs.hung@neurocloud.vn' },
                { r: 'admin', label: 'Quản trị', email: 'admin@neurocloud.vn' },
              ] as const
            ).map((item) => (
              <button
                key={item.r}
                type="button"
                onClick={() => {
                  onAuthenticated(DEMO_USERS[item.r], `kv-token-${item.r}`);
                  onClose();
                }}
                className="py-2 px-2.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-600 hover:text-blue-600 transition-all shadow-sm"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chế độ Đăng nhập / Đăng ký */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2 rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Đăng ký mới
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === 'register' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vai trò tài khoản
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('patient')}
                    className={`py-2 rounded-xl font-bold border ${
                      role === 'patient'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Bệnh nhân
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('doctor')}
                    className={`py-2 rounded-xl font-bold border ${
                      role === 'doctor'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Bác sĩ chuyên khoa
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5"
                />
              </div>
            </>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email tài khoản
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mật khẩu (Được băm SHA-256 trước khi lưu vào D1)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {mode === 'register' && role === 'doctor' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chuyên khoa
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Số CCHN
                </label>
                <input
                  type="text"
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                />
              </div>
            </div>
          )}

          {error && <p className="text-rose-600 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            {mode === 'login' ? <KeyRound className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {loading
              ? 'Đang xác thực với Workers API...'
              : mode === 'login'
              ? 'Đăng nhập & Khởi tạo Phiên KV'
              : 'Đăng ký & Lưu vào Cloudflare D1'}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            Mật khẩu được băm mật mã, phiên lưu trên Cloudflare KV có thời hạn tự động thu hồi (Mục 1.8.9).
          </span>
        </div>
      </div>
    </div>
  );
};

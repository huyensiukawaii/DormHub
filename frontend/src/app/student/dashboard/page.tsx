'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  KeyRound,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Building2,
  LogOut,
  Mail,
} from 'lucide-react';
import { getStoredUser, clearAuth, authApi } from '@/lib/auth';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(getStoredUser());

  const [sendingMail, setSendingMail] = useState(false);
  const [mailSent, setMailSent] = useState(false);
  const [mailError, setMailError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'STUDENT') {
      router.push('/dashboard');
    }
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const handleSendResetMail = async () => {
    if (!user?.email) return;
    setSendingMail(true);
    setMailError('');
    try {
      await authApi.forgotPassword(user.email);
      setMailSent(true);
    } catch {
      setMailError('Không thể gửi email. Vui lòng thử lại sau.');
    } finally {
      setSendingMail(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-emerald-700 text-lg font-bold">DORMHUB</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user.fullName}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Banner nhắc đổi mật khẩu */}
        {user.mustChangePassword && (
          <div className="mb-6 flex items-start gap-4 p-4 bg-amber-50 border border-amber-300 rounded-xl">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                Bạn đang dùng mật khẩu mặc định
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                Mật khẩu hiện tại là MSSV của bạn. Vui lòng đổi mật khẩu để bảo vệ tài khoản.
              </p>

              {!mailSent ? (
                <button
                  onClick={handleSendResetMail}
                  disabled={sendingMail}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg transition-colors"
                >
                  {sendingMail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      Đổi mật khẩu ngay
                    </>
                  )}
                </button>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-sm text-amber-800">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Đã gửi link đổi mật khẩu đến <strong>{user.email}</strong>. Kiểm tra hộp thư (kể cả thư rác) và làm theo hướng dẫn.
                  </span>
                </div>
              )}

              {mailError && (
                <p className="mt-2 text-sm text-red-600">{mailError}</p>
              )}
            </div>
          </div>
        )}

        {/* Placeholder nội dung dashboard */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Chào mừng, {user.fullName}!</p>
          <p className="text-sm text-slate-400 mt-1">Portal sinh viên đang được phát triển.</p>
        </div>
      </main>
    </div>
  );
}

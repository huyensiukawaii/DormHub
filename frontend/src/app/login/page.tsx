'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Eye, EyeOff, Mail, Lock, AlertCircle,
  Building2, Home, FileText, Wrench, Loader2, X,
} from 'lucide-react';
import { authApi, saveAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 5000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = formData.email.trim();
    const password = formData.password;

    if (!email && !password) {
      showToast('Vui lòng nhập email và mật khẩu.');
      return;
    }
    if (!email) {
      showToast('Vui lòng nhập email.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showToast('Email không đúng định dạng.');
      return;
    }
    if (!password) {
      showToast('Vui lòng nhập mật khẩu.');
      return;
    }
    if (password.length < 6) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.login({ email, password });
      saveAuth(response);
      if (response.user.role === 'STUDENT') {
        router.push('/student/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-start gap-3 bg-red-600 text-white text-sm px-4 py-3.5 rounded-lg shadow-lg max-w-sm animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{toast}</span>
          <button onClick={() => setToast('')} className="flex-shrink-0 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#1E5D4B] overflow-hidden">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-top mix-blend-overlay opacity-30"
          style={{ backgroundImage: "url('/images/login.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/70 via-emerald-800/55 to-[#104A37]/70" />

        <div className="relative z-10 flex flex-col justify-between p-14 w-full h-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Building2 className="text-white w-5 h-5" />
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">DORMHUB</span>
          </div>

          <div>
            <h2 className="text-white text-4xl font-bold leading-tight mb-6">
              Quản lý ký túc xá<br />thông minh &amp; hiệu quả
            </h2>
            <p className="text-white/80 text-[17px] leading-relaxed mb-10 max-w-md">
              Hệ thống quản lý toàn diện dành cho sinh viên và ban quản lý ký túc xá.
            </p>
            <div className="flex flex-col gap-5">
              {[
                { Icon: Home, text: 'Đăng ký phòng ở trực tuyến dễ dàng' },
                { Icon: FileText, text: 'Theo dõi hợp đồng & hóa đơn minh bạch' },
                { Icon: Wrench, text: 'Báo sự cố & xử lý nhanh chóng' },
              ].map(({ Icon, text }) => (
                <div key={text} className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl flex-shrink-0">
                    <Icon className="text-white w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <span className="text-white/90 text-[15px]">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/50 text-sm">© 2026 DORMHUB. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Building2 className="text-white w-5 h-5" />
            </div>
            <span className="text-emerald-700 text-2xl font-bold">DORMHUB</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Đăng nhập</h1>
            <p className="text-slate-500 text-sm">Chào mừng bạn trở lại! Vui lòng đăng nhập để tiếp tục.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu"
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-slate-600 cursor-pointer outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-sm text-slate-600">Ghi nhớ đăng nhập</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 bg-[#059669] hover:bg-[#047857] disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-sm text-slate-500">Chưa có tài khoản? </span>
            <Link href="/register" className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold">
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Eye, EyeOff, Mail, Lock, User, Phone, GraduationCap,
  AlertCircle, CheckCircle2, Building2, Loader2, UserRound,
  BedDouble, Landmark, Star,
} from 'lucide-react';
import { authApi, saveAuth } from '@/lib/auth';
import { MAJORS } from '@/lib/constants';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    studentCode: '',
    gender: '',
    majorCode: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError('');
  };

  const getPasswordStrength = (password: string) => {
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-emerald-500'];
  const strengthTexts = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];

  const validateForm = () => {
    const trimmedEmail = formData.email.trim();
    const trimmedStudentCode = formData.studentCode.trim();

    if (!formData.fullName || !formData.email || !formData.phone ||
        !formData.studentCode || !formData.gender || !formData.majorCode ||
        !formData.password || !formData.confirmPassword) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return false;
    }
    if (!/^[^\s@]+@sis\.hust\.edu\.vn$/.test(trimmedEmail)) {
      setError('Email phải có đuôi @sis.hust.edu.vn.');
      return false;
    }
    if (!/^\d+$/.test(trimmedStudentCode)) {
      setError('MSSV chỉ được chứa chữ số.');
      return false;
    }
    const studentCodeNumber = Number(trimmedStudentCode);
    if (!Number.isSafeInteger(studentCodeNumber) || studentCodeNumber < 20200000 || studentCodeNumber > 202600000) {
      setError('MSSV phải nằm trong khoảng 20200000 đến 202600000.');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return false;
    }
    if (!formData.agreeTerms) {
      setError('Vui lòng đồng ý với điều khoản sử dụng.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError('');
    try {
      const response = await authApi.register({
        fullName: formData.fullName,
        email: formData.email.trim(),
        phone: formData.phone,
        studentCode: formData.studentCode.trim(),
        gender: formData.gender as 'MALE' | 'FEMALE',
        majorCode: formData.majorCode,
        password: formData.password,
      });
      saveAuth(response);
      setSuccess(true);
      setTimeout(() => router.push('/student/dashboard'), 2000);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      if (Array.isArray(message)) {
        setError(message.join('; '));
      } else if (typeof message === 'string' && message.trim()) {
        setError(message);
      } else {
        setError('Đăng ký thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Đăng ký thành công!</h2>
          <p className="text-slate-500 text-sm mb-6">Đang chuyển hướng đến trang chủ...</p>
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden">
        <img
          src="/images/register.jpg"
          alt="Register"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/65 via-emerald-800/55 to-emerald-900/65" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Building2 className="text-white w-5 h-5" />
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">DORMHUB</span>
          </div>

          {/* Heading + stats */}
          <div>
            <h2 className="text-white text-3xl font-bold leading-tight mb-4">
              Tham gia cùng<br />hàng nghìn sinh viên
            </h2>
            <p className="text-white/70 text-base leading-relaxed mb-8">
              Đăng ký tài khoản để bắt đầu hành trình tìm kiếm chỗ ở ký túc xá phù hợp với bạn.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { Icon: UserRound, label: '2,400+', sub: 'Sinh viên' },
                { Icon: BedDouble, label: '480', sub: 'Phòng ở' },
                { Icon: Landmark, label: '6', sub: 'Tòa nhà' },
                { Icon: Star, label: '4.8/5', sub: 'Đánh giá' },
              ].map(({ Icon, label, sub }) => (
                <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="w-7 h-7 flex items-center justify-center mb-2">
                    <Icon className="text-white/80 w-4 h-4" />
                  </div>
                  <div className="text-white text-xl font-bold">{label}</div>
                  <div className="text-white/60 text-xs">{sub}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/40 text-sm">© 2026 DORMHUB. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-start justify-center p-6 bg-white overflow-y-auto">
        <div className="w-full max-w-lg py-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Building2 className="text-white w-5 h-5" />
            </div>
            <span className="text-emerald-700 text-xl font-bold">DORMHUB</span>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Tạo tài khoản</h1>
            <p className="text-slate-500 text-sm">Điền đầy đủ thông tin để đăng ký tài khoản sinh viên.</p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="sv20210001@sis.hust.edu.vn"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0901234567"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* MSSV + Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  MSSV <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="studentCode"
                    value={formData.studentCode}
                    onChange={handleChange}
                    placeholder="VD: 20210001"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Giới tính <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all appearance-none bg-white cursor-pointer border-slate-200 ${!formData.gender ? 'text-slate-400' : 'text-slate-800'}`}
                >
                  <option value="">Chọn giới tính</option>
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                </select>
              </div>
            </div>

            {/* Major */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Khoa / Ngành <span className="text-red-500">*</span>
              </label>
              <select
                name="majorCode"
                value={formData.majorCode}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all appearance-none bg-white cursor-pointer border-slate-200 ${!formData.majorCode ? 'text-slate-400' : 'text-slate-800'}`}
              >
                <option value="">Chọn khoa / ngành</option>
                {MAJORS.map((f) => (
                  <option key={f.code} value={f.code}>{f.name}</option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2 flex items-center gap-1.5">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-slate-200'}`}
                    />
                  ))}
                  <span className="text-xs text-slate-500 ml-1 whitespace-nowrap">
                    {strengthTexts[passwordStrength - 1] || 'Rất yếu'}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Xác nhận mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer flex-shrink-0"
              />
              <span className="text-sm text-slate-600 leading-relaxed">
                Tôi đồng ý với{' '}
                <Link href="/terms" className="text-emerald-600 hover:underline font-medium">Điều khoản sử dụng</Link>
                {' '}và{' '}
                <Link href="/privacy" className="text-emerald-600 hover:underline font-medium">Chính sách bảo mật</Link>
                {' '}của DORMHUB.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tạo tài khoản...</span>
                </>
              ) : (
                <span>Tạo tài khoản</span>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <span className="text-sm text-slate-500">Đã có tài khoản? </span>
            <Link href="/login" className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold">
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const trimmedEmail = useMemo(() => email.trim(), [email]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!trimmedEmail) {
      setError('Vui lòng nhập email.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError('Email không đúng định dạng.');
      return;
    }

    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <Building2 className="text-white w-5 h-5" />
          </div>
          <span className="text-emerald-700 text-2xl font-bold">DORMHUB</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-slate-800">Quên mật khẩu</h1>
            <p className="text-slate-500 text-sm mt-1">
              Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-emerald-700">Đã ghi nhận yêu cầu</div>
                <div className="text-sm text-emerald-700/80 mt-1">
                  Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder="sv20210001@sis.hust.edu.vn"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-all"
              >
                Gửi yêu cầu
              </button>
            </form>
          )}

          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

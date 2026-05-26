'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Lock, Eye, EyeOff, ArrowLeft,
  Loader2, CheckCircle, AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';

export default function ChangePasswordPage() {
  const router = useRouter();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState<{ ok: boolean; text: string } | null>(null);

  const handleSubmit = async () => {
    if (newPw !== confirmPw) { setMsg({ ok: false, text: 'Mật khẩu xác nhận không khớp' }); return; }
    if (newPw.length < 6)    { setMsg({ ok: false, text: 'Mật khẩu mới phải có ít nhất 6 ký tự' }); return; }
    setSaving(true);
    setMsg(null);
    try {
      await api.post('/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
      setMsg({ ok: true, text: 'Đổi mật khẩu thành công' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => router.push('/profile'), 1500);
    } catch (e: any) {
      setMsg({ ok: false, text: e.response?.data?.message ?? 'Có lỗi xảy ra' });
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { label: 'Mật khẩu hiện tại', value: currentPw, set: setCurrentPw, show: showCurrent, toggle: () => setShowCurrent((v) => !v) },
    { label: 'Mật khẩu mới',      value: newPw,     set: setNewPw,     show: showNew,     toggle: () => setShowNew((v) => !v)     },
    { label: 'Xác nhận mật khẩu', value: confirmPw, set: setConfirmPw, show: showConfirm, toggle: () => setShowConfirm((v) => !v) },
  ];

  return (
    <AdminLayout hideSearch>
      {/* Back — nằm trên cùng */}
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-8">
        <ArrowLeft className="w-4 h-4" /> Quay lại thông tin cá nhân
      </Link>

      {/* Form căn giữa */}
      <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 220px)' }}>
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-5 h-5 text-slate-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Đổi mật khẩu</h1>
            <p className="text-sm text-slate-500 mt-1">Cập nhật mật khẩu đăng nhập của bạn</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            {msg && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                {msg.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {msg.text}
              </div>
            )}

            {fields.map(({ label, value, set, show, toggle }) => (
              <div key={label}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <button type="button" onClick={toggle} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-1 flex gap-3">
              <Link href="/profile" className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-center transition-colors">
                Hủy
              </Link>
              <button
                onClick={handleSubmit}
                disabled={saving || !currentPw || !newPw || !confirmPw}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

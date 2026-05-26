'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  User, Mail, Phone, Shield, Building2,
  Pencil, Check, X, Lock,
  Loader2, CheckCircle, AlertCircle, ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';

interface ProfileData {
  id: number;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'STAFF' | 'STUDENT';
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  assignedBuildings: { id: number; code: string; name: string }[];
}

const ROLE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN: { label: 'Quản trị viên', color: 'text-violet-700', bg: 'bg-violet-100' },
  STAFF: { label: 'Nhân viên',     color: 'text-blue-700',   bg: 'bg-blue-100'   },
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing]   = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api.get('/auth/me').then((r) => {
      setProfile(r.data);
      setFullName(r.data.fullName);
      setPhone(r.data.phone ?? '');
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await api.patch('/auth/profile', { fullName, phone: phone || undefined });
      setProfile((p) => p ? { ...p, fullName: res.data.fullName, phone: res.data.phone } : p);
      setEditing(false);
      setSaveMsg({ ok: true, text: 'Cập nhật thành công' });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e: any) {
      setSaveMsg({ ok: false, text: e.response?.data?.message ?? 'Có lỗi xảy ra' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout hideSearch>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </AdminLayout>
    );
  }

  if (!profile) return null;

  const roleCfg = ROLE_CFG[profile.role] ?? { label: profile.role, color: 'text-slate-700', bg: 'bg-slate-100' };
  const initials = profile.fullName.split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase();

  return (
    <AdminLayout hideSearch>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Thông tin cá nhân</h1>
        <p className="text-sm text-slate-500 mt-1">Quản lý thông tin tài khoản của bạn</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cột trái: avatar card */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center gap-3">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-3xl font-bold text-emerald-700">{initials}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{profile.fullName}</h2>
              <span className={`mt-1 inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${roleCfg.bg} ${roleCfg.color}`}>
                {roleCfg.label}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tham gia {new Date(profile.createdAt).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Đổi mật khẩu — shortcut */}
          <Link
            href="/profile/change-password"
            className="flex items-center justify-between bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-slate-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                <Lock className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Đổi mật khẩu</p>
                <p className="text-xs text-slate-400">Cập nhật mật khẩu đăng nhập</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          </Link>
        </div>

        {/* Cột phải: thông tin */}
        <div className="lg:col-span-2 space-y-5">
          {/* Thông tin cơ bản */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Thông tin cơ bản</h3>
              {!editing ? (
                <button
                  onClick={() => { setEditing(true); setSaveMsg(null); }}
                  className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  <Pencil className="w-4 h-4" /> Chỉnh sửa
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditing(false); setFullName(profile.fullName); setPhone(profile.phone ?? ''); setSaveMsg(null); }}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" /> Hủy
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Lưu
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 space-y-5">
              {saveMsg && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${saveMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  {saveMsg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {saveMsg.text}
                </div>
              )}

              {/* Họ tên */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">Họ và tên</p>
                  {editing ? (
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-800">{profile.fullName}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">Email</p>
                  <p className="text-sm font-medium text-slate-800">{profile.email}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Không thể thay đổi email</p>
                </div>
              </div>

              {/* Số điện thoại */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Phone className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">Số điện thoại</p>
                  {editing ? (
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Chưa có số điện thoại"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-800">
                      {profile.phone ?? <span className="text-slate-400 font-normal">Chưa cập nhật</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Phân quyền */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Phân quyền & phạm vi</h3>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Vai trò</p>
                  <span className={`px-2.5 py-1 text-sm font-semibold rounded-full ${roleCfg.bg} ${roleCfg.color}`}>
                    {roleCfg.label}
                  </span>
                  <p className="text-xs text-slate-400 mt-1.5">
                    {profile.role === 'ADMIN' ? 'Toàn quyền quản lý hệ thống' : 'Quản lý các tòa được phân công'}
                  </p>
                </div>
              </div>

              {profile.role === 'STAFF' && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Tòa được phân công</p>
                    {profile.assignedBuildings.length === 0 ? (
                      <p className="text-sm text-slate-400">Chưa được phân công tòa nào</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {profile.assignedBuildings.map((b) => (
                          <span key={b.id} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg border border-blue-200">
                            {b.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

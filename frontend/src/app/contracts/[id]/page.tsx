'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  ArrowLeft,
  Calendar,
  Home,
  User,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  LogIn,
  LogOut,
  Crown,
  Phone,
  Mail,
  GraduationCap,
  Users,
  AlertTriangle,
  FileText,
  CalendarX,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';

interface ContractDetail {
  id: number;
  code: string;
  status: 'ACTIVE' | 'TERMINATED' | 'EXPIRED';
  startDate: string;
  endDate: string;
  monthlyRent: number;
  isRoomLeader: boolean;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  terminationReason: string | null;
  daysRemaining: number;
  currentOccupants: number;
  student: {
    id: number;
    studentCode: string;
    fullName: string;
    gender: string;
    faculty: string;
    className: string;
    phone: string | null;
    user: { email: string; phone: string | null };
  };
  room: {
    id: number;
    code: string;
    floor: number;
    roomType: string;
    capacity: number;
    pricePerMonth: number;
    building: { id: number; code: string; name: string };
  };
  application: {
    id: number;
    type: string;
    priorityScore: number;
    period: { id: number; code: string; name: string };
  } | null;
  roommates: Array<{ id: number; studentCode: string; fullName: string; gender: string }>;
  createdBy: { id: number; fullName: string } | null;
  createdAt: string;
}

export default function ContractDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = params.id as string;

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [showTerminate, setShowTerminate] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');

  useEffect(() => { fetchDetail(); }, [contractId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/contracts/${contractId}`);
      setContract(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải chi tiết');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!confirm('Xác nhận check-in sinh viên?')) return;
    setActionLoading(true);
    try { await api.patch(`/contracts/${contractId}/check-in`, {}); fetchDetail(); } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); } finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    if (!confirm('Xác nhận check-out? Hợp đồng sẽ chuyển sang Hết hạn.')) return;
    setActionLoading(true);
    try { await api.patch(`/contracts/${contractId}/check-out`, {}); fetchDetail(); } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); } finally { setActionLoading(false); }
  };

  const handleTerminate = async () => {
    if (!terminateReason.trim()) return;
    setActionLoading(true);
    try {
      await api.patch(`/contracts/${contractId}/terminate`, { terminationReason: terminateReason });
      setShowTerminate(false);
      setTerminateReason('');
      fetchDetail();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); } finally { setActionLoading(false); }
  };

  const toggleRoomLeader = async () => {
    if (!contract) return;
    const action = contract.isRoomLeader ? 'Bỏ' : 'Đặt';
    if (!confirm(`${action} trưởng phòng cho ${contract.student.fullName}?`)) return;
    setActionLoading(true);
    try { await api.patch(`/contracts/${contractId}/room-leader`, { isRoomLeader: !contract.isRoomLeader }); fetchDetail(); } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); } finally { setActionLoading(false); }
  };

  const fd = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' });
  const fdt = (d: string) => new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const fc = (v: number | string) => new Intl.NumberFormat('vi-VN').format(typeof v === 'string' ? parseFloat(v) : v) + 'đ/tháng';

  if (loading) return <AdminLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div></AdminLayout>;
  if (error || !contract) return <AdminLayout><div className="flex flex-col items-center justify-center py-20"><AlertCircle className="w-12 h-12 text-red-400 mb-3" /><p className="text-red-500 mb-4">{error}</p><button onClick={() => router.back()} className="text-emerald-600 font-medium">Quay lại</button></div></AdminLayout>;

  const isActive = contract.status === 'ACTIVE';

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg mt-0.5">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-800">Chi tiết Hợp đồng</h1>
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-sm font-mono font-semibold rounded-md">{contract.code}</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">{fd(contract.startDate)} → {fd(contract.endDate)}</p>
          </div>
        </div>
        {contract.status === 'ACTIVE' && <span className="px-3 py-1 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">Hoạt động</span>}
        {contract.status === 'EXPIRED' && <span className="px-3 py-1 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full">Hết hạn</span>}
        {contract.status === 'TERMINATED' && <span className="px-3 py-1 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full">Đã chấm dứt</span>}
      </div>

      {contract.status === 'TERMINATED' && contract.terminationReason && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Hợp đồng đã bị chấm dứt</p>
            <p className="text-sm text-red-700 mt-1">{contract.terminationReason}</p>
          </div>
        </div>
      )}

      {/* 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT */}
        <div className="space-y-6">
          {/* Sinh viên */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Sinh viên</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${contract.student.gender === 'MALE' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                {contract.student.fullName.split(' ').pop()?.charAt(0) || 'S'}
              </div>
              <div>
                <Link href={`/students/${contract.student.id}`} className="text-lg font-bold text-slate-800 hover:text-emerald-600">
                  {contract.student.fullName}
                </Link>
                <p className="text-sm text-slate-500">{contract.student.studentCode}</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {contract.student.faculty && (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <GraduationCap className="w-4 h-4 text-slate-400" />
                  <span>{contract.student.faculty}</span>
                </div>
              )}
              {contract.student.user.email && (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{contract.student.user.email}</span>
                </div>
              )}
              {(contract.student.user.phone || contract.student.phone) && (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{contract.student.user.phone || contract.student.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Thông tin Phòng */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Thông tin Phòng</h3>
            <div className="space-y-0">
              {[
                ['Phòng', contract.room.code],
                ['Tòa nhà', contract.room.building.name],
                ['Tầng', `Tầng ${contract.room.floor}`],
                ['Loại phòng', contract.room.roomType === 'AIR_CONDITIONED' ? 'Điều hòa' : 'Thường'],
                ['Sức chứa', `${contract.currentOccupants}/${contract.room.capacity} người`],
                ['Tiền phòng', fc(contract.monthlyRent)],
              ].map(([label, value], i) => (
                <div key={i} className={`flex items-center justify-between py-2.5 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-semibold text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          {/* Thời gian hợp đồng */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Thời gian hợp đồng</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center mx-auto mb-2.5">
                  <Calendar className="w-5 h-5 text-slate-500" />
                </div>
                <p className="text-xs text-slate-500 mb-1">Ngày bắt đầu</p>
                <p className="text-sm font-bold text-slate-800">{fd(contract.startDate)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center mx-auto mb-2.5">
                  <LogIn className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-xs text-slate-500 mb-1">Ngày check-in</p>
                <p className={`text-sm font-bold ${contract.checkedInAt ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {contract.checkedInAt ? fd(contract.checkedInAt) : '—'}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center mx-auto mb-2.5">
                  <CalendarX className="w-5 h-5 text-slate-500" />
                </div>
                <p className="text-xs text-slate-500 mb-1">Ngày kết thúc</p>
                <p className="text-sm font-bold text-slate-800">{fd(contract.endDate)}</p>
              </div>
            </div>
            {isActive && (
              <p className={`text-center text-xs font-medium mt-3 ${contract.daysRemaining <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {contract.daysRemaining > 0 ? `Còn ${contract.daysRemaining} ngày` : 'Đã quá hạn'}
              </p>
            )}
          </div>

          {/* Người ở cùng */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Người ở cùng ({contract.roommates.length})
            </h3>
            {contract.roommates.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Chưa có ai ở cùng phòng</p>
            ) : (
              <div className="space-y-3">
                {contract.roommates.map((mate) => (
                  <div key={mate.id} className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${mate.gender === 'MALE' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                      {mate.fullName.split(' ').pop()?.charAt(0) || '?'}
                    </div>
                    <div>
                      <Link href={`/students/${mate.id}`} className="text-sm font-medium text-slate-800 hover:text-emerald-600">
                        {mate.fullName}
                      </Link>
                      <p className="text-xs text-slate-500">{mate.studentCode}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Thao tác */}
          {isActive && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Thao tác</h3>
              <div className="flex flex-wrap gap-3">
                {!contract.checkedInAt ? (
                  <button onClick={handleCheckIn} disabled={actionLoading} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors">
                    <LogIn className="w-4 h-4" /> Check-in
                  </button>
                ) : (
                  <button onClick={handleCheckOut} disabled={actionLoading} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors">
                    <LogOut className="w-4 h-4" /> Check-out
                  </button>
                )}
                <button onClick={toggleRoomLeader} disabled={actionLoading} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 border border-amber-200 rounded-lg transition-colors">
                  <Crown className="w-4 h-4" /> {contract.isRoomLeader ? 'Bỏ trưởng phòng' : 'Đặt trưởng phòng'}
                </button>
                <button onClick={() => setShowTerminate(true)} disabled={actionLoading} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors">
                  <XCircle className="w-4 h-4" /> Chấm dứt HĐ
                </button>
              </div>
            </div>
          )}

          {/* Ghi chú */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
            <div className="flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Ghi chú</p>
                {contract.application ? (
                  <p className="text-sm text-slate-700">
                    Hợp đồng ký {contract.application.period.name}
                    {contract.application.type === 'RENEWAL' && ' (Gia hạn)'}
                    {' • '}
                    <Link href={`/applications/${contract.application.id}`} className="text-emerald-600 hover:underline">
                      Xem đơn #{contract.application.id}
                    </Link>
                  </p>
                ) : (
                  <p className="text-sm text-slate-500 italic">Hợp đồng tạo thủ công</p>
                )}
                {contract.createdBy && (
                  <p className="text-xs text-slate-400 mt-1">Tạo bởi {contract.createdBy.fullName} • {fdt(contract.createdAt)}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terminate Modal */}
      {showTerminate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTerminate(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Chấm dứt hợp đồng</h3>
                  <p className="text-xs text-slate-500">{contract.code} - {contract.student.fullName}</p>
                </div>
              </div>
              <button onClick={() => setShowTerminate(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Hành động này sẽ chấm dứt hợp đồng và tự động check-out sinh viên.</p>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Lý do <span className="text-red-500">*</span></label>
            <textarea value={terminateReason} onChange={(e) => setTerminateReason(e.target.value)} placeholder="VD: Vi phạm nội quy, sinh viên tự xin trả phòng..." rows={3} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none" />
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowTerminate(false); setTerminateReason(''); }} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Hủy</button>
              <button onClick={handleTerminate} disabled={!terminateReason.trim() || actionLoading} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-lg flex items-center justify-center gap-2">
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />} Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
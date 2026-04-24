'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Search,
  Plus,
  FileSignature,
  ChevronRight,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  MoreHorizontal,
  Eye,
  LogIn,
  LogOut,
  Crown,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';

type ContractStatus = 'ACTIVE' | 'TERMINATED' | 'EXPIRED';

interface Contract {
  id: number;
  code: string;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  isRoomLeader: boolean;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  daysRemaining: number;
  student: { id: number; studentCode: string; fullName: string; gender: string; faculty: string; className: string };
  room: { id: number; code: string; building: { code: string; name: string } };
  application: { id: number; type: string } | null;
}

interface Stats {
  total: number;
  active: number;
  expired: number;
  terminated: number;
  notCheckedIn: number;
  expiringCount: number;
}

const STATUS_CONFIG: Record<ContractStatus, { label: string; color: string; bg: string; icon: any }> = {
  ACTIVE: { label: 'Đang hiệu lực', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
  EXPIRED: { label: 'Hết hạn', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  TERMINATED: { label: 'Đã chấm dứt', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
};

export default function ContractsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get('studentId');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    studentId: '',
    roomId: '',
    startDate: '',
    endDate: '',
    monthlyRent: '',
    isRoomLeader: false,
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [page, filterStatus, studentIdParam]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchContracts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/contracts/stats');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (search) params.append('search', search);
      if (filterStatus) params.append('status', filterStatus);
      if (studentIdParam) params.append('studentId', studentIdParam);

      const res = await api.get(`/contracts?${params.toString()}`);
      setContracts(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (id: number) => {
    if (!confirm('Xác nhận check-in sinh viên?')) return;
    try {
      await api.patch(`/contracts/${id}/check-in`, {});
      fetchContracts();
      setOpenMenuId(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi check-in');
    }
  };

  const handleCheckOut = async (id: number) => {
    if (!confirm('Xác nhận check-out sinh viên? Hợp đồng sẽ chuyển sang Hết hạn.')) return;
    try {
      await api.patch(`/contracts/${id}/check-out`, {});
      fetchContracts();
      setOpenMenuId(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi check-out');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      await api.post('/contracts', {
        studentId: parseInt(createForm.studentId),
        roomId: parseInt(createForm.roomId),
        startDate: createForm.startDate,
        endDate: createForm.endDate,
        monthlyRent: createForm.monthlyRent ? parseFloat(createForm.monthlyRent) : undefined,
        isRoomLeader: createForm.isRoomLeader,
      });
      setShowCreateModal(false);
      fetchContracts();
      fetchStats();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Không thể tạo hợp đồng');
    } finally {
      setCreateLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });



  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hợp đồng</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý hợp đồng ký túc xá</p>
        </div>
        <button
          onClick={() => {
            setCreateForm({ studentId: '', roomId: '', startDate: '', endDate: '', monthlyRent: '', isRoomLeader: false });
            setCreateError('');
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Tạo hợp đồng
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            <p className="text-xs text-slate-500">Tổng</p>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
            <p className="text-xs text-emerald-700">Đang hiệu lực</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.expired}</p>
            <p className="text-xs text-amber-700">Hết hạn</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.terminated}</p>
            <p className="text-xs text-red-700">Chấm dứt</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.notCheckedIn}</p>
            <p className="text-xs text-blue-700">Chưa check-in</p>
          </div>
          <div className="bg-orange-50 rounded-xl border border-orange-200 p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.expiringCount}</p>
            <p className="text-xs text-orange-700">Sắp hết hạn</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 p-4">
        {studentIdParam && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
            <Filter className="w-4 h-4" />
            <span>Đang lọc theo sinh viên ID: <strong>{studentIdParam}</strong></span>
            <button onClick={() => router.push('/contracts')} className="ml-auto p-0.5 hover:bg-emerald-100 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã HĐ, MSSV, tên SV..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hiệu lực</option>
            <option value="EXPIRED">Hết hạn</option>
            <option value="TERMINATED">Đã chấm dứt</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Hợp đồng</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Sinh viên</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Phòng</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Thời gian</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Trạng thái</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contracts.map((contract) => {
                    const sc = STATUS_CONFIG[contract.status];
                    const Icon = sc.icon;
                    return (
                      <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4">
                          <button
                            onClick={() => router.push(`/contracts/${contract.id}`)}
                            className="text-sm font-semibold text-slate-800 hover:text-emerald-600 flex items-center gap-1"
                          >
                            {contract.code}
                            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                          </button>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {contract.application
                              ? `Từ đơn #${contract.application.id} (${contract.application.type === 'NEW' ? 'Mới' : 'Gia hạn'})`
                              : 'Tạo thủ công'}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{contract.student.fullName}</p>
                            <p className="text-xs text-slate-500">{contract.student.studentCode}</p>
                            {contract.isRoomLeader && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 mt-0.5">
                                <Crown className="w-3 h-3" /> Trưởng phòng
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <p className="text-sm font-medium text-slate-800">{contract.room.code}</p>
                          <p className="text-xs text-slate-500">{contract.room.building.name}</p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <p className="text-xs text-slate-600">
                            {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
                          </p>
                          {contract.status === 'ACTIVE' && contract.daysRemaining > 0 && (
                            <p className={`text-xs font-medium mt-0.5 ${contract.daysRemaining <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              Còn {contract.daysRemaining} ngày
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${sc.bg} ${sc.color}`}>
                            <Icon className="w-3 h-3" />
                            {sc.label}
                          </span>
                          {contract.status === 'ACTIVE' && !contract.checkedInAt && (
                            <p className="text-xs text-blue-600 mt-1">Chưa check-in</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === contract.id ? null : contract.id)}
                              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                            >
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                            {openMenuId === contract.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                                  <button
                                    onClick={() => { router.push(`/contracts/${contract.id}`); setOpenMenuId(null); }}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Eye className="w-4 h-4" /> Chi tiết
                                  </button>
                                  {contract.status === 'ACTIVE' && !contract.checkedInAt && (
                                    <button
                                      onClick={() => handleCheckIn(contract.id)}
                                      className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                                    >
                                      <LogIn className="w-4 h-4" /> Check-in
                                    </button>
                                  )}
                                  {contract.status === 'ACTIVE' && contract.checkedInAt && (
                                    <button
                                      onClick={() => handleCheckOut(contract.id)}
                                      className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                                    >
                                      <LogOut className="w-4 h-4" /> Check-out
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {contracts.length === 0 && (
                <div className="text-center py-12">
                  <FileSignature className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Chưa có hợp đồng nào</p>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <p className="text-sm text-slate-500">Trang {page}/{totalPages} ({total} hợp đồng)</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg">Trước</button>
                  <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg">Sau</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Tạo hợp đồng thủ công</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {createError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                  <AlertCircle className="w-4 h-4" /> {createError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Student ID <span className="text-red-500">*</span></label>
                  <input type="number" value={createForm.studentId} onChange={(e) => setCreateForm({ ...createForm, studentId: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Room ID <span className="text-red-500">*</span></label>
                  <input type="number" value={createForm.roomId} onChange={(e) => setCreateForm({ ...createForm, roomId: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Ngày bắt đầu <span className="text-red-500">*</span></label>
                  <input type="date" value={createForm.startDate} onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Ngày kết thúc <span className="text-red-500">*</span></label>
                  <input type="date" value={createForm.endDate} onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tiền phòng/tháng (để trống = lấy từ phòng)</label>
                <input type="number" value={createForm.monthlyRent} onChange={(e) => setCreateForm({ ...createForm, monthlyRent: e.target.value })} placeholder="VD: 300000" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={createForm.isRoomLeader} onChange={(e) => setCreateForm({ ...createForm, isRoomLeader: e.target.checked })} className="w-4 h-4 text-emerald-600 rounded" />
                <span className="text-sm text-slate-700">Là trưởng phòng</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Hủy</button>
                <button type="submit" disabled={createLoading} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg flex items-center justify-center gap-2">
                  {createLoading && <Loader2 className="w-4 h-4 animate-spin" />} Tạo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Wrench, Search, ChevronRight, Loader2, AlertCircle,
  CheckCircle, Clock, XCircle, Eye, RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';

type TicketStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
type TicketPriority = 'LOW' | 'NORMAL' | 'URGENT';
type TicketCategory = 'ELECTRICAL' | 'PLUMBING' | 'AIR_CONDITIONER' | 'DOOR_LOCK' | 'FURNITURE' | 'OTHER';

interface Ticket {
  id: number;
  code: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority | null;
  status: TicketStatus;
  createdAt: string;
  room: { id: number; code: string; building: { id: number; code: string; name: string } };
  reportedBy: { id: number; fullName: string; studentCode: string };
  handledBy: { id: number; fullName: string } | null;
}

interface Stats {
  counts: { new: number; inProgress: number; completed: number; rejected: number; total: number };
  newUnhandled: number;
  urgentPending: number;
  rating: { average: number | null; count: number };
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string; icon: any }> = {
  NEW:         { label: 'Mới',          color: 'text-blue-700',    bg: 'bg-blue-100',    icon: Clock },
  IN_PROGRESS: { label: 'Đang xử lý',   color: 'text-amber-700',   bg: 'bg-amber-100',   icon: AlertCircle },
  COMPLETED:   { label: 'Hoàn thành',   color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
  REJECTED:    { label: 'Từ chối',      color: 'text-red-700',     bg: 'bg-red-100',     icon: XCircle },
  CANCELLED:   { label: 'Đã hủy',       color: 'text-slate-500',   bg: 'bg-slate-100',   icon: XCircle },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; bg: string }> = {
  LOW:    { label: 'Thấp',       color: 'text-slate-600',  bg: 'bg-slate-100' },
  NORMAL: { label: 'Bình thường', color: 'text-blue-600',   bg: 'bg-blue-100' },
  URGENT: { label: 'Khẩn cấp',   color: 'text-red-700',    bg: 'bg-red-100' },
};
const UNCLASSIFIED = { label: 'Chưa phân loại', color: 'text-orange-600', bg: 'bg-orange-50' };
const getPriority = (p: TicketPriority | null) => p ? PRIORITY_CONFIG[p] : UNCLASSIFIED;

const CATEGORY_LABEL: Record<TicketCategory, string> = {
  ELECTRICAL:    'Điện',
  PLUMBING:      'Nước',
  AIR_CONDITIONER: 'Điều hòa',
  DOOR_LOCK:     'Cửa/Khóa',
  FURNITURE:     'Nội thất',
  OTHER:         'Khác',
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

function TicketsPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState<{ id: number; name: string }[]>([]);

  const [search, setSearch]             = useState(sp.get('search') ?? '');
  const [filterStatus, setFilterStatus] = useState(sp.get('status') ?? 'ACTIVE');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [total, setTotal]               = useState(0);
  const limit = 20;

  useEffect(() => {
    api.get('/buildings').then((r) => setBuildings(r.data?.data ?? r.data ?? [])).catch(() => {});
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/tickets/stats');
      setStats(res.data);
    } catch { /* ignore */ }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const p = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search)                        p.append('search', search);
      if (filterStatus === 'ACTIVE')     p.append('activeOnly', 'true');
      else if (filterStatus)             p.append('status', filterStatus);
      if (filterCategory)                p.append('category', filterCategory);
      if (filterPriority)  p.append('priority', filterPriority);
      if (filterBuilding)  p.append('buildingId', filterBuilding);
      const res = await api.get(`/tickets?${p}`);
      setTickets(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterCategory, filterPriority, filterBuilding]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const resetFilters = () => {
    setSearch(''); setFilterStatus('ACTIVE'); setFilterCategory('');
    setFilterPriority(''); setFilterBuilding(''); setPage(1);
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sự cố bảo trì</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý yêu cầu sửa chữa từ sinh viên</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{stats.counts.total}</p>
            <p className="text-xs text-slate-500">Tổng</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.counts.new}</p>
            <p className="text-xs text-blue-700">Mới</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.counts.inProgress}</p>
            <p className="text-xs text-amber-700">Đang xử lý</p>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.counts.completed}</p>
            <p className="text-xs text-emerald-700">Hoàn thành</p>
          </div>
          <div className="bg-orange-50 rounded-xl border border-orange-200 p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.newUnhandled}</p>
            <p className="text-xs text-orange-700">Chưa có ai nhận</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.urgentPending}</p>
            <p className="text-xs text-red-700">Khẩn cấp chờ xử lý</p>
          </div>
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {stats.rating.average != null ? stats.rating.average : '—'}
            </p>
            <p className="text-xs text-yellow-700">Đánh giá TB ({stats.rating.count})</p>
          </div>
        </div>
      )}

      {/* Urgent alert */}
      {stats && stats.urgentPending > 0 && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-800">
            Có {stats.urgentPending} sự cố khẩn cấp đang chờ xử lý
          </p>
          <button
            onClick={() => { setFilterPriority('URGENT'); setFilterStatus(''); setPage(1); }}
            className="ml-auto text-xs text-red-600 underline"
          >
            Xem ngay
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã ticket, tiêu đề, mã phòng..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="">Tất cả</option>
            <option value="NEW">Mới</option>
            <option value="IN_PROGRESS">Đang xử lý</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="REJECTED">Từ chối</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
          <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
            <option value="">Tất cả loại</option>
            <option value="ELECTRICAL">Điện</option>
            <option value="PLUMBING">Nước</option>
            <option value="AIR_CONDITIONER">Điều hòa</option>
            <option value="DOOR_LOCK">Cửa/Khóa</option>
            <option value="FURNITURE">Nội thất</option>
            <option value="OTHER">Khác</option>
          </select>
          <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
            <option value="">Tất cả mức độ</option>
            <option value="LOW">Thấp</option>
            <option value="NORMAL">Bình thường</option>
            <option value="URGENT">Khẩn cấp</option>
          </select>
          <select value={filterBuilding} onChange={(e) => { setFilterBuilding(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
            <option value="">Tất cả tòa</option>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={resetFilters} className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Đặt lại
          </button>
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
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Mã</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Tiêu đề</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Phòng</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Loại</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Mức độ</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Trạng thái</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Ngày tạo</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.map((t) => {
                    const sc = STATUS_CONFIG[t.status];
                    const pc = getPriority(t.priority);
                    const SIcon = sc.icon;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => router.push(`/tickets/${t.id}`)}
                            className="text-sm font-semibold text-slate-800 hover:text-emerald-600 flex items-center gap-1"
                          >
                            {t.code} <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                          </button>
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <p className="text-sm text-slate-800 truncate">{t.title}</p>
                          <p className="text-xs text-slate-400 truncate">{t.reportedBy.fullName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800">{t.room.code}</p>
                          <p className="text-xs text-slate-500">{t.room.building.name}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {CATEGORY_LABEL[t.category]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium rounded-full ${pc.bg} ${pc.color}`}>
                            {t.priority === 'URGENT' && <AlertTriangle className="w-3 h-3" />}
                            {pc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${sc.bg} ${sc.color}`}>
                            <SIcon className="w-3 h-3" /> {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-600">{fmtDate(t.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => router.push(`/tickets/${t.id}`)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {tickets.length === 0 && (
                <div className="text-center py-12">
                  <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Không có ticket nào</p>
                </div>
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <p className="text-sm text-slate-500">Trang {page}/{totalPages} ({total} ticket)</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg">Trước</button>
                  <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg">Sau</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

export default function TicketsPageWrapper() { return <Suspense fallback={null}><TicketsPage /></Suspense>; }

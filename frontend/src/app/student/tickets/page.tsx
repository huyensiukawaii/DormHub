'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StudentLayout from '@/components/layouts/StudentLayout';
import {
  Wrench, CheckCircle, Clock, AlertCircle, XCircle,
  Loader2, ChevronRight, Plus, AlertTriangle, Ticket,
} from 'lucide-react';
import { api } from '@/lib/api';

type TicketStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
type TicketCategory = 'ELECTRICAL' | 'PLUMBING' | 'AIR_CONDITIONER' | 'DOOR_LOCK' | 'FURNITURE' | 'OTHER';

interface Ticket {
  id: number;
  code: string;
  title: string;
  category: TicketCategory;
  status: TicketStatus;
  createdAt: string;
  completedAt: string | null;
  rating: number | null;
  room: { id: number; code: string; building: { name: string } };
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string; icon: any }> = {
  NEW:         { label: 'Mới',         color: 'text-blue-700',    bg: 'bg-blue-100',    icon: Clock },
  IN_PROGRESS: { label: 'Đang xử lý',  color: 'text-amber-700',   bg: 'bg-amber-100',   icon: AlertCircle },
  COMPLETED:   { label: 'Hoàn thành',  color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
  REJECTED:    { label: 'Từ chối',     color: 'text-red-700',     bg: 'bg-red-100',     icon: XCircle },
  CANCELLED:   { label: 'Đã hủy',      color: 'text-slate-500',   bg: 'bg-slate-100',   icon: XCircle },
};

const CATEGORY_LABEL: Record<TicketCategory, string> = {
  ELECTRICAL:      'Điện',
  PLUMBING:        'Nước',
  AIR_CONDITIONER: 'Điều hòa',
  DOOR_LOCK:       'Cửa/Khóa',
  FURNITURE:       'Nội thất',
  OTHER:           'Khác',
};

const CATEGORY_ICON_COLOR: Record<TicketCategory, string> = {
  ELECTRICAL:      'bg-yellow-100 text-yellow-600',
  PLUMBING:        'bg-blue-100 text-blue-600',
  AIR_CONDITIONER: 'bg-sky-100 text-sky-600',
  DOOR_LOCK:       'bg-slate-100 text-slate-600',
  FURNITURE:       'bg-amber-100 text-amber-600',
  OTHER:           'bg-purple-100 text-purple-600',
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

interface StudentStats {
  counts: { new: number; inProgress: number; completed: number; rejected: number; cancelled: number };
  openCount: number;
  openSlots: number;
}

export default function StudentTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading]         = useState(true);
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const limit = 20;

  useEffect(() => {
    api.get('/tickets/student/stats').then((r) => setStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const p = new URLSearchParams({ page: String(page), limit: String(limit), sortOrder: 'desc' });
        if (filterStatus)   p.append('status', filterStatus);
        if (filterCategory) p.append('category', filterCategory);
        const res = await api.get(`/tickets/student/my?${p}`);
        setTickets(res.data.data);
        setTotalPages(res.data.totalPages);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [page, filterStatus, filterCategory]);

  return (
    <StudentLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Báo sự cố</h1>
          <p className="text-sm text-slate-500 mt-1">Yêu cầu sửa chữa phòng ở</p>
        </div>
        <Link
          href="/student/tickets/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg"
        >
          <Plus className="w-4 h-4" /> Báo sự cố mới
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{stats.counts.new}</p>
              <p className="text-xs text-slate-500">Mới</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{stats.counts.inProgress}</p>
              <p className="text-xs text-slate-500">Đang xử lý</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{stats.counts.completed}</p>
              <p className="text-xs text-slate-500">Hoàn thành</p>
            </div>
          </div>
          <div className={`rounded-xl border p-4 flex items-center gap-3 ${stats.openSlots === 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${stats.openSlots === 0 ? 'bg-red-100' : 'bg-slate-50'}`}>
              <Ticket className={`w-4 h-4 ${stats.openSlots === 0 ? 'text-red-600' : 'text-slate-500'}`} />
            </div>
            <div>
              <p className={`text-lg font-bold ${stats.openSlots === 0 ? 'text-red-700' : 'text-slate-800'}`}>{stats.openSlots}/3</p>
              <p className={`text-xs ${stats.openSlots === 0 ? 'text-red-600' : 'text-slate-500'}`}>
                {stats.openSlots === 0 ? 'Đã đầy slot' : 'Slot còn lại'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending alert */}
      {stats && stats.openCount > 0 && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Bạn có {stats.openCount} sự cố đang chờ/xử lý
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Theo dõi tiến trình xử lý của ban quản lý KTX.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="NEW">Mới</option>
          <option value="IN_PROGRESS">Đang xử lý</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="REJECTED">Từ chối</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
        >
          <option value="">Tất cả loại</option>
          <option value="ELECTRICAL">Điện</option>
          <option value="PLUMBING">Nước</option>
          <option value="AIR_CONDITIONER">Điều hòa</option>
          <option value="DOOR_LOCK">Cửa/Khóa</option>
          <option value="FURNITURE">Nội thất</option>
          <option value="OTHER">Khác</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Chưa có yêu cầu nào</h3>
          <p className="text-sm text-slate-500 mb-5">Báo cáo sự cố khi phòng của bạn gặp vấn đề cần sửa chữa</p>
          <Link
            href="/student/tickets/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg"
          >
            <Plus className="w-4 h-4" /> Tạo yêu cầu đầu tiên
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {tickets.map((t) => {
              const sc = STATUS_CONFIG[t.status];
              const SIcon = sc.icon;
              const iconColor = CATEGORY_ICON_COLOR[t.category];
              const canRate = t.status === 'COMPLETED' && !t.rating;
              return (
                <Link
                  key={t.id}
                  href={`/student/tickets/${t.id}`}
                  className="block bg-white rounded-xl border border-slate-200 hover:border-amber-300 transition-colors"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                          <Wrench className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-xs font-medium text-slate-500">{t.code}</span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs text-slate-500">{CATEGORY_LABEL[t.category]}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800 truncate">{t.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Phòng {t.room.code} · {t.room.building.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${sc.bg} ${sc.color}`}>
                          <SIcon className="w-3 h-3" /> {sc.label}
                        </span>
                        <p className="text-xs text-slate-400 mt-1">{fmtDate(t.createdAt)}</p>
                        {canRate && (
                          <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1 justify-end">
                            <AlertTriangle className="w-3 h-3" /> Chưa đánh giá
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="px-4 pb-3 flex justify-end">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      Xem chi tiết <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5">
              <p className="text-sm text-slate-500">Trang {page}/{totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg">Trước</button>
                <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg">Sau</button>
              </div>
            </div>
          )}
        </>
      )}
    </StudentLayout>
  );
}

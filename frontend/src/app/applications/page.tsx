'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  FileText, Search, ChevronLeft, ChevronRight,
  Clock, CheckCircle, XCircle, Star, Home,
  Loader2, AlertCircle, Eye, CalendarRange,
  ArrowLeft,
} from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type PeriodStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED';

interface Period {
  id: number;
  code: string;
  name: string;
  academicYear: string;
  semester: number;
  status: PeriodStatus;
  startDate: string;
  endDate: string;
  totalApplications: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
}

interface Application {
  id: number;
  applicationType: 'NEW' | 'RENEWAL';
  status: ApplicationStatus;
  priorityScore: number;
  createdAt: string;
  student: {
    id: number;
    studentCode: string;
    fullName: string;
    gender: 'MALE' | 'FEMALE';
    className: string;
    faculty: string;
  };
  assignedRoom?: { id: number; code: string; buildingName: string };
}

interface PaginatedApps {
  data: Application[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_APP: Record<ApplicationStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  PENDING:   { label: 'Chờ duyệt', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   icon: Clock },
  APPROVED:  { label: 'Đã duyệt',  color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  REJECTED:  { label: 'Từ chối',   color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     icon: XCircle },
  CANCELLED: { label: 'Đã hủy',    color: 'text-slate-600',   bg: 'bg-slate-100',  border: 'border-slate-200',   icon: XCircle },
};

const PERIOD_STATUS: Record<PeriodStatus, { label: string; color: string; dot: string }> = {
  OPEN:      { label: 'Đang mở',  color: 'text-emerald-700', dot: 'bg-emerald-500' },
  CLOSED:    { label: 'Đã đóng',  color: 'text-slate-500',   dot: 'bg-slate-400' },
  DRAFT:     { label: 'Nháp',     color: 'text-blue-600',    dot: 'bg-blue-400' },
  CANCELLED: { label: 'Đã hủy',  color: 'text-red-500',     dot: 'bg-red-400' },
};

// ─── Period List View ─────────────────────────────────────────────────────────

function PeriodListView() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/registration-periods?limit=50&sortOrder=desc')
      .then((r) => setPeriods(r.data.data ?? r.data))
      .catch(() => setError('Không thể tải danh sách đợt'))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const totalPending = periods.reduce((s, p) => s + (p.pendingCount ?? 0), 0);

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Đơn đăng ký</h1>
          <p className="text-sm text-slate-500 mt-1">Chọn đợt đăng ký để xem danh sách đơn</p>
        </div>
        {totalPending > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 text-sm font-medium rounded-lg border border-amber-200">
            <Clock className="w-4 h-4" />
            {totalPending} đơn chờ duyệt
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p>{error}</p>
        </div>
      ) : periods.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <CalendarRange className="w-12 h-12 mb-3" />
          <p className="text-slate-500 font-medium">Chưa có đợt đăng ký nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {periods.map((period) => {
            const ps = PERIOD_STATUS[period.status] ?? PERIOD_STATUS.CLOSED;
            const total = period.totalApplications ?? 0;
            const pending = period.pendingCount ?? 0;
            const approved = period.approvedCount ?? 0;
            const rejected = period.rejectedCount ?? 0;

            return (
              <div key={period.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${ps.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ps.dot}`} />
                        {ps.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-800 truncate">{period.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {period.academicYear} • HK{period.semester}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-slate-800">{total}</p>
                    <p className="text-xs text-slate-500">đơn</p>
                  </div>
                </div>

                {/* Stats bar */}
                {total > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                      {approved > 0 && (
                        <div className="bg-emerald-500 rounded-full" style={{ width: `${(approved / total) * 100}%` }} />
                      )}
                      {pending > 0 && (
                        <div className="bg-amber-400 rounded-full" style={{ width: `${(pending / total) * 100}%` }} />
                      )}
                      {rejected > 0 && (
                        <div className="bg-red-400 rounded-full" style={{ width: `${(rejected / total) * 100}%` }} />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {approved > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{approved} duyệt</span>}
                      {pending > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />{pending} chờ</span>}
                      {rejected > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />{rejected} từ chối</span>}
                    </div>
                  </div>
                )}

                {total === 0 && (
                  <p className="text-sm text-slate-400 italic">Chưa có đơn nào</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    {formatDate(period.startDate)} → {formatDate(period.endDate)}
                  </p>
                  <Link
                    href={`/applications?periodId=${period.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Xem đơn
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Applications-by-Period View ──────────────────────────────────────────────

function PeriodApplicationsView({ periodId }: { periodId: string }) {
  const [apps, setApps] = useState<PaginatedApps | null>(null);
  const [period, setPeriod] = useState<Period | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const applySearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  useEffect(() => {
    api.get(`/registration-periods/${periodId}`)
      .then((res) => setPeriod(res.data))
      .catch(() => {});
  }, [periodId]);

  const fetchApps = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        periodId,
        page: String(page),
        limit: '20',
        sortBy: 'priorityScore',
        sortOrder: 'desc',
      });
      if (search) params.set('search', search);
      if (status) params.set('status', status);

      const appsRes = await api.get(`/applications?${params}`);
      setApps(appsRes.data);
    } catch {
      setError('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [periodId, page, search, status]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <>
      {/* Header */}
      <div className="mb-5">
        <Link href="/applications" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft className="w-4 h-4" />
          Tất cả đợt
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {period?.name ?? 'Đơn đăng ký'}
            </h1>
            {period && (
              <p className="text-sm text-slate-500 mt-0.5">
                {period.academicYear} • HK{period.semester} •{' '}
                {period.totalApplications ?? apps?.total ?? 0} đơn tổng cộng
              </p>
            )}
          </div>
          {period && (period.pendingCount ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 text-sm font-medium rounded-lg border border-amber-200">
              <Clock className="w-4 h-4" />
              {period.pendingCount} chờ duyệt
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm MSSV hoặc tên..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Từ chối</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
          <button
            onClick={applySearch}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Tìm kiếm
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <AlertCircle className="w-10 h-10 mb-2" /><p>{error}</p>
          </div>
        ) : !apps || apps.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FileText className="w-12 h-12 mb-3" />
            <p className="text-slate-500 font-medium">Không có đơn nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Sinh viên</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Khoa / Lớp</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Loại</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Điểm ưu tiên</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Trạng thái</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Phòng</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">Ngày nộp</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apps.data.map((app) => {
                  const sc = STATUS_APP[app.status];
                  const StatusIcon = sc.icon;
                  return (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                            app.student.gender === 'MALE' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                          }`}>
                            {app.student.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate max-w-[160px]">{app.student.fullName}</p>
                            <p className="text-xs text-slate-500">{app.student.studentCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-xs text-slate-600 truncate max-w-[140px]">{app.student.faculty || '—'}</p>
                        <p className="text-xs text-slate-400">{app.student.className || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {app.applicationType === 'NEW'
                          ? <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Mới</span>
                          : <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">Gia hạn</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {app.priorityScore}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${sc.bg} ${sc.color} ${sc.border}`}>
                          <StatusIcon className="w-3 h-3" />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {app.assignedRoom
                          ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Home className="w-3.5 h-3.5" />{app.assignedRoom.code} - {app.assignedRoom.buildingName}</span>
                          : <span className="text-xs text-slate-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-500 hidden sm:table-cell">
                        {formatDate(app.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/applications/${app.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Duyệt
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {apps && apps.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Trang {apps.page}/{apps.totalPages} • {apps.total} đơn
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              {Array.from({ length: Math.min(5, apps.totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(apps.totalPages - 4, page - 2)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage((p) => Math.min(apps.totalPages, p + 1))} disabled={page >= apps.totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Root Page ────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const searchParams = useSearchParams();
  const periodId = searchParams.get('periodId');

  return (
    <AdminLayout>
      {periodId ? <PeriodApplicationsView periodId={periodId} /> : <PeriodListView />}
    </AdminLayout>
  );
}

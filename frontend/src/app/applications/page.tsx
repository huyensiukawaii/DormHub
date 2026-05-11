'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  FileText, Search, ChevronLeft, ChevronRight,
  Clock, CheckCircle, XCircle, Star, Home,
  Loader2, AlertCircle, Eye, Filter,
} from 'lucide-react';
import { api } from '@/lib/api';

type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface Period {
  id: number;
  name: string;
  academicYear: string;
  semester: number;
  status: string;
  pendingCount: number;
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
  period: { id: number; name: string; academicYear: string; semester: number };
  assignedRoom?: { id: number; code: string; buildingName: string };
}

interface Paginated {
  data: Application[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUS_CFG: Record<ApplicationStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  PENDING:   { label: 'Chờ duyệt', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   icon: Clock },
  APPROVED:  { label: 'Đã duyệt',  color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  REJECTED:  { label: 'Từ chối',   color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     icon: XCircle },
  CANCELLED: { label: 'Đã hủy',    color: 'text-slate-600',   bg: 'bg-slate-100',  border: 'border-slate-200',   icon: XCircle },
};

function ApplicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters — đọc từ URL để share link được
  const [periodId, setPeriodId]   = useState(searchParams.get('periodId') ?? '');
  const [status,   setStatus]     = useState(searchParams.get('status')   ?? 'PENDING');
  const [search,   setSearch]     = useState(searchParams.get('search')   ?? '');
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [periods,  setPeriods]  = useState<Period[]>([]);
  const [result,   setResult]   = useState<Paginated | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  // Load periods cho dropdown
  useEffect(() => {
    api.get('/registration-periods?limit=50&sortOrder=desc')
      .then((r) => setPeriods(r.data.data ?? r.data))
      .catch(() => {});
  }, []);

  const fetchApps = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (periodId) params.set('periodId', periodId);
      if (status)   params.set('status', status);
      if (search)   params.set('search', search);
      // PENDING sort theo điểm giảm dần; còn lại sort theo ngày nộp mới nhất
      if (status === 'PENDING' || status === '') {
        params.set('sortBy', 'priorityScore');
        params.set('sortOrder', 'desc');
      } else {
        params.set('sortBy', 'createdAt');
        params.set('sortOrder', 'desc');
      }
      const res = await api.get(`/applications?${params}`);
      setResult(res.data);
    } catch {
      setError('Không thể tải danh sách đơn');
    } finally {
      setLoading(false);
    }
  }, [periodId, status, search, page]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  // Sync URL khi filter thay đổi
  useEffect(() => {
    const p = new URLSearchParams();
    if (periodId) p.set('periodId', periodId);
    if (status)   p.set('status', status);
    if (search)   p.set('search', search);
    router.replace(`/applications${p.toString() ? `?${p}` : ''}`, { scroll: false });
  }, [periodId, status, search]);

  const applySearch = () => { setSearch(searchInput); setPage(1); };

  const handleFilterChange = (key: 'periodId' | 'status', val: string) => {
    if (key === 'periodId') setPeriodId(val);
    if (key === 'status')   setStatus(val);
    setPage(1);
  };

  const totalPending = periods.reduce((s, p) => s + (p.pendingCount ?? 0), 0);

  const fd = (d: string) =>
    new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Đơn đăng ký</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý và duyệt đơn đăng ký ký túc xá</p>
        </div>
        {totalPending > 0 && (
          <button
            onClick={() => { handleFilterChange('status', 'PENDING'); setPeriodId(''); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-sm font-medium rounded-lg border border-amber-200 transition-colors"
          >
            <Clock className="w-4 h-4" />
            {totalPending} đơn chờ duyệt
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 space-y-3">
        {/* Row 1: search + period + button */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm MSSV hoặc tên sinh viên..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="relative shrink-0">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={periodId}
              onChange={(e) => handleFilterChange('periodId', e.target.value)}
              className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-[240px]"
            >
              <option value="">Tất cả đợt</option>
              {periods.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}{p.pendingCount > 0 ? ` (${p.pendingCount} chờ)` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={applySearch}
            className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Tìm
          </button>
        </div>

        {/* Row 2: status tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          {([
            { val: '',          label: 'Tất cả' },
            { val: 'PENDING',   label: 'Chờ duyệt' },
            { val: 'APPROVED',  label: 'Đã duyệt' },
            { val: 'REJECTED',  label: 'Từ chối' },
            { val: 'CANCELLED', label: 'Đã hủy' },
          ] as const).map((tab) => (
            <button
              key={tab.val}
              onClick={() => handleFilterChange('status', tab.val)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                status === tab.val
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      {result && !loading && (
        <p className="text-sm text-slate-500 mb-3">
          {result.total === 0 ? 'Không có đơn nào' : `${result.total} đơn`}
          {periodId && periods.find((p) => String(p.id) === periodId) && (
            <> trong <span className="font-medium text-slate-700">{periods.find((p) => String(p.id) === periodId)!.name}</span></>
          )}
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <AlertCircle className="w-10 h-10 mb-2" />
            <p>{error}</p>
          </div>
        ) : !result || result.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FileText className="w-12 h-12 mb-3" />
            <p className="text-slate-500 font-medium">Không có đơn nào</p>
            {status === 'PENDING' && (
              <p className="text-sm text-slate-400 mt-1">Tất cả đơn đã được xử lý</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Sinh viên</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Khoa / Lớp</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Đợt đăng ký</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Loại</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Điểm ưu tiên</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Trạng thái</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden xl:table-cell">Phòng</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">Ngày nộp</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.data.map((app) => {
                  const sc = STATUS_CFG[app.status];
                  const Icon = sc.icon;
                  return (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      {/* Sinh viên */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                            app.student.gender === 'MALE' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                          }`}>
                            {app.student.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <Link href={`/students/${app.student.id}`} className="font-medium text-slate-800 hover:text-emerald-600 truncate max-w-[160px] block">
                              {app.student.fullName}
                            </Link>
                            <p className="text-xs text-slate-500">{app.student.studentCode}</p>
                          </div>
                        </div>
                      </td>

                      {/* Khoa / Lớp */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-xs text-slate-600 truncate max-w-[140px]">{app.student.faculty || '—'}</p>
                        <p className="text-xs text-slate-400">{app.student.className || '—'}</p>
                      </td>

                      {/* Đợt */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-xs text-slate-700 font-medium truncate max-w-[180px]">{app.period?.name ?? '—'}</p>
                        {app.period && (
                          <p className="text-xs text-slate-400">{app.period.academicYear} HK{app.period.semester}</p>
                        )}
                      </td>

                      {/* Loại */}
                      <td className="px-4 py-3 text-center">
                        {app.applicationType === 'NEW'
                          ? <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Mới</span>
                          : <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">Gia hạn</span>
                        }
                      </td>

                      {/* Điểm */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {app.priorityScore}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${sc.bg} ${sc.color} ${sc.border}`}>
                          <Icon className="w-3 h-3" />
                          {sc.label}
                        </span>
                      </td>

                      {/* Phòng */}
                      <td className="px-4 py-3 hidden xl:table-cell">
                        {app.assignedRoom
                          ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Home className="w-3.5 h-3.5" />{app.assignedRoom.code} – {app.assignedRoom.buildingName}</span>
                          : <span className="text-xs text-slate-400">—</span>
                        }
                      </td>

                      {/* Ngày nộp */}
                      <td className="px-4 py-3 text-center text-xs text-slate-500 hidden sm:table-cell">
                        {fd(app.createdAt)}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/applications/${app.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {app.status === 'PENDING' ? 'Duyệt' : 'Xem'}
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
        {result && result.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Trang {result.page}/{result.totalPages} • {result.total} đơn
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              {Array.from({ length: Math.min(5, result.totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(result.totalPages - 4, page - 2)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      p === page ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
                disabled={page >= result.totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default function ApplicationsPageWrapper() { return <Suspense fallback={null}><ApplicationsPage /></Suspense>; }

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Loader2 as SpinnerFallback } from 'lucide-react';
import {
  ArrowRightLeft,
  Clock,
  CheckCircle,
  XCircle,
  X,
  Loader2,
  Search,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/timeAgo';

type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface TransferRequest {
  id: number;
  code: string;
  reason: string;
  status: TransferStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  student: { fullName: string; studentCode: string; gender: string };
  fromRoom: { id: number; code: string; building: { id: number; code: string; name: string } };
  toRoom: { id: number; code: string; building: { id: number; code: string; name: string } };
  reviewedBy: { fullName: string } | null;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  total: number;
}

const STATUS_CONFIG: Record<TransferStatus, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:   { label: 'Chờ duyệt',  color: 'text-amber-700',   bg: 'bg-amber-100',   icon: Clock },
  APPROVED:  { label: 'Đã duyệt',   color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
  REJECTED:  { label: 'Từ chối',    color: 'text-red-700',     bg: 'bg-red-100',     icon: XCircle },
  CANCELLED: { label: 'Đã hủy',     color: 'text-slate-500',   bg: 'bg-slate-100',   icon: X },
};

function AdminRoomTransfersContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(sp.get('search') ?? '');
  const [filterStatus, setFilterStatus] = useState(sp.get('status') ?? 'PENDING');

  // Review modal state
  const [reviewing, setReviewing] = useState<TransferRequest | null>(null);
  const [action, setAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const fetchAll = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (filterStatus) params.set('status', filterStatus);
      if (search) params.set('search', search);

      const [listRes, statsRes] = await Promise.all([
        api.get(`/room-transfers?${params}`),
        api.get('/room-transfers/stats'),
      ]);
      setRequests(listRes.data.data ?? []);
      setTotal(listRes.data.total ?? 0);
      setTotalPages(listRes.data.totalPages ?? 1);
      setPage(p);
      setStats(statsRes.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => {
    fetchAll(1);
  }, [fetchAll]);

  const handleReview = async () => {
    if (!reviewing) return;
    if (action === 'REJECTED' && !rejectionReason.trim()) {
      setReviewError('Vui lòng nhập lý do từ chối');
      return;
    }
    setSubmitting(true);
    setReviewError('');
    try {
      await api.patch(`/room-transfers/${reviewing.id}/review`, {
        action,
        rejectionReason: action === 'REJECTED' ? rejectionReason.trim() : undefined,
      });
      setReviewing(null);
      await fetchAll(page);
    } catch (err: any) {
      setReviewError(err.response?.data?.message ?? 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const openReview = (req: TransferRequest) => {
    setReviewing(req);
    setAction('APPROVED');
    setRejectionReason('');
    setReviewError('');
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Yêu cầu chuyển phòng</h1>
          <button
            onClick={() => fetchAll(page)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Chờ duyệt', value: stats.pending, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
              { label: 'Đã duyệt', value: stats.approved, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
              { label: 'Từ chối', value: stats.rejected, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
              { label: 'Đã hủy', value: stats.cancelled, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.bg}`}>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAll(1)}
              placeholder="Tìm MSSV, tên, mã yêu cầu..."
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-64"
            />
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {[
              { label: 'Chờ duyệt', value: 'PENDING' },
              { label: 'Tất cả', value: '' },
              { label: 'Đã duyệt', value: 'APPROVED' },
              { label: 'Từ chối', value: 'REJECTED' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterStatus(tab.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filterStatus === tab.value
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {tab.value === 'PENDING' && stats && stats.pending > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                    {stats.pending}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <ArrowRightLeft className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Không có yêu cầu nào</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Mã / Thời gian</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Sinh viên</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Từ phòng</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Đến phòng</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Trạng thái</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => {
                  const cfg = STATUS_CONFIG[req.status];
                  const Icon = cfg.icon;
                  return (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => router.push(`/room-transfers/${req.id}`)}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{req.code}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{timeAgo(req.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{req.student.fullName}</p>
                        <p className="text-xs text-slate-400">{req.student.studentCode}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700">{req.fromRoom.code}</p>
                        <p className="text-xs text-slate-400">{req.fromRoom.building.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700">{req.toRoom.code}</p>
                        <p className="text-xs text-slate-400">{req.toRoom.building.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${cfg.bg} ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                        {req.status === 'REJECTED' && req.rejectionReason && (
                          <p className="text-xs text-slate-400 mt-1 max-w-[160px] truncate" title={req.rejectionReason}>
                            {req.rejectionReason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {req.status === 'PENDING' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openReview(req); }}
                            className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors font-medium"
                          >
                            Xử lý
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{total} yêu cầu</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => fetchAll(page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                Trước
              </button>
              <span className="px-3 py-1.5">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => fetchAll(page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Xử lý yêu cầu chuyển phòng</h3>
              <button onClick={() => setReviewing(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Request summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <span className="font-medium">{reviewing.student.fullName}</span>
                  <span className="text-slate-400">—</span>
                  <span className="text-slate-500">{reviewing.student.studentCode}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="font-medium">{reviewing.fromRoom.code}</span>
                  <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium">{reviewing.toRoom.code}</span>
                  <span className="text-slate-400 text-xs">({reviewing.toRoom.building.name})</span>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">{reviewing.reason}</p>
              </div>

              {/* Action choice */}
              <div className="flex gap-2">
                <button
                  onClick={() => setAction('APPROVED')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                    action === 'APPROVED'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  Duyệt
                </button>
                <button
                  onClick={() => setAction('REJECTED')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                    action === 'REJECTED'
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  Từ chối
                </button>
              </div>

              {/* Rejection reason */}
              {action === 'REJECTED' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Lý do từ chối <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Nhập lý do từ chối..."
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
                  />
                </div>
              )}

              {reviewError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{reviewError}</p>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => setReviewing(null)}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleReview}
                  disabled={submitting}
                  className={`flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${
                    action === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {action === 'APPROVED' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function AdminRoomTransfersPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <SpinnerFallback className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      </AdminLayout>
    }>
      <AdminRoomTransfersContent />
    </Suspense>
  );
}

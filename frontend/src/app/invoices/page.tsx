'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Receipt, Search, Plus, ChevronRight, Loader2, AlertCircle,
  CheckCircle, Clock, XCircle, Ban, Eye, BadgeCheck, RefreshCw, X,
} from 'lucide-react';
import { api } from '@/lib/api';

type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
type InvoiceType = 'ROOM_FEE' | 'UTILITY';

interface Invoice {
  id: number;
  code: string;
  type: InvoiceType;
  status: InvoiceStatus;
  billingMonth: string;
  dueDate: string;
  totalAmount: string;
  electricityFee: string;
  waterFee: string;
  roomFee: string;
  paidAt: string | null;
  paymentProof: string | null;
  room: { id: number; code: string; building: { code: string; name: string } };
  contract: { id: number; code: string; studentId: number } | null;
}

interface Stats {
  month: string;
  counts: { pending: number; paid: number; overdue: number; cancelled: number; total: number };
  amounts: { total: number; electricity: number; water: number };
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:   { label: 'Chờ thanh toán', color: 'text-amber-700',   bg: 'bg-amber-100',   icon: Clock },
  PAID:      { label: 'Đã thanh toán',  color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
  OVERDUE:   { label: 'Quá hạn',        color: 'text-red-700',     bg: 'bg-red-100',     icon: AlertCircle },
  CANCELLED: { label: 'Đã hủy',         color: 'text-slate-500',   bg: 'bg-slate-100',   icon: Ban },
};

const TYPE_CONFIG: Record<InvoiceType, { label: string; color: string; bg: string }> = {
  ROOM_FEE: { label: 'Tiền phòng',  color: 'text-blue-700',   bg: 'bg-blue-100' },
  UTILITY:  { label: 'Tiện ích',    color: 'text-purple-700', bg: 'bg-purple-100' },
};

const fmt = (v: string | number) =>
  new Intl.NumberFormat('vi-VN').format(typeof v === 'string' ? parseFloat(v) : v) + ' đ';

const fmtMonth = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

function InvoicesPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const studentId = sp.get('studentId') ?? '';
  const roomId    = sp.get('roomId') ?? '';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType]   = useState('');
  const [filterMonth, setFilterMonth] = useState(studentId ? '' : thisMonth());

  // Reset filterMonth khi xóa filter student/room
  useEffect(() => {
    if (!studentId && !roomId) setFilterMonth(thisMonth());
  }, [studentId, roomId]);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);
  const limit = 20;

  // Batch create modal
  const [showBatch, setShowBatch]       = useState(false);
  const [batchMonth, setBatchMonth]     = useState(thisMonth());
  const [batchBuilding, setBatchBuilding] = useState('');
  const [buildings, setBuildings]       = useState<{ id: number; name: string }[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult]   = useState<any>(null);

  const fetchStats = useCallback(async () => {
    if (!filterMonth) return;
    try {
      const res = await api.get(`/invoices/stats?billingMonth=${filterMonth}`);
      setStats(res.data);
    } catch { /* ignore */ }
  }, [filterMonth]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const p = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search)       p.append('search', search);
      if (filterStatus) p.append('status', filterStatus);
      if (filterType)   p.append('type', filterType);
      if (filterMonth)  p.append('billingMonth', filterMonth);
      if (studentId)    p.append('studentId', studentId);
      else if (roomId)  p.append('roomId', roomId);
      const res = await api.get(`/invoices?${p}`);
      setInvoices(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterType, filterMonth, studentId, roomId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    api.get('/buildings').then((r) => setBuildings(r.data?.data ?? r.data ?? [])).catch(() => {});
  }, []);

  const handleConfirm = async (id: number) => {
    if (!confirm('Xác nhận đã nhận thanh toán cho hóa đơn này?')) return;
    try {
      await api.patch(`/invoices/${id}/confirm-payment`, {});
      fetchInvoices(); fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi xác nhận');
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Hủy hóa đơn này? Thao tác không thể hoàn tác.')) return;
    try {
      await api.patch(`/invoices/${id}/cancel`, {});
      fetchInvoices(); fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi hủy hóa đơn');
    }
  };

  const handleBatch = async () => {
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const body: any = { billingMonth: batchMonth };
      if (batchBuilding) body.buildingId = parseInt(batchBuilding);
      const res = await api.post('/invoices/batch', body);
      setBatchResult(res.data);
      fetchInvoices(); fetchStats();
    } catch (err: any) {
      setBatchResult({ error: err.response?.data?.message || 'Lỗi tạo hàng loạt' });
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hóa đơn</h1>
          {studentId ? (
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
              Đang lọc theo sinh viên
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">ID {studentId}</span>
              <button onClick={() => router.push('/invoices')} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
            </p>
          ) : roomId ? (
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
              Đang lọc theo phòng
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">ID {roomId}</span>
              <button onClick={() => router.push('/invoices')} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
            </p>
          ) : (
            <p className="text-sm text-slate-500 mt-1">Quản lý hóa đơn tiện ích ký túc xá</p>
          )}
        </div>
        <button
          onClick={() => { setBatchResult(null); setBatchMonth(thisMonth()); setBatchBuilding(''); setShowBatch(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
        >
          <Plus className="w-4 h-4" /> Tạo hóa đơn hàng loạt
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{stats.counts.total}</p>
            <p className="text-xs text-slate-500">Tổng tháng {fmtMonth(filterMonth)}</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.counts.pending}</p>
            <p className="text-xs text-amber-700">Chờ thanh toán</p>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.counts.paid}</p>
            <p className="text-xs text-emerald-700">Đã thanh toán</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.counts.overdue}</p>
            <p className="text-xs text-red-700">Quá hạn</p>
          </div>
          <div className="bg-purple-50 rounded-xl border border-purple-200 p-4 col-span-2 sm:col-span-4 lg:col-span-1 text-center">
            <p className="text-xl font-bold text-purple-700">{fmt(stats.amounts.total)}</p>
            <p className="text-xs text-purple-600">Tổng tiền tháng</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã hóa đơn, mã phòng..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <input
            type="month"
            value={filterMonth.slice(0, 7)}
            onChange={(e) => { setFilterMonth(e.target.value ? e.target.value + '-01' : ''); setPage(1); }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          />
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="">Tất cả loại</option>
            <option value="UTILITY">Tiện ích</option>
            <option value="ROOM_FEE">Tiền phòng</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ thanh toán</option>
            <option value="PAID">Đã thanh toán</option>
            <option value="OVERDUE">Quá hạn</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
          <button
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterType(''); setFilterMonth(thisMonth()); setPage(1); }}
            className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
          >
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
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Mã HD</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Phòng</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Loại</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Tháng</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase px-4 py-3">Số tiền</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Trạng thái</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => {
                    const sc = STATUS_CONFIG[inv.status];
                    const tc = TYPE_CONFIG[inv.type];
                    const SIcon = sc.icon;
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => router.push(`/invoices/${inv.id}`)}
                            className="text-sm font-semibold text-slate-800 hover:text-emerald-600 flex items-center gap-1"
                          >
                            {inv.code} <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800">{inv.room.code}</p>
                          <p className="text-xs text-slate-500">{inv.room.building.name}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${tc.bg} ${tc.color}`}>
                            {tc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <p className="text-sm text-slate-700">{fmtMonth(inv.billingMonth)}</p>
                          <p className="text-xs text-slate-400">Hạn: {fmtDate(inv.dueDate)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-semibold text-slate-800">{fmt(inv.totalAmount)}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${sc.bg} ${sc.color}`}>
                            <SIcon className="w-3 h-3" /> {sc.label}
                          </span>
                          {inv.paymentProof && inv.status === 'PENDING' && (
                            <p className="text-xs text-blue-600 mt-0.5">Có minh chứng</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => router.push(`/invoices/${inv.id}`)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {(inv.status === 'PENDING' || inv.status === 'OVERDUE') && (
                              <button
                                onClick={() => handleConfirm(inv.id)}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                title="Xác nhận thanh toán"
                              >
                                <BadgeCheck className="w-4 h-4" />
                              </button>
                            )}
                            {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleCancel(inv.id)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="Hủy hóa đơn"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {invoices.length === 0 && (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Không có hóa đơn nào</p>
                  {studentId && (
                    <p className="text-xs text-slate-400 mt-1">Sinh viên này có thể ở tòa nhà bạn không được phân quyền quản lý</p>
                  )}
                </div>
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <p className="text-sm text-slate-500">Trang {page}/{totalPages} ({total} hóa đơn)</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg">Trước</button>
                  <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg">Sau</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Batch Create Modal */}
      {showBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { if (!batchLoading) setShowBatch(false); }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Tạo hóa đơn tiện ích hàng loạt</h3>
              <button onClick={() => setShowBatch(false)} disabled={batchLoading} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tháng hóa đơn</label>
                <input
                  type="month"
                  value={batchMonth.slice(0, 7)}
                  onChange={(e) => setBatchMonth(e.target.value + '-01')}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tòa nhà <span className="text-slate-400 font-normal text-xs">(để trống = tất cả tòa)</span>
                </label>
                <select
                  value={batchBuilding}
                  onChange={(e) => setBatchBuilding(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">-- Tất cả tòa --</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {batchResult && (
                <div className={`p-3 rounded-lg text-sm ${batchResult.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}`}>
                  {batchResult.error ? batchResult.error : (
                    <>
                      <p className="font-semibold">{batchResult.message}</p>
                      {batchResult.results?.filter((r: any) => !r.success).length > 0 && (
                        <ul className="mt-2 space-y-0.5 text-xs">
                          {batchResult.results.filter((r: any) => !r.success).map((r: any, i: number) => (
                            <li key={i} className="text-red-600">Phòng {r.roomCode}: {r.error}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBatch(false)}
                  disabled={batchLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleBatch}
                  disabled={batchLoading || !batchMonth}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 rounded-lg flex items-center justify-center gap-2"
                >
                  {batchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Tạo hóa đơn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function InvoicesPageWrapper() { return <Suspense fallback={null}><InvoicesPage /></Suspense>; }

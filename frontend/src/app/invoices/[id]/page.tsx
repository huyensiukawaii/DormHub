'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  ArrowLeft, Receipt, CheckCircle, Clock, AlertCircle, Ban,
  Loader2, BadgeCheck, XCircle, Zap, Droplets, Home, Image,
  ChevronRight, X, ThumbsDown,
} from 'lucide-react';
import { api } from '@/lib/api';

type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
type InvoiceType = 'ROOM_FEE' | 'UTILITY';

interface InvoiceDetail {
  id: number;
  code: string;
  type: InvoiceType;
  status: InvoiceStatus;
  billingMonth: string;
  dueDate: string;
  roomFee: string;
  electricityFee: string;
  waterFee: string;
  totalAmount: string;
  electricityUsage: string;
  waterUsage: string;
  occupantsCount: number;
  paymentProof: string | null;
  paidAt: string | null;
  approvedAt: string | null;
  rejectionNote: string | null;
  rejectedAt: string | null;
  createdAt: string;
  room: { id: number; code: string; floor: number; building: { id: number; code: string; name: string } };
  contract: { id: number; code: string; studentId: number } | null;
  approvedBy: { id: number; fullName: string } | null;
  breakdown: {
    electricity: { breakdown: { tier: number; range: string; kWh: number; price: number; cost: number }[]; totalCost: number; avgPrice: number };
    water: { breakdown: { quotaFee: number; overQuotaFee: number; quota: number; used: number; overUsed: number }; totalCost: number };
  } | null;
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  PENDING:   { label: 'Chờ thanh toán', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200', icon: Clock },
  PAID:      { label: 'Đã thanh toán',  color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  OVERDUE:   { label: 'Quá hạn',        color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',   icon: AlertCircle },
  CANCELLED: { label: 'Đã hủy',         color: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200', icon: Ban },
};

const fmt = (v: string | number) =>
  new Intl.NumberFormat('vi-VN').format(typeof v === 'string' ? parseFloat(v) : v) + ' đ';

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const fmtMonth = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject modal state
  const [showReject, setShowReject] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectError, setRejectError] = useState('');

  useEffect(() => {
    api.get(`/invoices/${id}`)
      .then((r) => setInvoice(r.data))
      .catch(() => router.push('/invoices'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleConfirm = async () => {
    if (!confirm('Xác nhận đã nhận thanh toán?')) return;
    setActionLoading(true);
    try {
      const r = await api.patch(`/invoices/${id}/confirm-payment`, {});
      setInvoice(r.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi xác nhận');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Hủy hóa đơn? Thao tác không thể hoàn tác.')) return;
    setActionLoading(true);
    try {
      const r = await api.patch(`/invoices/${id}/cancel`, {});
      setInvoice(r.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi hủy hóa đơn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectNote.trim()) return;
    setRejectLoading(true);
    setRejectError('');
    try {
      const r = await api.patch(`/invoices/${id}/reject-proof`, { rejectionNote: rejectNote.trim() });
      setInvoice(r.data);
      setShowReject(false);
      setRejectNote('');
    } catch (err: any) {
      setRejectError(err.response?.data?.message || 'Lỗi từ chối minh chứng');
    } finally {
      setRejectLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!invoice) return null;

  const sc = STATUS_CONFIG[invoice.status];
  const SIcon = sc.icon;
  const canReject = invoice.paymentProof &&
    (invoice.status === 'PENDING' || invoice.status === 'OVERDUE');

  return (
    <AdminLayout>
      {/* Back + Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/invoices')} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-800">{invoice.code}</h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full ${sc.bg} ${sc.color} border ${sc.border}`}>
              <SIcon className="w-3.5 h-3.5" /> {sc.label}
            </span>
            <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${invoice.type === 'UTILITY' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {invoice.type === 'UTILITY' ? 'Tiện ích' : 'Tiền phòng'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Tháng {fmtMonth(invoice.billingMonth)} · Phòng {invoice.room.code} · {invoice.room.building.name}
          </p>
        </div>
        {/* Actions */}
        <div className="flex gap-2 flex-wrap justify-end">
          {(invoice.status === 'PENDING' || invoice.status === 'OVERDUE') && (
            <button
              onClick={handleConfirm}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
              Xác nhận
            </button>
          )}
          {canReject && (
            <button
              onClick={() => { setRejectNote(''); setRejectError(''); setShowReject(true); }}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 text-sm font-medium rounded-lg disabled:opacity-60"
            >
              <ThumbsDown className="w-4 h-4" /> Từ chối
            </button>
          )}
          {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg disabled:opacity-60"
            >
              <XCircle className="w-4 h-4" /> Hủy
            </button>
          )}
        </div>
      </div>

      {/* Rejection history banner */}
      {invoice.rejectionNote && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
          <ThumbsDown className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Đã từ chối minh chứng trước đó</p>
            <p className="text-sm text-orange-700 mt-0.5">{invoice.rejectionNote}</p>
            {invoice.rejectedAt && (
              <p className="text-xs text-orange-500 mt-0.5">{fmtDate(invoice.rejectedAt)}</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Tổng tiền</h2>
            <div className="space-y-3">
              {invoice.type === 'ROOM_FEE' ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Home className="w-4 h-4 text-blue-500" /> Tiền phòng
                    </div>
                    <span className="text-sm font-medium">{fmt(invoice.roomFee)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Droplets className="w-4 h-4 text-cyan-500" /> Nước (khoán)
                    </div>
                    <span className="text-sm font-medium">{fmt(invoice.waterFee)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Zap className="w-4 h-4 text-yellow-500" /> Tiền điện ({Number(invoice.electricityUsage).toFixed(1)} kWh)
                    </div>
                    <span className="text-sm font-medium">{fmt(invoice.electricityFee)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Droplets className="w-4 h-4 text-cyan-500" /> Nước vượt định mức ({Number(invoice.waterUsage).toFixed(2)} m³)
                    </div>
                    <span className="text-sm font-medium">{fmt(invoice.waterFee)}</span>
                  </div>
                  <div className="text-xs text-slate-400 pl-6">{invoice.occupantsCount} người ở</div>
                </>
              )}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Tổng cộng</span>
                <span className="text-xl font-bold text-slate-800">{fmt(invoice.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Electricity breakdown */}
          {invoice.breakdown?.electricity && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" /> Chi tiết tiền điện
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left font-medium text-slate-500 pb-2">Bậc</th>
                      <th className="text-right font-medium text-slate-500 pb-2">Sử dụng (kWh)</th>
                      <th className="text-right font-medium text-slate-500 pb-2">Đơn giá</th>
                      <th className="text-right font-medium text-slate-500 pb-2">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {invoice.breakdown.electricity.breakdown.filter((t) => t.kWh > 0).map((tier) => (
                      <tr key={tier.tier}>
                        <td className="py-2 text-slate-600">Bậc {tier.tier} ({tier.range} kWh)</td>
                        <td className="py-2 text-right text-slate-700">{tier.kWh.toFixed(1)}</td>
                        <td className="py-2 text-right text-slate-700">{fmt(tier.price)}/kWh</td>
                        <td className="py-2 text-right font-medium">{fmt(tier.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200">
                      <td colSpan={3} className="pt-2 font-semibold text-slate-700">Tổng tiền điện</td>
                      <td className="pt-2 text-right font-bold text-slate-800">{fmt(invoice.breakdown.electricity.totalCost)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Water breakdown */}
          {invoice.breakdown?.water && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-500" /> Chi tiết tiền nước
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Trong định mức ({Math.min(invoice.breakdown.water.breakdown.used, invoice.breakdown.water.breakdown.quota).toFixed(2)} m³)</span>
                  <span className="font-medium text-emerald-600">Miễn phí</span>
                </div>
                {invoice.breakdown.water.breakdown.overUsed > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Vượt định mức ({invoice.breakdown.water.breakdown.overUsed.toFixed(2)} m³)</span>
                    <span className="font-medium">{fmt(invoice.breakdown.water.breakdown.overQuotaFee)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-100 flex justify-between">
                  <span className="font-semibold text-slate-700">Tổng tiền nước</span>
                  <span className="font-bold text-slate-800">{fmt(invoice.breakdown.water.totalCost)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment proof */}
          {invoice.paymentProof && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                  <Image className="w-4 h-4" /> Minh chứng thanh toán
                </h2>
                {canReject && (
                  <button
                    onClick={() => { setRejectNote(''); setRejectError(''); setShowReject(true); }}
                    className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" /> Từ chối ảnh này
                  </button>
                )}
              </div>
              <a href={invoice.paymentProof} target="_blank" rel="noopener noreferrer">
                <img
                  src={invoice.paymentProof}
                  alt="Minh chứng"
                  className="max-h-64 rounded-lg border border-slate-200 object-contain hover:opacity-90 transition-opacity cursor-zoom-in"
                />
              </a>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Thông tin</h2>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Phòng</dt>
                <dd className="font-medium text-slate-800">{invoice.room.code} – {invoice.room.building.name}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Tháng hóa đơn</dt>
                <dd className="font-medium">{fmtMonth(invoice.billingMonth)}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Hạn thanh toán</dt>
                <dd className={`font-medium ${invoice.status === 'OVERDUE' ? 'text-red-600' : ''}`}>{fmtDate(invoice.dueDate)}</dd>
              </div>
              {invoice.paidAt && (
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Ngày thanh toán</dt>
                  <dd className="font-medium text-emerald-700">{fmtDate(invoice.paidAt)}</dd>
                </div>
              )}
              {invoice.approvedBy && (
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Xác nhận bởi</dt>
                  <dd className="font-medium">{invoice.approvedBy.fullName}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Contract link */}
          {invoice.contract && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Hợp đồng liên kết</h2>
              <button
                onClick={() => router.push(`/contracts/${invoice.contract!.id}`)}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <span className="text-sm font-medium text-slate-700">{invoice.contract.code}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          )}

          {/* Status card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Trạng thái</h2>
            <div className={`flex items-start gap-3 p-3 rounded-lg ${sc.bg} border ${sc.border}`}>
              <SIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${sc.color}`} />
              <div>
                <p className={`text-sm font-semibold ${sc.color}`}>{sc.label}</p>
                {invoice.status === 'PENDING' && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {invoice.paymentProof ? 'Đã có minh chứng – chờ xác nhận' : 'Chưa có minh chứng'}
                  </p>
                )}
                {invoice.status === 'OVERDUE' && (
                  <p className="text-xs text-red-500 mt-0.5">Quá hạn {fmtDate(invoice.dueDate)}</p>
                )}
                {invoice.status === 'PAID' && invoice.paidAt && (
                  <p className="text-xs text-slate-500 mt-0.5">Thanh toán lúc: {fmtDate(invoice.paidAt)}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Proof Modal */}
      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { if (!rejectLoading) setShowReject(false); }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Từ chối minh chứng</h3>
              <button onClick={() => setShowReject(false)} disabled={rejectLoading} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleReject} className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                Sinh viên sẽ nhận được lý do từ chối và được yêu cầu nộp lại minh chứng mới.
              </p>
              {rejectError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{rejectError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Lý do từ chối <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Ví dụ: Ảnh mờ, không thấy thông tin giao dịch, sai số tài khoản..."
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                  disabled={rejectLoading}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReject(false)}
                  disabled={rejectLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={rejectLoading || !rejectNote.trim()}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 rounded-lg flex items-center justify-center gap-2"
                >
                  {rejectLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />}
                  Từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

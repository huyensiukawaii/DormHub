'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StudentLayout from '@/components/layouts/StudentLayout';
import {
  ArrowLeft, CheckCircle, Clock, AlertCircle, Ban, Loader2,
  Zap, Droplets, Home, Upload, X, Crown, Copy, QrCode, XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

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
  rejectionNote: string | null;
  rejectedAt: string | null;
  room: { id: number; code: string; floor: number; building: { name: string } };
  contract: { id: number; code: string; studentId: number } | null;
  approvedBy: { fullName: string } | null;
  breakdown: {
    electricity: { breakdown: { tier: number; range: string; kWh: number; price: number; cost: number }[]; totalCost: number; avgPrice: number };
    water: { breakdown: { quotaFee: number; overQuotaFee: number; quota: number; used: number; overUsed: number }; totalCost: number };
  } | null;
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  PENDING:   { label: 'Chờ thanh toán', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',  icon: Clock },
  PAID:      { label: 'Đã thanh toán',  color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  OVERDUE:   { label: 'Quá hạn',        color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',    icon: AlertCircle },
  CANCELLED: { label: 'Đã hủy',         color: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200',  icon: Ban },
};

const BANK_QR_URL = 'https://res.cloudinary.com/dfouucs9m/image/upload/v1778422885/9216b6a3-dce5-473e-893b-9a5bb85fbbdd_ojwfr4.jpg';

const fmt = (v: string | number) =>
  new Intl.NumberFormat('vi-VN').format(typeof v === 'string' ? parseFloat(v) : v) + ' đ';

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const fmtMonth = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

const getPaymentContent = (roomCode: string, billingMonth: string) => {
  const d = new Date(billingMonth);
  return `${roomCode} T${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
};

export default function StudentInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRoomLeader, setIsRoomLeader]   = useState(false);
  const [isActiveMember, setIsActiveMember] = useState(false);
  const [copied, setCopied] = useState(false);

  // Upload proof state
  const [showUpload, setShowUpload]     = useState(false);
  const [proofFile, setProofFile]       = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState('');
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState('');

  useEffect(() => {
    api.get(`/invoices/student/my/${id}`)
      .then((r) => {
        setInvoice(r.data);
        const user = getStoredUser();
        if (user?.role === 'STUDENT') {
          api.get('/student/contracts')
            .then((cr) => {
              const roomId = r.data.roomId;
              const activeContract = cr.data.find((c: any) => c.status === 'ACTIVE' && c.roomId === roomId);
              const leaderContract = cr.data.find(
                (c: any) => ['ACTIVE', 'EXPIRED'].includes(c.status) && c.roomId === roomId && c.isRoomLeader,
              );
              setIsActiveMember(!!activeContract);
              setIsRoomLeader(!!leaderContract);
            })
            .catch(() => {});
        }
      })
      .catch(() => router.push('/student/invoices'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    setProofFile(file);
    setUploadError('');
  };

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile) return;
    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('file', proofFile);
      const uploadRes = await api.post('/invoices/student/upload-proof-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url: string = uploadRes.data.url;
      const r = await api.patch(`/invoices/student/my/${id}/upload-proof`, { paymentProof: url });
      setInvoice(r.data);
      setShowUpload(false);
      setProofFile(null);
      setProofPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return ''; });
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Không thể gửi minh chứng');
    } finally {
      setUploading(false);
    }
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const closeUpload = () => {
    if (uploading) return;
    setShowUpload(false);
    setProofFile(null);
    setProofPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return ''; });
    setUploadError('');
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </StudentLayout>
    );
  }

  if (!invoice) return null;

  const sc = STATUS_CONFIG[invoice.status];
  const SIcon = sc.icon;
  const needsPayment = invoice.status === 'PENDING' || invoice.status === 'OVERDUE';
  const canUploadProof = isRoomLeader && invoice.type === 'UTILITY' && needsPayment;
  const paymentContent = getPaymentContent(invoice.room.code, invoice.billingMonth);

  return (
    <StudentLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/student/invoices')} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-800">{invoice.code}</h1>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${sc.bg} ${sc.color} ${sc.border}`}>
              <SIcon className="w-3 h-3" /> {sc.label}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {invoice.type === 'UTILITY' ? 'Hóa đơn tiện ích' : 'Hóa đơn tiền phòng'} – Tháng {fmtMonth(invoice.billingMonth)}
          </p>
        </div>
      </div>

      <div className="space-y-5">

        {/* Rejection banner */}
        {invoice.rejectionNote && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Minh chứng bị từ chối</p>
              <p className="text-sm text-red-700 mt-0.5">{invoice.rejectionNote}</p>
              {canUploadProof && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg"
                >
                  <Upload className="w-3.5 h-3.5" /> Nộp lại minh chứng
                </button>
              )}
            </div>
          </div>
        )}

        {/* Status banner (no rejection note) */}
        {needsPayment && !invoice.rejectionNote && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${sc.bg} ${sc.border}`}>
            <SIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${sc.color}`} />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${sc.color}`}>
                {invoice.status === 'OVERDUE' ? 'Hóa đơn đã quá hạn!' : 'Hóa đơn chưa thanh toán'}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Hạn thanh toán: <span className={invoice.status === 'OVERDUE' ? 'font-semibold text-red-600' : ''}>{fmtDate(invoice.dueDate)}</span>
              </p>
              {invoice.type === 'UTILITY' && (
                <p className="text-xs mt-1">
                  {!isActiveMember
                    ? <span className="text-slate-400">Đây là hóa đơn từ phòng cũ – bạn không còn ở đây nữa.</span>
                    : isRoomLeader
                      ? <span className="text-amber-700 font-medium">Bạn là trưởng phòng – hãy nộp minh chứng sau khi chuyển khoản.</span>
                      : <span className="text-slate-500">Trưởng phòng sẽ nộp minh chứng thanh toán cho cả phòng.</span>
                  }
                </p>
              )}
            </div>
            {canUploadProof && !invoice.paymentProof && (
              <button
                onClick={() => setShowUpload(true)}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg"
              >
                <Upload className="w-3.5 h-3.5" /> Nộp minh chứng
              </button>
            )}
          </div>
        )}

        {/* Proof uploaded – waiting approval */}
        {needsPayment && invoice.paymentProof && !invoice.rejectionNote && (
          <div className="p-3 rounded-xl border border-blue-200 bg-blue-50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <p className="text-sm text-blue-700">Minh chứng đã nộp – đang chờ nhân viên xác nhận</p>
          </div>
        )}

        {/* Room leader badge for PAID */}
        {invoice.type === 'UTILITY' && isRoomLeader && isActiveMember && invoice.status === 'PAID' && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <Crown className="w-4 h-4 text-amber-600" />
            Bạn là trưởng phòng của phòng này.
          </div>
        )}

        {/* Amount */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Số tiền</h2>
          <div className="space-y-3">
            {invoice.type === 'ROOM_FEE' ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600"><Home className="w-4 h-4 text-blue-500" /> Tiền phòng</span>
                  <span className="font-medium">{fmt(invoice.roomFee)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600"><Droplets className="w-4 h-4 text-cyan-500" /> Nước (khoán)</span>
                  <span className="font-medium">{fmt(invoice.waterFee)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600"><Zap className="w-4 h-4 text-yellow-500" /> Điện ({Number(invoice.electricityUsage).toFixed(1)} kWh)</span>
                  <span className="font-medium">{fmt(invoice.electricityFee)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600"><Droplets className="w-4 h-4 text-cyan-500" /> Nước vượt mức ({Number(invoice.waterUsage).toFixed(2)} m³)</span>
                  <span className="font-medium">{fmt(invoice.waterFee)}</span>
                </div>
                <p className="text-xs text-slate-400 pl-6">{invoice.occupantsCount} người ở trong phòng</p>
              </>
            )}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Tổng cộng</span>
              <span className="text-2xl font-bold text-slate-800">{fmt(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Bank transfer info — show for unpaid UTILITY invoices of active members */}
        {invoice.type === 'UTILITY' && needsPayment && isActiveMember && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
              <QrCode className="w-4 h-4" /> Thông tin chuyển khoản
            </h2>
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {/* QR Code */}
              <div className="flex-shrink-0">
                <a href={BANK_QR_URL} target="_blank" rel="noopener noreferrer">
                  <img
                    src={BANK_QR_URL}
                    alt="QR chuyển khoản"
                    className="w-44 h-44 object-contain rounded-xl border border-slate-200 hover:opacity-90 cursor-zoom-in"
                  />
                </a>
              </div>
              {/* Details */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Nội dung chuyển khoản</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-semibold text-slate-800 select-all">
                      {paymentContent}
                    </code>
                    <button
                      onClick={() => copyContent(paymentContent)}
                      className={`p-2 rounded-lg border transition-colors ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                      title="Sao chép"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  {copied && <p className="text-xs text-emerald-600 mt-1">Đã sao chép!</p>}
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Số tiền</p>
                  <p className="text-lg font-bold text-slate-800">{fmt(invoice.totalAmount)}</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    Nhập <span className="font-semibold">đúng nội dung</span> khi chuyển khoản để hệ thống xác nhận tự động.
                    Sau khi chuyển, trưởng phòng cần <span className="font-semibold">nộp ảnh minh chứng</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Electricity breakdown */}
        {invoice.breakdown?.electricity && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" /> Chi tiết tiền điện
            </h2>
            <div className="space-y-2">
              {invoice.breakdown.electricity.breakdown.filter((t) => t.kWh > 0).map((tier, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-600">Bậc {tier.tier} ({tier.range}): {tier.kWh.toFixed(1)} kWh × {fmt(tier.price)}</span>
                  <span className="font-medium">{fmt(tier.cost)}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100 flex justify-between text-sm">
                <span className="font-semibold text-slate-700">Tổng điện</span>
                <span className="font-bold">{fmt(invoice.breakdown.electricity.totalCost)}</span>
              </div>
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
                <span className="text-slate-600">Trong định mức ({invoice.breakdown.water.breakdown.used.toFixed(2)} m³)</span>
                <span className="font-medium text-emerald-600">{fmt(invoice.breakdown.water.breakdown.quotaFee)}</span>
              </div>
              {invoice.breakdown.water.breakdown.overUsed > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Vượt định mức ({invoice.breakdown.water.breakdown.overUsed.toFixed(2)} m³)</span>
                  <span className="font-medium">{fmt(invoice.breakdown.water.breakdown.overQuotaFee)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment proof */}
        {invoice.paymentProof && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                <Upload className="w-4 h-4" /> Minh chứng thanh toán
              </h2>
              {canUploadProof && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium underline"
                >
                  Cập nhật ảnh
                </button>
              )}
            </div>
            <a href={invoice.paymentProof} target="_blank" rel="noopener noreferrer">
              <img
                src={invoice.paymentProof}
                alt="Minh chứng"
                className="max-h-60 rounded-lg border border-slate-200 object-contain hover:opacity-90 cursor-zoom-in"
              />
            </a>
          </div>
        )}

        {/* Paid confirmation */}
        {invoice.status === 'PAID' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Đã thanh toán thành công</p>
              {invoice.paidAt && <p className="text-xs text-emerald-700 mt-0.5">Ngày: {fmtDate(invoice.paidAt)}</p>}
              {invoice.approvedBy && <p className="text-xs text-emerald-600">Xác nhận bởi: {invoice.approvedBy.fullName}</p>}
            </div>
          </div>
        )}

        {/* Cancelled */}
        {invoice.status === 'CANCELLED' && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <Ban className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-500">Hóa đơn đã bị hủy.</p>
          </div>
        )}
      </div>

      {/* Upload proof modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeUpload} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                {invoice.rejectionNote ? 'Nộp lại minh chứng' : 'Nộp minh chứng thanh toán'}
              </h3>
              <button onClick={closeUpload} disabled={uploading} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleUploadProof} className="p-5 space-y-4">
              {invoice.rejectionNote && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <span className="font-semibold">Lý do từ chối trước: </span>{invoice.rejectionNote}
                </div>
              )}
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                  {uploadError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ảnh minh chứng chuyển khoản <span className="text-red-500">*</span>
                </label>
                <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl cursor-pointer transition-colors
                  ${proofFile ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50 hover:border-amber-300 hover:bg-amber-50/50'}`}>
                  {proofPreview ? (
                    <div className="relative w-full p-3">
                      <img src={proofPreview} alt="Preview" className="max-h-52 w-full rounded-lg object-contain" />
                      <p className="text-xs text-center text-slate-500 mt-2 truncate">{proofFile?.name}</p>
                    </div>
                  ) : (
                    <div className="py-8 flex flex-col items-center gap-2 text-slate-400">
                      <Upload className="w-8 h-8" />
                      <span className="text-sm font-medium text-slate-600">Nhấn để chọn ảnh</span>
                      <span className="text-xs">JPG, PNG, WEBP – tối đa 10MB</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>
                {proofFile && (
                  <button type="button" onClick={() => { setProofFile(null); setProofPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return ''; }); }} className="mt-1.5 text-xs text-slate-400 hover:text-red-500">
                    Chọn lại ảnh khác
                  </button>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeUpload} disabled={uploading} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">
                  Hủy
                </button>
                <button type="submit" disabled={uploading || !proofFile} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 rounded-lg flex items-center justify-center gap-2">
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Gửi minh chứng</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  ArrowRightLeft, ArrowLeft, Clock, CheckCircle, XCircle, X,
  User, DoorOpen, Wind, Calendar, Loader2, Building2,
} from 'lucide-react';
import { api } from '@/lib/api';

type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface TransferDetail {
  id: number;
  code: string;
  reason: string;
  status: TransferStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    fullName: string;
    studentCode: string;
    gender: string;
    phone: string | null;
    faculty: string;
    className: string;
  };
  fromRoom: {
    id: number; code: string; floor: number; roomType: string;
    capacity: number; pricePerMonth: string;
    building: { name: string };
    contracts: { id: number }[];
  };
  toRoom: {
    id: number; code: string; floor: number; roomType: string;
    capacity: number; pricePerMonth: string;
    building: { name: string };
    contracts: { id: number }[];
  };
  reviewedBy: { fullName: string } | null;
}

const STATUS_CONFIG: Record<TransferStatus, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:   { label: 'Chờ duyệt', color: 'text-amber-700',   bg: 'bg-amber-100',   icon: Clock },
  APPROVED:  { label: 'Đã duyệt',  color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
  REJECTED:  { label: 'Từ chối',   color: 'text-red-700',     bg: 'bg-red-100',     icon: XCircle },
  CANCELLED: { label: 'Đã hủy',   color: 'text-slate-500',   bg: 'bg-slate-100',   icon: X },
};

const ROOM_TYPE_LABEL: Record<string, string> = {
  STANDARD:        'Thường',
  AIR_CONDITIONED: 'Điều hòa',
  PREMIUM:         'Cao cấp',
};

function fmt(n: number | string) {
  return Number(n).toLocaleString('vi-VN') + 'đ';
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

export default function RoomTransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [detail, setDetail] = useState<TransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Review state
  const [action, setAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    api.get(`/room-transfers/${id}`)
      .then((res) => setDetail(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleReview = async () => {
    if (action === 'REJECTED' && !rejectionReason.trim()) {
      setReviewError('Vui lòng nhập lý do từ chối');
      return;
    }
    setSubmitting(true);
    setReviewError('');
    try {
      await api.patch(`/room-transfers/${id}/review`, {
        action,
        rejectionReason: action === 'REJECTED' ? rejectionReason.trim() : undefined,
      });
      const res = await api.get(`/room-transfers/${id}`);
      setDetail(res.data);
    } catch (err: any) {
      setReviewError(err.response?.data?.message ?? 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
        </div>
      </AdminLayout>
    );
  }

  if (notFound || !detail) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <ArrowRightLeft className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Không tìm thấy yêu cầu</p>
          <Link href="/room-transfers" className="mt-4 text-sm text-emerald-600 hover:underline">
            Quay lại danh sách
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const cfg = STATUS_CONFIG[detail.status];
  const StatusIcon = cfg.icon;
  const priceDiff = Number(detail.toRoom.pricePerMonth) - Number(detail.fromRoom.pricePerMonth);

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Back + header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg font-bold text-slate-800">{detail.code}</h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${cfg.bg} ${cfg.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {cfg.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Tạo lúc {fmtDate(detail.createdAt)}</p>
          </div>
        </div>

        {/* Student info */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{detail.student.fullName}</p>
              <p className="text-xs text-slate-500">{detail.student.studentCode} · {detail.student.className} · {detail.student.faculty}</p>
            </div>
          </div>
        </div>

        {/* Room comparison */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Chi tiết chuyển phòng</h2>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            {/* From room */}
            <div className="space-y-1.5">
              <p className="text-xs text-slate-400 font-medium">Phòng hiện tại</p>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-800 text-base">{detail.fromRoom.code}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3" /> {detail.fromRoom.building.name}
                </p>
                <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                  <p>Tầng {detail.fromRoom.floor} · {ROOM_TYPE_LABEL[detail.fromRoom.roomType] ?? detail.fromRoom.roomType}</p>
                  <p>Đang ở: {detail.fromRoom.contracts.length}/{detail.fromRoom.capacity} người</p>
                  <p className="font-semibold text-slate-700">{fmt(detail.fromRoom.pricePerMonth)}/tháng</p>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <ArrowRightLeft className="w-5 h-5 text-slate-300 flex-shrink-0" />

            {/* To room */}
            <div className="space-y-1.5">
              <p className="text-xs text-slate-400 font-medium">Phòng muốn chuyển</p>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="font-bold text-slate-800 text-base">{detail.toRoom.code}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3" /> {detail.toRoom.building.name}
                </p>
                <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                  <p>Tầng {detail.toRoom.floor} · {ROOM_TYPE_LABEL[detail.toRoom.roomType] ?? detail.toRoom.roomType}</p>
                  <p>Đang ở: {detail.toRoom.contracts.length}/{detail.toRoom.capacity} người</p>
                  <p className="font-semibold text-slate-700">{fmt(detail.toRoom.pricePerMonth)}/tháng</p>
                </div>
              </div>
            </div>
          </div>

          {/* Price diff */}
          {priceDiff !== 0 && (
            <div className={`mt-3 px-3 py-2 rounded-lg text-xs font-medium ${priceDiff > 0 ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
              {priceDiff > 0
                ? `Phòng mới đắt hơn ${fmt(priceDiff)}/tháng — sinh viên cần nộp thêm`
                : `Phòng mới rẻ hơn ${fmt(Math.abs(priceDiff))}/tháng`}
            </div>
          )}
        </div>

        {/* Reason */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Lý do chuyển phòng</h2>
          <p className="text-sm text-slate-700 leading-relaxed">{detail.reason}</p>
        </div>

        {/* Rejection reason */}
        {detail.status === 'REJECTED' && detail.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h2 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Lý do từ chối</h2>
            <p className="text-sm text-red-700 leading-relaxed">{detail.rejectionReason}</p>
          </div>
        )}

        {/* Review info */}
        {detail.reviewedBy && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {detail.status === 'APPROVED' ? 'Duyệt' : 'Từ chối'} bởi{' '}
              <span className="font-medium text-slate-600">{detail.reviewedBy.fullName}</span>
              {detail.reviewedAt && <> lúc {fmtDate(detail.reviewedAt)}</>}
            </span>
          </div>
        )}

        {/* Review actions */}
        {detail.status === 'PENDING' && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Xử lý yêu cầu</h2>

            <div className="flex gap-2">
              <button
                onClick={() => setAction('APPROVED')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                  action === 'APPROVED'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <CheckCircle className="w-4 h-4" /> Duyệt
              </button>
              <button
                onClick={() => setAction('REJECTED')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                  action === 'REJECTED'
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4" /> Từ chối
              </button>
            </div>

            {action === 'REJECTED' && (
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Nhập lý do từ chối..."
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
              />
            )}

            {reviewError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{reviewError}</p>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleReview}
                disabled={submitting}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${
                  action === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {action === 'APPROVED' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

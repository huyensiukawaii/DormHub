'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import StudentLayout from '@/components/layouts/StudentLayout';
import {
  Wrench, ArrowLeft, Loader2, CheckCircle, Clock,
  AlertCircle, XCircle, Star, MessageSquare, AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';

type TicketStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
type TicketCategory = 'ELECTRICAL' | 'PLUMBING' | 'AIR_CONDITIONER' | 'DOOR_LOCK' | 'FURNITURE' | 'OTHER';
type TicketPriority = 'LOW' | 'NORMAL' | 'URGENT';

interface Ticket {
  id: number;
  code: string;
  title: string;
  description: string | null;
  images: string[];
  category: TicketCategory;
  priority: TicketPriority | null;
  status: TicketStatus;
  resolutionNote: string | null;
  rejectionReason: string | null;
  rating: number | null;
  ratingComment: string | null;
  ratedAt: string | null;
  handledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  room: { id: number; code: string; building: { name: string } };
  handledBy: { id: number; fullName: string } | null;
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  NEW:         { label: 'Mới',         color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    icon: Clock },
  IN_PROGRESS: { label: 'Đang xử lý',  color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   icon: AlertCircle },
  COMPLETED:   { label: 'Hoàn thành',  color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  REJECTED:    { label: 'Từ chối',     color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     icon: XCircle },
  CANCELLED:   { label: 'Đã hủy',      color: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200',   icon: XCircle },
};

const CATEGORY_LABEL: Record<TicketCategory, string> = {
  ELECTRICAL:      'Điện',
  PLUMBING:        'Nước',
  AIR_CONDITIONER: 'Điều hòa',
  DOOR_LOCK:       'Cửa/Khóa',
  FURNITURE:       'Nội thất',
  OTHER:           'Khác',
};

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function StudentTicketDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  // Cancel state
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const handleCancel = async () => {
    if (!confirm('Bạn có chắc muốn hủy yêu cầu này không?')) return;
    setCancelling(true);
    setCancelError('');
    try {
      await api.patch(`/tickets/student/my/${id}/cancel`);
      fetchTicket();
    } catch (err: any) {
      setCancelError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setCancelling(false);
    }
  };

  // Rating state
  const [ratingValue, setRatingValue]     = useState(0);
  const [hoverRating, setHoverRating]     = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingError, setRatingError]     = useState('');

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tickets/student/my/${id}`);
      setTicket(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  const handleSubmitRating = async () => {
    if (ratingValue === 0) { setRatingError('Vui lòng chọn số sao'); return; }
    setRatingError('');
    setSubmittingRating(true);
    try {
      await api.patch(`/tickets/student/my/${id}/rate`, {
        rating: ratingValue,
        ratingComment: ratingComment.trim() || undefined,
      });
      fetchTicket();
    } catch (err: any) {
      setRatingError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmittingRating(false);
    }
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

  if (!ticket) {
    return (
      <StudentLayout>
        <div className="text-center py-20">
          <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Không tìm thấy yêu cầu</p>
          <button onClick={() => router.push('/student/tickets')} className="mt-4 text-amber-600 underline text-sm">Quay lại</button>
        </div>
      </StudentLayout>
    );
  }

  const sc = STATUS_CONFIG[ticket.status];
  const SIcon = sc.icon;

  const canRate = ticket.status === 'COMPLETED' && ticket.rating === null;
  const ratingExpired = (() => {
    if (!canRate || !ticket.completedAt) return false;
    const days = (Date.now() - new Date(ticket.completedAt).getTime()) / (1000 * 60 * 60 * 24);
    return days > 7;
  })();

  return (
    <StudentLayout>
      <button
        onClick={() => router.push('/student/tickets')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      {/* Status banner */}
      <div className={`mb-5 p-4 rounded-xl border ${sc.bg} ${sc.border} flex items-center gap-3`}>
        <SIcon className={`w-6 h-6 ${sc.color} flex-shrink-0`} />
        <div className="flex-1">
          <p className={`text-sm font-semibold ${sc.color}`}>{sc.label}</p>
          {ticket.status === 'IN_PROGRESS' && ticket.handledBy && (
            <p className="text-xs text-slate-600 mt-0.5">Đang được xử lý bởi: {ticket.handledBy.fullName}</p>
          )}
          {ticket.status === 'COMPLETED' && ticket.completedAt && (
            <p className="text-xs text-slate-600 mt-0.5">Hoàn thành lúc: {fmtDateTime(ticket.completedAt)}</p>
          )}
        </div>
        {ticket.status === 'NEW' && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 disabled:opacity-50 rounded-lg flex items-center gap-1.5"
          >
            {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            Hủy yêu cầu
          </button>
        )}
      </div>
      {cancelError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{cancelError}</div>
      )}

      <div className="space-y-4">
        {/* Ticket details */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-slate-400">{ticket.code}</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-500">{CATEGORY_LABEL[ticket.category]}</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-500">Phòng {ticket.room.code}, {ticket.room.building.name}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-1">{ticket.title}</h1>
          <p className="text-xs text-slate-400">Gửi lúc {fmtDateTime(ticket.createdAt)}</p>

          {ticket.description && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          )}
        </div>

        {/* Images */}
        {ticket.images && ticket.images.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Ảnh đính kèm</h2>
            <div className="flex flex-wrap gap-3">
              {ticket.images.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={`Ảnh ${i + 1}`} className="w-28 h-28 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Resolution note */}
        {ticket.resolutionNote && (
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5">
            <h2 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Phản hồi từ ban quản lý
            </h2>
            <p className="text-sm text-emerald-700 whitespace-pre-wrap">{ticket.resolutionNote}</p>
          </div>
        )}

        {/* Rejection reason */}
        {ticket.rejectionReason && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-5">
            <h2 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Lý do từ chối
            </h2>
            <p className="text-sm text-red-700">{ticket.rejectionReason}</p>
          </div>
        )}

        {/* Rating section */}
        {ticket.status === 'COMPLETED' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" /> Đánh giá chất lượng xử lý
            </h2>

            {ticket.rating !== null ? (
              <div>
                <div className="flex items-center gap-1 mb-2">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`w-6 h-6 ${s <= ticket.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'}`} />
                  ))}
                  <span className="text-sm font-semibold text-slate-700 ml-2">{ticket.rating}/5</span>
                </div>
                {ticket.ratingComment && (
                  <p className="text-sm text-slate-600 italic">"{ticket.ratingComment}"</p>
                )}
                {ticket.ratedAt && (
                  <p className="text-xs text-slate-400 mt-2">Đã đánh giá lúc {fmtDateTime(ticket.ratedAt)}</p>
                )}
              </div>
            ) : ratingExpired ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Đã quá 7 ngày kể từ khi hoàn thành, không thể đánh giá nữa
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">Bạn có thể đánh giá trong vòng 7 ngày kể từ khi sự cố được xử lý xong.</p>

                {/* Stars */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Mức độ hài lòng:</span>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRatingValue(s)}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-0.5"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            s <= (hoverRating || ratingValue)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-slate-200 fill-slate-200'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {ratingValue > 0 && (
                    <span className="text-sm text-slate-500">
                      {['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Rất tốt'][ratingValue]}
                    </span>
                  )}
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nhận xét <span className="text-slate-400 font-normal text-xs">(tuỳ chọn)</span>
                  </label>
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    maxLength={500}
                    rows={2}
                    placeholder="Chia sẻ trải nghiệm của bạn..."
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                  />
                </div>

                {ratingError && (
                  <p className="text-sm text-red-600">{ratingError}</p>
                )}

                <button
                  onClick={handleSubmitRating}
                  disabled={submittingRating || ratingValue === 0}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 rounded-lg flex items-center gap-2"
                >
                  {submittingRating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                  Gửi đánh giá
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}

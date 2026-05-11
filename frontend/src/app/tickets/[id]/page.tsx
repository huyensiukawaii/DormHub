'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Wrench, ArrowLeft, Loader2, AlertCircle, CheckCircle, Clock,
  XCircle, AlertTriangle, Star, User, Building2, Calendar,
  ClipboardList, MessageSquare, X,
} from 'lucide-react';
import { api } from '@/lib/api';

type TicketStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
type TicketPriority = 'LOW' | 'NORMAL' | 'URGENT';
type TicketCategory = 'ELECTRICAL' | 'PLUMBING' | 'AIR_CONDITIONER' | 'DOOR_LOCK' | 'FURNITURE' | 'OTHER';

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
  updatedAt: string;
  room: { id: number; code: string; building: { id: number; code: string; name: string } };
  reportedBy: { id: number; fullName: string; studentCode: string };
  handledBy: { id: number; fullName: string } | null;
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string; icon: any }> = {
  NEW:         { label: 'Mới',         color: 'text-blue-700',    bg: 'bg-blue-100',    icon: Clock },
  IN_PROGRESS: { label: 'Đang xử lý',  color: 'text-amber-700',   bg: 'bg-amber-100',   icon: AlertCircle },
  COMPLETED:   { label: 'Hoàn thành',  color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
  REJECTED:    { label: 'Từ chối',     color: 'text-red-700',     bg: 'bg-red-100',     icon: XCircle },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; bg: string }> = {
  LOW:    { label: 'Thấp',       color: 'text-slate-600',  bg: 'bg-slate-100' },
  NORMAL: { label: 'Bình thường', color: 'text-blue-600',   bg: 'bg-blue-100' },
  URGENT: { label: 'Khẩn cấp',   color: 'text-red-700',    bg: 'bg-red-100' },
};
const UNCLASSIFIED = { label: 'Chưa phân loại', color: 'text-orange-600', bg: 'bg-orange-50' };
const getPriority = (p: TicketPriority | null) => p ? PRIORITY_CONFIG[p] : UNCLASSIFIED;

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

export default function TicketDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  // Update form state
  const [showUpdate, setShowUpdate]         = useState(false);
  const [updateStatus, setUpdateStatus]     = useState('');
  const [updatePriority, setUpdatePriority] = useState('');
  const [updateNote, setUpdateNote]         = useState('');
  const [updating, setUpdating]             = useState(false);

  // Reject modal state
  const [showReject, setShowReject]     = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting]       = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tickets/${id}`);
      setTicket(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  const openUpdate = () => {
    if (!ticket) return;
    setUpdateStatus(ticket.status);
    setUpdatePriority(ticket.priority ?? '');
    setUpdateNote(ticket.resolutionNote ?? '');
    setShowUpdate(true);
  };

  const handleUpdate = async () => {
    if (!ticket) return;
    setUpdating(true);
    try {
      const body: any = {};
      if (updateStatus !== ticket.status) body.status = updateStatus;
      if (updatePriority && updatePriority !== ticket.priority) body.priority = updatePriority;
      if (updateNote !== (ticket.resolutionNote ?? '')) body.resolutionNote = updateNote;
      await api.patch(`/tickets/${id}`, body);
      setShowUpdate(false);
      fetchTicket();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi cập nhật');
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { alert('Vui lòng nhập lý do từ chối'); return; }
    setRejecting(true);
    try {
      await api.patch(`/tickets/${id}/reject`, { rejectionReason: rejectReason });
      setShowReject(false);
      fetchTicket();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi từ chối');
    } finally {
      setRejecting(false);
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

  if (!ticket) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Không tìm thấy ticket</p>
          <button onClick={() => router.push('/tickets')} className="mt-4 text-emerald-600 underline text-sm">Quay lại</button>
        </div>
      </AdminLayout>
    );
  }

  const sc = STATUS_CONFIG[ticket.status];
  const pc = getPriority(ticket.priority);
  const SIcon = sc.icon;
  const canEdit = ticket.status !== 'COMPLETED' && ticket.status !== 'REJECTED';

  return (
    <AdminLayout>
      {/* Back button */}
      <button
        onClick={() => router.push('/tickets')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-800">{ticket.code}</h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-full ${sc.bg} ${sc.color}`}>
              <SIcon className="w-3.5 h-3.5" /> {sc.label}
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-full ${pc.bg} ${pc.color}`}>
              {ticket.priority === 'URGENT' && <AlertTriangle className="w-3.5 h-3.5" />}
              {pc.label}
            </span>

          </div>
          <p className="text-lg text-slate-700">{ticket.title}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={openUpdate}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
            >
              Cập nhật
            </button>
            <button
              onClick={() => { setRejectReason(''); setShowReject(true); }}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg border border-red-200"
            >
              Từ chối
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-slate-400" /> Mô tả sự cố
            </h2>
            {ticket.description ? (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">Không có mô tả</p>
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

          {/* Resolution Note */}
          {ticket.resolutionNote && (
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5">
              <h2 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Ghi chú xử lý
              </h2>
              <p className="text-sm text-emerald-700 whitespace-pre-wrap">{ticket.resolutionNote}</p>
            </div>
          )}

          {/* Rejection Reason */}
          {ticket.rejectionReason && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-5">
              <h2 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Lý do từ chối
              </h2>
              <p className="text-sm text-red-700">{ticket.rejectionReason}</p>
            </div>
          )}

          {/* Rating */}
          {ticket.status === 'COMPLETED' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" /> Đánh giá của sinh viên
              </h2>
              {ticket.rating ? (
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`w-5 h-5 ${s <= ticket.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'}`} />
                    ))}
                    <span className="text-sm font-semibold text-slate-700 ml-2">{ticket.rating}/5</span>
                  </div>
                  {ticket.ratingComment && (
                    <p className="text-sm text-slate-600 italic">"{ticket.ratingComment}"</p>
                  )}
                  {ticket.ratedAt && (
                    <p className="text-xs text-slate-400 mt-1">Đánh giá lúc {fmtDateTime(ticket.ratedAt)}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Sinh viên chưa đánh giá</p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          {/* Ticket info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Thông tin ticket</h2>
            <InfoRow label="Danh mục" value={CATEGORY_LABEL[ticket.category]} />
            <InfoRow label="Phòng" value={ticket.room.code} />
            <InfoRow label="Tòa nhà" value={ticket.room.building.name} />
            <InfoRow label="Ngày tạo" value={fmtDateTime(ticket.createdAt)} />
            {ticket.handledAt && <InfoRow label="Bắt đầu xử lý" value={fmtDateTime(ticket.handledAt)} />}
            {ticket.completedAt && <InfoRow label="Hoàn thành lúc" value={fmtDateTime(ticket.completedAt)} />}
          </div>

          {/* Reporter */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" /> Sinh viên báo cáo
            </h2>
            <p className="text-sm font-medium text-slate-800">{ticket.reportedBy.fullName}</p>
            <p className="text-xs text-slate-500">{ticket.reportedBy.studentCode}</p>
          </div>

          {/* Handler */}
          {ticket.handledBy && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" /> Nhân viên xử lý
              </h2>
              <p className="text-sm font-medium text-slate-800">{ticket.handledBy.fullName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Update Modal */}
      {showUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { if (!updating) setShowUpdate(false); }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Cập nhật ticket</h3>
              <button onClick={() => setShowUpdate(false)} disabled={updating} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Trạng thái</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="NEW">Mới</option>
                  <option value="IN_PROGRESS">Đang xử lý</option>
                  <option value="COMPLETED">Hoàn thành</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mức độ ưu tiên</label>
                <select
                  value={updatePriority}
                  onChange={(e) => setUpdatePriority(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">— Chưa phân loại —</option>
                  <option value="LOW">Thấp</option>
                  <option value="NORMAL">Bình thường</option>
                  <option value="URGENT">Khẩn cấp</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ghi chú xử lý</label>
                <textarea
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                  rows={3}
                  placeholder="Nhập ghi chú..."
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowUpdate(false)}
                  disabled={updating}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 rounded-lg flex items-center justify-center gap-2"
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { if (!rejecting) setShowReject(false); }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Từ chối ticket</h3>
              <button onClick={() => setShowReject(false)} disabled={rejecting} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Lý do từ chối <span className="text-red-500">*</span></label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Nhập lý do từ chối..."
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowReject(false)}
                  disabled={rejecting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejecting || !rejectReason.trim()}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-lg flex items-center justify-center gap-2"
                >
                  {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-slate-700 text-right">{value}</span>
    </div>
  );
}

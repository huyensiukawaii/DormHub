'use client';

import { useState, useEffect, useCallback } from 'react';
import StudentLayout from '@/components/layouts/StudentLayout';
import { ArrowRightLeft, CheckCircle, XCircle, Clock, X, Loader2, ChevronDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/timeAgo';

type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface Room {
  id: number;
  code: string;
  floor: number;
  gender: string;
  roomType: string;
  capacity: number;
  availableCount: number;
  pricePerMonth: number;
  building: { id: number; code: string; name: string };
}

interface TransferRequest {
  id: number;
  code: string;
  reason: string;
  status: TransferStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  fromRoom: { id: number; code: string; building: { name: string } };
  toRoom: { id: number; code: string; building: { name: string } };
  reviewedBy: { fullName: string } | null;
}

const STATUS_CONFIG: Record<TransferStatus, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:   { label: 'Chờ duyệt',    color: 'text-amber-700',   bg: 'bg-amber-100',   icon: Clock },
  APPROVED:  { label: 'Đã duyệt',     color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
  REJECTED:  { label: 'Bị từ chối',   color: 'text-red-700',     bg: 'bg-red-100',     icon: XCircle },
  CANCELLED: { label: 'Đã hủy',       color: 'text-slate-500',   bg: 'bg-slate-100',   icon: X },
};

const ROOM_TYPE_LABEL: Record<string, string> = {
  STANDARD: 'Thường',
  AIR_CONDITIONED: 'Điều hòa',
};

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

function remainingMonths(endDateStr: string) {
  if (!endDateStr) return 0;
  const now = new Date();
  const end = new Date(endDateStr);
  return Math.max(0, (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()));
}

export default function StudentRoomTransferPage() {
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRoom, setCurrentRoom] = useState<{ code: string; building: { name: string } } | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);
  const [currentMonthlyRent, setCurrentMonthlyRent] = useState<number>(0);
  const [contractEndDate, setContractEndDate] = useState<string>('');
  const [hasActiveContract, setHasActiveContract] = useState(false);
  const [studentGender, setStudentGender] = useState<string>('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Cancel state
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [transfersRes, contractsRes, meRes] = await Promise.all([
        api.get('/room-transfers/student/my?limit=20'),
        api.get('/student/contracts').catch(() => ({ data: [] })),
        api.get('/auth/me').catch(() => ({ data: {} })),
      ]);
      setRequests(transfersRes.data.data ?? []);
      setStudentGender(meRes.data.student?.gender ?? '');
      const activeContract = (contractsRes.data as any[]).find((c: any) => c.status === 'ACTIVE');
      if (activeContract) {
        setHasActiveContract(true);
        setCurrentRoom(activeContract.room ?? null);
        setCurrentRoomId(activeContract.room?.id ?? activeContract.roomId ?? null);
        setCurrentMonthlyRent(Number(activeContract.monthlyRent ?? 0));
        setContractEndDate(activeContract.endDate ?? '');
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasPending = requests.some((r) => r.status === 'PENDING');

  const openForm = async () => {
    setShowForm(true);
    setFormError('');
    setSelectedRoomId('');
    setReason('');
    if (rooms.length === 0) {
      setRoomsLoading(true);
      try {
        const genderParam = studentGender ? `&gender=${studentGender}` : '';
        const res = await api.get(`/rooms?hasAvailable=true&status=ACTIVE${genderParam}&limit=200`);
        const all: Room[] = Array.isArray(res.data) ? res.data : (res.data.data ?? []);
        setRooms(all.filter((r) => r.id !== currentRoomId));
      } catch {
        setFormError('Không thể tải danh sách phòng');
      } finally {
        setRoomsLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) { setFormError('Vui lòng chọn phòng muốn chuyển đến'); return; }
    if (!reason.trim()) { setFormError('Vui lòng nhập lý do chuyển phòng'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      await api.post('/room-transfers/student', { toRoomId: Number(selectedRoomId), reason: reason.trim() });
      setShowForm(false);
      setRooms([]);
      await fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Bạn chắc chắn muốn hủy yêu cầu này?')) return;
    setCancellingId(id);
    try {
      await api.patch(`/room-transfers/student/${id}/cancel`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Có lỗi xảy ra');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Yêu cầu chuyển phòng</h1>
            {currentRoom && (
              <p className="text-sm text-slate-500 mt-0.5">
                Phòng hiện tại: <span className="font-medium text-slate-700">{currentRoom.code}</span>
                {' — '}{currentRoom.building?.name}
              </p>
            )}
          </div>
          {hasActiveContract && !hasPending && !showForm && (
            <button
              onClick={openForm}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Tạo yêu cầu
            </button>
          )}
        </div>

        {/* Notice: no active contract */}
        {!loading && !hasActiveContract && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-500 text-sm">
            Bạn chưa có hợp đồng đang hoạt động. Chuyển phòng chỉ áp dụng cho sinh viên đang ở KTX.
          </div>
        )}

        {/* Notice: has pending */}
        {hasPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            Bạn đang có yêu cầu chuyển phòng chờ duyệt. Vui lòng chờ ban quản lý xử lý.
          </div>
        )}

        {/* Form tạo yêu cầu */}
        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Tạo yêu cầu chuyển phòng</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Chọn phòng */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Phòng muốn chuyển đến <span className="text-red-500">*</span>
                </label>
                {roomsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tải danh sách phòng...
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <select
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(e.target.value)}
                        className="w-full appearance-none px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 pr-8"
                      >
                        <option value="">— Chọn phòng —</option>
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.code} — {r.building.name} — Tầng {r.floor} — {ROOM_TYPE_LABEL[r.roomType] ?? r.roomType} — Còn {r.availableCount}/{r.capacity} chỗ
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>

                    {/* So sánh giá khi đã chọn phòng */}
                    {(() => {
                      const selected = rooms.find((r) => String(r.id) === selectedRoomId);
                      if (!selected) return null;
                      const newRent = Number(selected.pricePerMonth);
                      const diff = newRent - currentMonthlyRent;
                      const months = remainingMonths(contractEndDate);
                      if (diff === 0) return (
                        <div className="flex items-center gap-2 mt-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
                          <Minus className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span>Giá tương đương phòng hiện tại — <strong>{fmt(newRent)}/tháng</strong>. Không phát sinh thêm chi phí.</span>
                        </div>
                      );
                      if (diff > 0) return (
                        <div className="flex items-start gap-2 mt-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                          <TrendingUp className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span>
                            Phòng mới giá <strong>{fmt(newRent)}/tháng</strong>, cao hơn <strong>{fmt(diff)}/tháng</strong>.
                            {months > 0 && <> Nếu được duyệt, bạn cần nộp thêm <strong>{fmt(diff * months)}</strong> cho {months} tháng còn lại của hợp đồng.</>}
                          </span>
                        </div>
                      );
                      return (
                        <div className="flex items-start gap-2 mt-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                          <TrendingDown className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span>
                            Phòng mới giá <strong>{fmt(newRent)}/tháng</strong>, thấp hơn <strong>{fmt(Math.abs(diff))}/tháng</strong>. Chênh lệch sẽ không được hoàn lại.
                          </span>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Lý do */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Lý do chuyển phòng <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Mô tả lý do bạn muốn chuyển phòng..."
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                />
                <p className="text-xs text-slate-400 mt-1 text-right">{reason.length}/500</p>
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Gửi yêu cầu
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Danh sách lịch sử */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="font-medium text-slate-700 text-sm">Lịch sử yêu cầu</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <ArrowRightLeft className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Chưa có yêu cầu chuyển phòng nào</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {requests.map((r) => {
                const cfg = STATUS_CONFIG[r.status];
                const Icon = cfg.icon;
                return (
                  <li key={r.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">{r.code}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${cfg.bg} ${cfg.color}`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-600">
                          <span className="font-medium">{r.fromRoom.code}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-medium">{r.toRoom.code}</span>
                          <span className="text-slate-400 text-xs">({r.toRoom.building.name})</span>
                        </div>

                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.reason}</p>

                        {r.status === 'REJECTED' && r.rejectionReason && (
                          <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 mt-1.5">
                            Lý do từ chối: {r.rejectionReason}
                          </p>
                        )}

                        <p className="text-xs text-slate-400 mt-1.5">{timeAgo(r.createdAt)}</p>
                      </div>

                      {r.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          disabled={cancellingId === r.id}
                          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          {cancellingId === r.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          Hủy
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}

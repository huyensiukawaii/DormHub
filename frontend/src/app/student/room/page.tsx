'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StudentLayout from '@/components/layouts/StudentLayout';
import {
  Home,
  Users,
  Wrench,
  ArrowRightLeft,
  Loader2,
  DoorOpen,
  Zap,
  Wind,
  Crown,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Resident {
  id: number;
  contractId: number;
  isRoomLeader: boolean;
  checkInDate: string;
  checkOutDate: string;
  contractStatus: string;
  student: {
    id: number;
    studentCode: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    major: string;
    classCode: string;
  };
}

interface RoomDetail {
  id: number;
  code: string;
  floor: number;
  roomType: string;
  gender: string;
  capacity: number;
  pricePerMonth: string;
  status: string;
  description: string | null;
  building: { id: number; code: string; name: string };
  occupiedCount: number;
  availableCount: number;
  residents: Resident[];
  recentTickets: Array<{
    id: number;
    title: string;
    priority: string | null;
    status: string;
    createdAt: string;
  }>;
}

const ROOM_TYPE_LABEL: Record<string, { label: string; icon: any; color: string }> = {
  STANDARD:        { label: 'Phòng thường',   icon: DoorOpen, color: 'text-slate-600' },
  AIR_CONDITIONED: { label: 'Có điều hòa',    icon: Wind,     color: 'text-blue-600'  },
  PREMIUM:         { label: 'Phòng cao cấp',  icon: Zap,      color: 'text-amber-600' },
};

const TICKET_STATUS: Record<string, { label: string; color: string }> = {
  NEW:         { label: 'Mới',          color: 'bg-amber-100 text-amber-700' },
  IN_PROGRESS: { label: 'Đang xử lý',  color: 'bg-blue-100 text-blue-700'   },
  COMPLETED:   { label: 'Hoàn thành',  color: 'bg-emerald-100 text-emerald-700' },
  REJECTED:    { label: 'Từ chối',     color: 'bg-red-100 text-red-700'     },
  CANCELLED:   { label: 'Đã hủy',     color: 'bg-slate-100 text-slate-500'  },
};

export default function StudentRoomPage() {
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [myStudentId, setMyStudentId] = useState<number | null>(null);
  const [hasPendingTransfer, setHasPendingTransfer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [noRoom, setNoRoom] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await api.get('/auth/me');
        const currentRoom = meRes.data.currentRoom;
        const studentId = meRes.data.student?.id;
        setMyStudentId(studentId ?? null);

        if (!currentRoom?.id) {
          setNoRoom(true);
          return;
        }

        const [roomRes, transfersRes] = await Promise.all([
          api.get(`/rooms/${currentRoom.id}`),
          api.get('/room-transfers/student/my?limit=5').catch(() => ({ data: { data: [] } })),
        ]);

        setRoom(roomRes.data);
        const pending = (transfersRes.data.data ?? []).some(
          (r: any) => r.status === 'PENDING',
        );
        setHasPendingTransfer(pending);
      } catch {
        setNoRoom(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </StudentLayout>
    );
  }

  if (noRoom || !room) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Home className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Bạn chưa được xếp phòng</p>
        </div>
      </StudentLayout>
    );
  }

  const typeInfo = ROOM_TYPE_LABEL[room.roomType] ?? { label: room.roomType, icon: DoorOpen, color: 'text-slate-600' };
  const TypeIcon = typeInfo.icon;
  const occupancyPercent = Math.round((room.occupiedCount / room.capacity) * 100);

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Phòng {room.code}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {room.building.name} · Tầng {room.floor}
            </p>
          </div>

          {hasPendingTransfer ? (
            <Link
              href="/student/room-transfer"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Xem yêu cầu chuyển phòng
            </Link>
          ) : (
            <Link
              href="/student/room-transfer"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Yêu cầu chuyển phòng
            </Link>
          )}
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Loại phòng</p>
            <div className={`flex items-center gap-1.5 font-semibold text-sm ${typeInfo.color}`}>
              <TypeIcon className="w-4 h-4" />
              {typeInfo.label}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Sức chứa</p>
            <p className="font-semibold text-slate-800 text-sm">
              {room.occupiedCount}/{room.capacity} người
            </p>
            <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${occupancyPercent >= 100 ? 'bg-red-400' : occupancyPercent >= 75 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Giá phòng</p>
            <p className="font-semibold text-slate-800 text-sm">
              {Number(room.pricePerMonth).toLocaleString('vi-VN')}đ
            </p>
            <p className="text-xs text-slate-400">/tháng</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Còn trống</p>
            <p className={`font-semibold text-sm ${room.availableCount === 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {room.availableCount} chỗ
            </p>
          </div>
        </div>

        {/* Residents */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <Users className="w-4 h-4 text-slate-400" />
            <h2 className="font-medium text-slate-700 text-sm">
              Thành viên phòng ({room.residents.length})
            </h2>
          </div>
          {room.residents.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-400 text-center">Chưa có thành viên</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {room.residents.map((r) => {
                const isMe = r.student.id === myStudentId;
                return (
                  <li key={r.id} className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-amber-50' : ''}`}>
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-sm flex-shrink-0">
                      {r.student.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-slate-800">
                          {r.student.fullName}
                        </span>
                        {r.isRoomLeader && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full">
                            <Crown className="w-2.5 h-2.5" /> Trưởng phòng
                          </span>
                        )}
                        {isMe && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-600 rounded-full">
                            Bạn
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {r.student.studentCode} · {r.student.classCode}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recent tickets */}
        {room.recentTickets.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-slate-400" />
                <h2 className="font-medium text-slate-700 text-sm">Sự cố gần đây</h2>
              </div>
              <Link href="/student/tickets" className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                Xem tất cả
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {room.recentTickets.slice(0, 4).map((t) => {
                const s = TICKET_STATUS[t.status] ?? { label: t.status, color: 'bg-slate-100 text-slate-500' };
                return (
                  <li key={t.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className="text-sm text-slate-700 truncate">{t.title}</span>
                    <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${s.color}`}>
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Description */}
        {room.description && (
          <div className="flex items-start gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
            <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            {room.description}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}

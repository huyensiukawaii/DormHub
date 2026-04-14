'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  ArrowLeft,
  Building2,
  DoorOpen,
  Users,
  Zap,
  Thermometer,
  Calendar,
  Phone,
  Mail,
  GraduationCap,
  AlertCircle,
  Loader2,
  Pencil,
  UserMinus,
  FileSignature,
  Receipt,
  Wrench,
  MoreVertical,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Room {
  id: number;
  code: string;
  floor: number;
  roomType: 'STANDARD' | 'AIR_CONDITIONED';
  gender: 'MALE' | 'FEMALE';
  capacity: number;
  pricePerMonth: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  description: string | null;
  building: {
    id: number;
    code: string;
    name: string;
  };
  occupiedCount: number;
  availableCount: number;
  residents: Resident[];
  recentTickets: Ticket[];
}

interface Resident {
  id: number;
  contractId: number;
  student: {
    id: number;
    studentCode: string;
    fullName: string;
    email: string;
    phone: string;
    major: string;
    classCode: string;
    avatar: string | null;
  };
  checkInDate: string;
  checkOutDate: string | null;
  contractStatus: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'TERMINATED';
}

interface Ticket {
  id: number;
  title: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
}

export default function RoomDetailPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Action menu
  const [activeMenu, setActiveMenu] = useState<number | null>(null);

  // Remove resident modal
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  useEffect(() => {
    fetchRoom();
  }, [roomId]);

  const fetchRoom = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/rooms/${roomId}`);
      setRoom(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải thông tin phòng');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' đ';

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getRoomTypeBadge = (type: string) => (
    type === 'AIR_CONDITIONED' ? (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded-full">
        <Thermometer className="w-4 h-4" />
        Điều hòa
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-slate-100 text-slate-700 rounded-full">
        <Zap className="w-4 h-4" />
        Thường
      </span>
    )
  );

  const getGenderBadge = (gender: string) => (
    gender === 'MALE' ? (
      <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 rounded-full">
        <span className="text-blue-500">♂</span> Nam
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium bg-pink-50 text-pink-700 rounded-full">
        <span className="text-pink-500">♀</span> Nữ
      </span>
    )
  );

  const getStatusBadge = (status: string, occupiedCount: number, capacity: number) => {
    if (status !== 'ACTIVE') {
      return status === 'MAINTENANCE' ? (
        <span className="px-3 py-1 text-sm font-medium bg-amber-100 text-amber-700 rounded-full">Bảo trì</span>
      ) : (
        <span className="px-3 py-1 text-sm font-medium bg-slate-100 text-slate-700 rounded-full">Ngừng hoạt động</span>
      );
    }
    if (occupiedCount >= capacity) {
      return <span className="px-3 py-1 text-sm font-medium bg-red-100 text-red-700 rounded-full">Đầy</span>;
    }
    return <span className="px-3 py-1 text-sm font-medium bg-emerald-100 text-emerald-700 rounded-full">Còn chỗ</span>;
  };

  const getContractStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">Đang ở</span>;
      case 'PENDING':
        return <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Chờ nhận</span>;
      case 'EXPIRED':
        return <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">Hết hạn</span>;
      case 'TERMINATED':
        return <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">Đã kết thúc</span>;
      default:
        return null;
    }
  };

  const getTicketPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">Cao</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">TB</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">Thấp</span>;
      default:
        return null;
    }
  };

  const getTicketStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">Mở</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Đang xử lý</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">Đã xử lý</span>;
      case 'CLOSED':
        return <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">Đóng</span>;
      default:
        return null;
    }
  };

  const getOccupancyBar = (occupied: number, capacity: number) => {
    const pct = (occupied / capacity) * 100;
    let color = 'bg-emerald-500';
    if (pct >= 100) color = 'bg-red-500';
    else if (pct >= 80) color = 'bg-amber-500';

    return (
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-slate-600">Tỷ lệ lấp đầy</span>
          <span className="text-sm font-semibold text-slate-800">{occupied}/{capacity} ({Math.round(pct)}%)</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>
    );
  };

  const openRemoveModal = (resident: Resident) => {
    setSelectedResident(resident);
    setActiveMenu(null);
    setShowRemoveModal(true);
  };

  const handleRemoveResident = async () => {
    if (!selectedResident) return;
    setRemoveLoading(true);

    try {
      await api.post(`/contracts/${selectedResident.contractId}/terminate`);
      setShowRemoveModal(false);
      setSelectedResident(null);
      fetchRoom();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể kết thúc hợp đồng');
    } finally {
      setRemoveLoading(false);
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

  if (error || !room) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-red-500 mb-4">{error || 'Không tìm thấy phòng'}</p>
          <button onClick={() => router.push('/rooms')} className="text-emerald-600 hover:text-emerald-700 font-medium">
            Quay lại danh sách
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">Phòng {room.code}</h1>
              {getStatusBadge(room.status, room.occupiedCount, room.capacity)}
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
              <Link href={`/buildings/${room.building.id}`} className="hover:text-emerald-600 transition-colors">
                {room.building.name}
              </Link>
              <span>•</span>
              <span>Tầng {room.floor}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push(`/rooms?edit=${room.id}`)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
        >
          <Pencil className="w-4 h-4" />
          Chỉnh sửa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Room info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Room info card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Thông tin phòng</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Loại phòng</span>
                {getRoomTypeBadge(room.roomType)}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Giới tính</span>
                {getGenderBadge(room.gender)}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Sức chứa</span>
                <span className="text-sm font-medium text-slate-800">{room.capacity} người</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Giá phòng/tháng</span>
                <span className="text-sm font-semibold text-emerald-600">{formatCurrency(room.pricePerMonth)}</span>
              </div>

              {room.description && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">Mô tả</p>
                  <p className="text-sm text-slate-700">{room.description}</p>
                </div>
              )}

              {getOccupancyBar(room.occupiedCount, room.capacity)}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Thao tác nhanh</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={`/contracts?roomId=${room.id}`}
                className="flex flex-col items-center gap-2 p-3 bg-slate-50 hover:bg-emerald-50 rounded-lg transition-colors group"
              >
                <FileSignature className="w-5 h-5 text-slate-500 group-hover:text-emerald-600" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-emerald-700">Hợp đồng</span>
              </Link>
              <Link
                href={`/invoices?roomId=${room.id}`}
                className="flex flex-col items-center gap-2 p-3 bg-slate-50 hover:bg-emerald-50 rounded-lg transition-colors group"
              >
                <Receipt className="w-5 h-5 text-slate-500 group-hover:text-emerald-600" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-emerald-700">Hóa đơn</span>
              </Link>
              <Link
                href={`/meters?roomId=${room.id}`}
                className="flex flex-col items-center gap-2 p-3 bg-slate-50 hover:bg-emerald-50 rounded-lg transition-colors group"
              >
                <Zap className="w-5 h-5 text-slate-500 group-hover:text-emerald-600" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-emerald-700">Công tơ</span>
              </Link>
              <Link
                href={`/tickets?roomId=${room.id}`}
                className="flex flex-col items-center gap-2 p-3 bg-slate-50 hover:bg-emerald-50 rounded-lg transition-colors group"
              >
                <Wrench className="w-5 h-5 text-slate-500 group-hover:text-emerald-600" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-emerald-700">Sự cố</span>
              </Link>
            </div>
          </div>

          {/* Recent tickets */}
          {room.recentTickets && room.recentTickets.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-800">Sự cố gần đây</h3>
                <Link href={`/tickets?roomId=${room.id}`} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                  Xem tất cả
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {room.recentTickets.map((ticket) => (
                  <div key={ticket.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800 line-clamp-1">{ticket.title}</p>
                      {getTicketStatusBadge(ticket.status)}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {getTicketPriorityBadge(ticket.priority)}
                      <span className="text-xs text-slate-400">{formatDate(ticket.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column - Residents */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Danh sách người ở</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {room.occupiedCount} / {room.capacity} người
                </p>
              </div>
              {room.availableCount > 0 && (
                <Link
                  href={`/applications?roomId=${room.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Users className="w-4 h-4" />
                  Xếp sinh viên
                </Link>
              )}
            </div>

            {room.residents && room.residents.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {room.residents.map((resident) => (
                  <div key={resident.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {resident.student.avatar ? (
                          <img
                            src={resident.student.avatar}
                            alt={resident.student.fullName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                            <span className="text-emerald-700 text-lg font-semibold">
                              {resident.student.fullName.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/students/${resident.student.id}`}
                            className="text-sm font-semibold text-slate-800 hover:text-emerald-600 transition-colors"
                          >
                            {resident.student.fullName}
                          </Link>
                          {getContractStatusBadge(resident.contractStatus)}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                          <span className="font-medium text-slate-600">{resident.student.studentCode}</span>
                          <span>•</span>
                          <span>{resident.student.classCode}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5" />
                            {resident.student.major}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {resident.student.phone}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {resident.student.email}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Nhận phòng: {formatDate(resident.checkInDate)}
                          </span>
                          {resident.checkOutDate && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              Trả phòng: {formatDate(resident.checkOutDate)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === resident.id ? null : resident.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-500" />
                        </button>

                        {activeMenu === resident.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                            <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                              <Link
                                href={`/students/${resident.student.id}`}
                                onClick={() => setActiveMenu(null)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <Users className="w-4 h-4" />
                                Xem hồ sơ
                              </Link>
                              <Link
                                href={`/contracts/${resident.contractId}`}
                                onClick={() => setActiveMenu(null)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <FileSignature className="w-4 h-4" />
                                Xem hợp đồng
                              </Link>
                              <hr className="my-1 border-slate-200" />
                              <button
                                onClick={() => openRemoveModal(resident)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <UserMinus className="w-4 h-4" />
                                Kết thúc hợp đồng
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-1">Phòng chưa có ai ở</p>
                <p className="text-sm text-slate-400">Hãy xếp sinh viên vào phòng này</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Remove resident modal */}
      {showRemoveModal && selectedResident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRemoveModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <UserMinus className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Kết thúc hợp đồng?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Bạn có chắc muốn kết thúc hợp đồng của <strong>{selectedResident.student.fullName}</strong> ({selectedResident.student.studentCode})?
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowRemoveModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleRemoveResident}
                  disabled={removeLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {removeLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Kết thúc
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
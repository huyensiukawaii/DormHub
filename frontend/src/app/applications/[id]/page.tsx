'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Star,
  Home,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  Building2,
  User,
  GraduationCap,
  RefreshCw,
  Phone,
  Mail,
  Hash,
  FileSignature,
  Info,
  Award,
  ThumbsUp,
  ThumbsDown,
  Users,
  Filter,
  Search,
  ChevronDown,
  X,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';

type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface ApplicationDetail {
  id: number;
  type: 'NEW' | 'RENEWAL';
  status: ApplicationStatus;
  priorityScore: number;
  createdAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  wantSameRoom: boolean;

  isFirstYear: boolean;
  isPoorHousehold: boolean;
  isNearPoor: boolean;
  isOrphan: boolean;
  isDisabled: boolean;
  isPolicyFamily: boolean;
  wasResident: boolean;
  gpaLastSemester: string | null;

  student: {
    id: number;
    studentCode: string;
    fullName: string;
    gender: 'MALE' | 'FEMALE';
    className: string | null;
    faculty: string | null;
    majorCode: string | null;
    hometownProvince: string | null;
    hometownDistance: number | null;
    email: string | null;
    phone: string | null;
    user: { email: string; phone: string | null };
  };

  period: {
    id: number;
    code: string;
    name: string;
    academicYear: string;
    semester: number;
    moveInDate: string | null;
  };

  currentRoom: {
    id: number;
    code: string;
    floor: number;
    building: { code: string; name: string };
  } | null;

  approvedRoom: {
    id: number;
    code: string;
    floor: number;
    roomType: string;
    pricePerMonth: number;
    building: { code: string; name: string };
  } | null;

  approvedPriority: number | null;

  roomChoices: Array<{
    id: number;
    priority: number;
    room: {
      id: number;
      code: string;
      floor: number;
      roomType: string;
      pricePerMonth: number;
      building: { code: string; name: string };
    };
  }>;

  reviewedBy: { id: number; fullName: string } | null;

  priorityBreakdown: {
    items: { label: string; points: number; active: boolean }[];
    totalPoints: number;
  };

  approvedDocuments: Array<{ type: string; fileName: string; fileUrl: string }>;
}

interface AvailableRoom {
  id: number;
  code: string;
  buildingName: string;
  buildingCode: string;
  floor: number;
  roomType: 'STANDARD' | 'AIR_CONDITIONED';
  gender: 'MALE' | 'FEMALE';
  capacity: number;
  currentOccupants: number;
  availableSlots: number;
  pricePerMonth: number;
  isUserPreference: boolean;
  preferencePriority: number | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  POOR_HOUSEHOLD: 'Hộ nghèo',
  NEAR_POOR: 'Hộ cận nghèo',
  ORPHAN: 'Mồ côi',
  DISABLED: 'Khuyết tật',
  POLICY_FAMILY: 'Gia đình chính sách',
  GPA_TRANSCRIPT: 'Bảng điểm GPA',
};

export default function AdminApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const appId = params.id as string;

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Approve/Reject modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Approve
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [roomSearch, setRoomSearch] = useState('');
  const [filterPreferenceOnly, setFilterPreferenceOnly] = useState(false);

  // Reject
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchDetail();
  }, [appId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/applications/${appId}/detail`);
      setApplication(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải chi tiết đơn');
    } finally {
      setLoading(false);
    }
  };

  const openApproveModal = async () => {
    setShowApproveModal(true);
    setSelectedRoomId(null);
    setRoomSearch('');
    setFilterPreferenceOnly(false);
    setRoomsLoading(true);
    try {
      const res = await api.get(`/applications/${appId}/available-rooms`);
      setAvailableRooms(res.data.rooms);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tải danh sách phòng');
    } finally {
      setRoomsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRoomId) {
      alert('Vui lòng chọn phòng để duyệt');
      return;
    }

    setProcessing(true);
    try {
      await api.patch(`/applications/${appId}/status`, {
        status: 'APPROVED',
        assignedRoomId: selectedRoomId,
      });
      setShowApproveModal(false);
      fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể duyệt đơn');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }

    setProcessing(true);
    try {
      await api.patch(`/applications/${appId}/status`, {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
      });
      setShowRejectModal(false);
      setRejectionReason('');
      fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể từ chối đơn');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
  };

  // Filter rooms
  const filteredRooms = availableRooms.filter((room) => {
    if (filterPreferenceOnly && !room.isUserPreference) return false;
    if (roomSearch) {
      const q = roomSearch.toLowerCase();
      if (
        !room.code.toLowerCase().includes(q) &&
        !room.buildingName.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !application) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
          <p className="text-red-500 mb-4">{error || 'Không tìm thấy đơn'}</p>
          <button onClick={() => router.back()} className="text-emerald-600 hover:text-emerald-700 font-medium">
            Quay lại
          </button>
        </div>
      </AdminLayout>
    );
  }

  const isPending = application.status === 'PENDING';

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors mt-1 text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-800">Đơn #{application.id}</h1>

              {application.status === 'PENDING' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full border border-amber-200">
                  <Clock className="w-3.5 h-3.5" />
                  Chờ duyệt
                </span>
              )}
              {application.status === 'APPROVED' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Đã duyệt
                </span>
              )}
              {application.status === 'REJECTED' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full border border-red-200">
                  <XCircle className="w-3.5 h-3.5" />
                  Từ chối
                </span>
              )}
              {application.status === 'CANCELLED' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                  Đã hủy
                </span>
              )}

              {application.type === 'NEW' ? (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                  Đăng ký mới
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                  Gia hạn
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {application.student.fullName} ({application.student.studentCode}) • Nộp{' '}
              {formatDateTime(application.createdAt)}
            </p>
          </div>
        </div>

        {isPending && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRejectModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
            >
              <ThumbsDown className="w-4 h-4" />
              Từ chối
            </button>
            <button
              onClick={openApproveModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ThumbsUp className="w-4 h-4" />
              Duyệt đơn
            </button>
          </div>
        )}
      </div>

      {/* Review result banner */}
      {application.status === 'APPROVED' && application.approvedRoom && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Đã duyệt vào phòng {application.approvedRoom.code} - {application.approvedRoom.building.name}
                </p>
                <p className="text-xs text-emerald-700">
                  {application.reviewedBy?.fullName} •{' '}
                  {application.reviewedAt && formatDateTime(application.reviewedAt)}
                </p>
              </div>
            </div>
            {application.approvedPriority && (
              <span className="px-3 py-1 bg-emerald-200 text-emerald-800 text-xs font-semibold rounded-full">
                Nguyện vọng {application.approvedPriority}
              </span>
            )}
          </div>
        </div>
      )}

      {application.status === 'REJECTED' && application.rejectionReason && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 mb-1">Đã từ chối</p>
              <p className="text-sm text-red-700">{application.rejectionReason}</p>
              <p className="text-xs text-red-600 mt-2">
                {application.reviewedBy?.fullName} •{' '}
                {application.reviewedAt && formatDateTime(application.reviewedAt)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Student info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-500" />
              Sinh viên
            </h3>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-lg">
                {application.student.fullName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/students/${application.student.id}`}
                  className="font-semibold text-slate-800 hover:text-emerald-600 truncate block"
                >
                  {application.student.fullName}
                </Link>
                <p className="text-sm text-slate-500">{application.student.studentCode}</p>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                    application.student.gender === 'MALE'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-pink-100 text-pink-700'
                  }`}
                >
                  {application.student.gender === 'MALE' ? 'Nam' : 'Nữ'}
                </span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <GraduationCap className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">{application.student.faculty || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Hash className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>{application.student.className || 'N/A'}</span>
              </div>
              {application.student.hometownProvince && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>
                    {application.student.hometownProvince}
                    {application.student.hometownDistance && ` (${application.student.hometownDistance} km)`}
                  </span>
                </div>
              )}
              {application.student.user.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{application.student.user.email}</span>
                </div>
              )}
              {application.student.user.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>{application.student.user.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Period */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              Đợt đăng ký
            </h3>
            <Link
              href={`/registration-periods/${application.period.id}`}
              className="block p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <p className="font-medium text-slate-800 text-sm">{application.period.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {application.period.academicYear} • HK{application.period.semester}
              </p>
            </Link>
          </div>
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority score - LARGE HIGHLIGHT */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                Điểm ưu tiên
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-amber-600">{application.priorityScore}</span>
                <span className="text-sm text-amber-700">điểm</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {application.priorityBreakdown.items
                .filter((i) => i.active)
                .map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-amber-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-sm text-slate-700 truncate">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 flex-shrink-0">
                      +{item.points}
                    </span>
                  </div>
                ))}
            </div>

            {application.priorityBreakdown.items.filter((i) => i.active).length === 0 && (
              <p className="text-sm text-slate-500 italic bg-white p-3 rounded-lg border border-amber-200">
                Không có tiêu chí ưu tiên nào
              </p>
            )}

            {/* Approved docs */}
            {application.approvedDocuments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-amber-200">
                <p className="text-xs font-semibold text-amber-700 uppercase mb-2">
                  Minh chứng đã duyệt
                </p>
                <div className="flex flex-wrap gap-2">
                  {application.approvedDocuments.map((doc, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-amber-200 rounded-full text-xs text-slate-700"
                    >
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      {DOC_TYPE_LABELS[doc.type] || doc.type}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Renewal info */}
          {application.type === 'RENEWAL' && application.currentRoom && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-purple-500" />
                Thông tin gia hạn
              </h3>
              <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Home className="w-6 h-6 text-purple-600" />
                  <div>
                    <p className="text-xs text-purple-700 font-medium uppercase">Phòng đang ở</p>
                    <p className="font-semibold text-slate-800">
                      {application.currentRoom.code} - {application.currentRoom.building.name}
                    </p>
                  </div>
                </div>
                {application.wantSameRoom && (
                  <span className="px-3 py-1 bg-purple-200 text-purple-800 text-xs font-semibold rounded-full">
                    Muốn ở lại
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Room choices */}
          {application.roomChoices.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5 text-emerald-500" />
                Nguyện vọng phòng
              </h3>
              <div className="space-y-2">
                {application.roomChoices.map((choice) => {
                  const isApproved = application.approvedRoom?.id === choice.room.id;
                  return (
                    <div
                      key={choice.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isApproved
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 flex items-center justify-center text-sm font-bold rounded-full ${
                            isApproved
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white border border-slate-300 text-slate-600'
                          }`}
                        >
                          {choice.priority}
                        </span>
                        <div>
                          <p className="font-medium text-slate-800">
                            {choice.room.code} - {choice.room.building.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Tầng {choice.room.floor} •{' '}
                            {choice.room.roomType === 'AIR_CONDITIONED' ? 'Điều hòa' : 'Thường'} •{' '}
                            {formatCurrency(choice.room.pricePerMonth)}
                          </p>
                        </div>
                      </div>
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Được duyệt
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== APPROVE MODAL ==================== */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowApproveModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Duyệt đơn đăng ký</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chọn phòng để xếp cho {application.student.fullName}
                </p>
              </div>
              <button
                onClick={() => setShowApproveModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-slate-200 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm phòng..."
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterPreferenceOnly}
                    onChange={(e) => setFilterPreferenceOnly(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  Chỉ nguyện vọng của SV
                </label>
              </div>
            </div>

            {/* Rooms list */}
            <div className="flex-1 overflow-y-auto p-4">
              {roomsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="text-center py-12">
                  <Home className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Không có phòng phù hợp</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRooms.map((room) => {
                    const isSelected = selectedRoomId === room.id;
                    const isFull = room.availableSlots === 0;
                    return (
                      <button
                        key={room.id}
                        onClick={() => !isFull && setSelectedRoomId(room.id)}
                        disabled={isFull}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 text-left transition-colors ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50'
                            : isFull
                            ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                            : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isSelected ? 'bg-emerald-500' : 'bg-slate-100'
                            }`}
                          >
                            <Home
                              className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-600'}`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-800">
                                {room.code} - {room.buildingName}
                              </p>
                              {room.isUserPreference && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                                  <Sparkles className="w-3 h-3" />
                                  NV{room.preferencePriority}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              Tầng {room.floor} •{' '}
                              {room.roomType === 'AIR_CONDITIONED' ? 'Điều hòa' : 'Thường'} •{' '}
                              {formatCurrency(room.pricePerMonth)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-semibold ${
                              isFull
                                ? 'text-red-500'
                                : room.availableSlots <= 2
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {room.currentOccupants}/{room.capacity}
                          </p>
                          <p className="text-xs text-slate-500">
                            {isFull ? 'Đã đầy' : `Còn ${room.availableSlots}`}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleApprove}
                disabled={!selectedRoomId || processing}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 rounded-lg flex items-center justify-center gap-2"
              >
                {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                <CheckCircle className="w-4 h-4" />
                Duyệt đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== REJECT MODAL ==================== */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <ThumbsDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Từ chối đơn</h3>
                <p className="text-xs text-slate-500">
                  {application.student.fullName} ({application.student.studentCode})
                </p>
              </div>
            </div>

            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Lý do từ chối <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="VD: Không đủ điểm ưu tiên, phòng đã đầy..."
              rows={4}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
            <p className="text-xs text-slate-500 mt-1">Lý do sẽ được gửi cho sinh viên</p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processing}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-lg flex items-center justify-center gap-2"
              >
                {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

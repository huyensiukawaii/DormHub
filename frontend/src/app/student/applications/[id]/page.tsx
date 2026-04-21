'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import StudentLayout from '@/components/layouts/StudentLayout';
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
  MapPin,
  Phone,
  Mail,
  Hash,
  Trash2,
  Download,
  ExternalLink,
  FileSignature,
  Info,
  Award,
  ChevronRight,
  PartyPopper,
} from 'lucide-react';
import { api } from '@/lib/api';

type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type ApplicationType = 'NEW' | 'RENEWAL';

interface ApplicationDetail {
  id: number;
  type: ApplicationType;
  status: ApplicationStatus;
  priorityScore: number;
  createdAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  wantSameRoom: boolean;

  // Priority flags
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
    email: string | null;
    phone: string | null;
    user: { email: string; phone: string | null; avatarUrl: string | null };
  };

  period: {
    id: number;
    code: string;
    name: string;
    academicYear: string;
    semester: number;
    startDate: string;
    endDate: string;
    moveInDate: string | null;
    moveOutDate: string | null;
    allowRoomPreference: boolean;
  };

  currentRoom: {
    id: number;
    code: string;
    floor: number;
    building: { id: number; code: string; name: string };
  } | null;

  approvedRoom: {
    id: number;
    code: string;
    floor: number;
    roomType: 'STANDARD' | 'AIR_CONDITIONED';
    pricePerMonth: number;
    building: { id: number; code: string; name: string };
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

  reviewedBy: { id: number; fullName: string; email: string } | null;

  contract: {
    id: number;
    code: string;
    status: string;
    startDate: string;
    endDate: string;
  } | null;

  priorityBreakdown: {
    items: { label: string; points: number; active: boolean }[];
    totalPoints: number;
  };

  approvedDocuments: Array<{ type: string; fileName: string }>;
}

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bg: string; icon: any; border: string }> = {
  PENDING: { label: 'Chờ duyệt', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock },
  APPROVED: { label: 'Đã duyệt', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  REJECTED: { label: 'Từ chối', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle },
  CANCELLED: { label: 'Đã hủy', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', icon: XCircle },
};

export default function StudentApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const appId = params.id as string;

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [appId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/student/applications/${appId}/detail`);
      setApplication(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải chi tiết đơn');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.delete(`/student/applications/${appId}`);
      router.push('/student/applications');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể hủy đơn');
      setCancelling(false);
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

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </StudentLayout>
    );
  }

  if (error || !application) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
          <p className="text-red-500 mb-4">{error || 'Không tìm thấy đơn'}</p>
          <Link href="/student/applications" className="text-amber-600 hover:text-amber-700 font-medium">
            Quay lại danh sách
          </Link>
        </div>
      </StudentLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[application.status];
  const StatusIcon = statusConfig.icon;

  return (
    <StudentLayout>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/student/applications"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors mt-1 text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-800">
                Đơn đăng ký #{application.id}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                {statusConfig.label}
              </span>
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
            <p className="text-sm text-slate-500">{application.period.name}</p>
          </div>
        </div>

        {application.status === 'PENDING' && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Hủy đơn
          </button>
        )}
      </div>

      {/* Result banner */}
      {application.status === 'APPROVED' && application.approvedRoom && (
        <div className="mb-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <PartyPopper className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-emerald-800 mb-1">
                Chúc mừng! Đơn của bạn đã được duyệt
              </h2>
              <p className="text-sm text-emerald-700 mb-4">
                Bạn sẽ được xếp vào phòng dưới đây. Vui lòng đến nhận phòng vào ngày{' '}
                {application.period.moveInDate && formatDate(application.period.moveInDate)}.
              </p>

              <div className="bg-white rounded-lg p-4 border border-emerald-200">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Home className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-emerald-700 font-medium">PHÒNG ĐƯỢC DUYỆT</p>
                      <p className="text-xl font-bold text-slate-800">
                        {application.approvedRoom.code} - {application.approvedRoom.building.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Tầng {application.approvedRoom.floor} •{' '}
                        {application.approvedRoom.roomType === 'AIR_CONDITIONED' ? 'Điều hòa' : 'Thường'} •{' '}
                        {formatCurrency(application.approvedRoom.pricePerMonth)}/tháng
                      </p>
                    </div>
                  </div>
                  {application.approvedPriority && (
                    <span className="px-3 py-1 bg-emerald-200 text-emerald-800 text-xs font-semibold rounded-full">
                      NV{application.approvedPriority}
                    </span>
                  )}
                </div>
              </div>

              {application.contract && (
                <Link
                  href={`/student/contracts/${application.contract.id}`}
                  className="inline-flex items-center gap-2 mt-3 text-sm text-emerald-700 hover:text-emerald-800 font-medium"
                >
                  <FileSignature className="w-4 h-4" />
                  Xem hợp đồng {application.contract.code}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {application.status === 'PENDING' && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800">Đang chờ xét duyệt</h3>
              <p className="text-xs text-amber-700 mt-1">
                Đơn của bạn đã được gửi và đang chờ ban quản lý xét duyệt. Kết quả sẽ được thông báo qua email.
              </p>
            </div>
          </div>
        </div>
      )}

      {application.status === 'REJECTED' && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Đơn đã bị từ chối</h3>
              {application.rejectionReason && (
                <div className="mt-2 p-3 bg-white border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700 uppercase font-semibold mb-1">Lý do</p>
                  <p className="text-sm text-slate-700">{application.rejectionReason}</p>
                </div>
              )}
              {application.reviewedBy && (
                <p className="text-xs text-red-600 mt-2">
                  Người duyệt: {application.reviewedBy.fullName} •{' '}
                  {application.reviewedAt && formatDateTime(application.reviewedAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Student & Period info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Student info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-amber-500" />
              Thông tin sinh viên
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-lg">
                {application.student.fullName.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{application.student.fullName}</p>
                <p className="text-sm text-slate-500">{application.student.studentCode}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <GraduationCap className="w-4 h-4 text-slate-400" />
                <span>{application.student.faculty || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Hash className="w-4 h-4 text-slate-400" />
                <span>{application.student.className || 'N/A'}</span>
              </div>
              {application.student.user.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{application.student.user.email}</span>
                </div>
              )}
              {application.student.user.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{application.student.user.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Period info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              Đợt đăng ký
            </h3>
            <p className="font-medium text-slate-800 mb-1">{application.period.name}</p>
            <p className="text-xs text-slate-500 mb-4">
              Năm học {application.period.academicYear} • HK{application.period.semester}
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Mở đăng ký:</span>
                <span className="text-slate-700 font-medium">{formatDate(application.period.startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Đóng đăng ký:</span>
                <span className="text-slate-700 font-medium">{formatDate(application.period.endDate)}</span>
              </div>
              {application.period.moveInDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngày nhận phòng:</span>
                  <span className="text-emerald-600 font-medium">{formatDate(application.period.moveInDate)}</span>
                </div>
              )}
              {application.period.moveOutDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngày trả phòng:</span>
                  <span className="text-slate-700 font-medium">{formatDate(application.period.moveOutDate)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Submission meta */}
          <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 space-y-1">
            <p>
              <span className="font-medium text-slate-600">Ngày nộp:</span>{' '}
              {formatDateTime(application.createdAt)}
            </p>
            {application.reviewedAt && (
              <p>
                <span className="font-medium text-slate-600">Ngày duyệt:</span>{' '}
                {formatDateTime(application.reviewedAt)}
              </p>
            )}
            {application.reviewedBy && (
              <p>
                <span className="font-medium text-slate-600">Người duyệt:</span>{' '}
                {application.reviewedBy.fullName}
              </p>
            )}
          </div>
        </div>

        {/* Right column: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority score */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Điểm ưu tiên
              </h3>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 rounded-lg">
                <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
                <span className="text-lg font-bold text-amber-700">{application.priorityScore}</span>
                <span className="text-xs text-amber-600">điểm</span>
              </div>
            </div>

            <div className="space-y-2">
              {application.priorityBreakdown.items
                .filter((item) => item.active)
                .map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 bg-emerald-50 border border-emerald-100 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-slate-700">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">+{item.points}</span>
                  </div>
                ))}

              {application.priorityBreakdown.items.filter((i) => i.active).length === 0 && (
                <p className="text-sm text-slate-500 italic py-2">Không có tiêu chí ưu tiên nào được áp dụng</p>
              )}
            </div>

            {/* Approved documents linked */}
            {application.approvedDocuments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Minh chứng đã duyệt ({application.approvedDocuments.length})
                </p>
                <div className="space-y-1.5">
                  {application.approvedDocuments.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{doc.fileName}</span>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Renewal: Current room */}
          {application.type === 'RENEWAL' && application.currentRoom && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-purple-500" />
                Thông tin gia hạn
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Phòng đang ở</p>
                  <div className="flex items-center gap-3">
                    <Home className="w-5 h-5 text-slate-600" />
                    <div>
                      <p className="font-semibold text-slate-800">
                        {application.currentRoom.code} - {application.currentRoom.building.name}
                      </p>
                      <p className="text-xs text-slate-500">Tầng {application.currentRoom.floor}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Nguyện vọng gia hạn</p>
                  <p className="text-sm text-slate-700">
                    {application.wantSameRoom ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Muốn ở lại phòng hiện tại
                      </span>
                    ) : (
                      <span className="text-slate-600">Chấp nhận đổi phòng khác</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Room preferences */}
          {application.roomChoices.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5 text-amber-500" />
                Nguyện vọng phòng ({application.roomChoices.length})
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
                            {formatCurrency(choice.room.pricePerMonth)}/tháng
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

              {application.status === 'APPROVED' &&
                application.approvedRoom &&
                !application.roomChoices.some((c) => c.room.id === application.approvedRoom?.id) && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700 flex items-start gap-2">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      Ban quản lý đã xếp bạn vào một phòng khác không có trong nguyện vọng ban đầu.
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCancelModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Hủy đơn đăng ký?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Đơn đã hủy không thể khôi phục. Bạn sẽ cần nộp đơn mới nếu đổi ý.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg flex items-center justify-center gap-2"
                >
                  {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                  Hủy đơn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}

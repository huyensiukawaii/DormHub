'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import StudentLayout from '@/components/layouts/StudentLayout';
import {
  FileText,
  Calendar,
  Star,
  Home,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';

type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type ApplicationType = 'NEW' | 'RENEWAL';

interface RoomPreference {
  priority: number;
  room: {
    id: number;
    code: string;
    buildingName: string;
  };
}

interface Application {
  id: number;
  period: {
    id: number;
    code: string;
    name: string;
    academicYear: string;
    semester: number;
  };
  applicationType: ApplicationType;
  priorityScore: number;
  status: ApplicationStatus;
  roomPreferences: RoomPreference[];
  assignedRoom?: {
    id: number;
    code: string;
    buildingName: string;
  };
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bg: string; icon: any }> = {
  PENDING: { label: 'Chờ duyệt', color: 'text-amber-600', bg: 'bg-amber-100', icon: Clock },
  APPROVED: { label: 'Đã duyệt', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle },
  REJECTED: { label: 'Từ chối', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
  CANCELLED: { label: 'Đã hủy', color: 'text-slate-600', bg: 'bg-slate-100', icon: XCircle },
};

export default function MyApplicationsPage() {
  const searchParams = useSearchParams();
  const justSubmitted = searchParams.get('success') === 'true';

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/student/applications');
      setApplications(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách đơn đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    const config = STATUS_CONFIG[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getTypeBadge = (type: ApplicationType) => {
    if (type === 'NEW') {
      return <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded-full">Mới</span>;
    }
    return <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-600 rounded-full">Gia hạn</span>;
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

  return (
    <StudentLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Đơn đăng ký của tôi</h1>
          <p className="text-sm text-slate-500 mt-1">Lịch sử các đơn đăng ký KTX</p>
        </div>
        <Link
          href="/student/register"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <FileText className="w-4 h-4" />
          Đăng ký mới
        </Link>
      </div>

      {/* Success message */}
      {justSubmitted && (
        <div className="flex items-center gap-2 p-4 mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
          <CheckCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">Đã gửi đơn đăng ký thành công!</p>
            <p className="text-sm text-emerald-600">Kết quả sẽ được thông báo khi có cập nhật.</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 mb-6 bg-red-50 border border-red-200 text-red-600 rounded-xl">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Applications list */}
      {applications.length === 0 && !error ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Chưa có đơn đăng ký</h3>
          <p className="text-sm text-slate-500 mb-4">Bạn chưa nộp đơn đăng ký KTX nào.</p>
          <Link
            href="/student/register"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg"
          >
            Đăng ký ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app, index) => (
            <Link key={app.id} href={`/student/applications/${app.id}`} className="block bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-amber-300 hover:shadow-sm transition-all">
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-slate-800">{app.period.name}</h3>
                    {getTypeBadge(app.applicationType)}
                    {index === 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                        Mới nhất
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Ngày nộp: {formatDate(app.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                    <Star className="w-4 h-4" />
                    {app.priorityScore} điểm
                  </div>
                  {getStatusBadge(app.status)}
                </div>
              </div>

              {/* Body */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Room preferences */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">NGUYỆN VỌNG</h4>
                  {app.roomPreferences.length > 0 ? (
                    <div className="space-y-1.5">
                      {app.roomPreferences.map((pref) => (
                        <div key={pref.priority} className="flex items-center gap-2 text-sm">
                          <span className="w-5 h-5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full flex items-center justify-center">
                            {pref.priority}
                          </span>
                          <span className="text-slate-700">{pref.room.code} - {pref.room.buildingName}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Không có nguyện vọng phòng</p>
                  )}
                </div>

                {/* Result */}
                <div>
                  {app.status === 'APPROVED' && app.assignedRoom && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                        PHÒNG ĐƯỢC DUYỆT
                      </h4>
                      <div className="flex items-center gap-2">
                        <Home className="w-5 h-5 text-emerald-600" />
                        <span className="text-lg font-bold text-emerald-700">
                          {app.assignedRoom.code} - {app.assignedRoom.buildingName}
                        </span>
                      </div>
                    </div>
                  )}

                  {app.status === 'PENDING' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">TRẠNG THÁI</h4>
                      <p className="text-sm text-amber-700">Đang chờ xét duyệt. Kết quả sẽ được thông báo sớm.</p>
                    </div>
                  )}

                  {app.status === 'REJECTED' && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">LÝ DO TỪ CHỐI</h4>
                      <p className="text-sm text-red-700">
                        {app.rejectionReason || 'Không đạt điểm ưu tiên tối thiểu'}
                      </p>
                    </div>
                  )}

                  {app.status === 'CANCELLED' && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="text-sm text-slate-500">Đơn đã bị hủy.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <span className="inline-flex items-center gap-1 text-sm text-amber-600 font-medium">
                  Xem chi tiết
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </StudentLayout>
  );
}

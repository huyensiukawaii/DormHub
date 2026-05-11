'use client';

import { useState, useEffect, Suspense } from 'react';
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

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bg: string; bar: string; icon: any }> = {
  PENDING:   { label: 'Chờ duyệt', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',   bar: 'bg-amber-400',   icon: Clock },
  APPROVED:  { label: 'Đã duyệt',  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', bar: 'bg-emerald-500', icon: CheckCircle },
  REJECTED:  { label: 'Từ chối',   color: 'text-red-700',     bg: 'bg-red-50 border-red-200',       bar: 'bg-red-400',     icon: XCircle },
  CANCELLED: { label: 'Đã hủy',    color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200',   bar: 'bg-slate-300',   icon: XCircle },
};

function MyApplicationsPage() {
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

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

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
          <p className="text-sm text-slate-500 mt-0.5">Lịch sử các đơn đăng ký KTX</p>
        </div>
        <Link
          href="/student/register"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <FileText className="w-4 h-4" />
          Đăng ký mới
        </Link>
      </div>

      {/* Success banner */}
      {justSubmitted && (
        <div className="flex items-center gap-3 p-4 mb-5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Đã gửi đơn đăng ký thành công!</p>
            <p className="text-xs text-emerald-600">Kết quả sẽ được thông báo khi có cập nhật.</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 mb-5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {applications.length === 0 && !error ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 mb-1">Chưa có đơn đăng ký</h3>
          <p className="text-sm text-slate-400 mb-4">Bạn chưa nộp đơn đăng ký KTX nào.</p>
          <Link
            href="/student/register"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg"
          >
            Đăng ký ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {applications.map((app, index) => {
            const cfg = STATUS_CONFIG[app.status];
            const StatusIcon = cfg.icon;
            const firstRoom = app.roomPreferences[0];

            return (
              <Link
                key={app.id}
                href={`/student/applications/${app.id}`}
                className="group flex items-stretch bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all overflow-hidden"
              >
                {/* Status bar */}
                <div className={`w-1 flex-shrink-0 ${cfg.bar}`} />

                {/* Content */}
                <div className="flex-1 flex items-center gap-4 px-4 py-3.5 min-w-0">
                  {/* Left: text info */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: period name + type badge */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {app.period.name}
                      </span>
                      <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                        app.applicationType === 'NEW'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-purple-100 text-purple-600'
                      }`}>
                        {app.applicationType === 'NEW' ? 'Mới' : 'Gia hạn'}
                      </span>
                      {index === 0 && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full flex-shrink-0">
                          Mới nhất
                        </span>
                      )}
                    </div>

                    {/* Row 2: date + room info */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(app.createdAt)}
                      </span>

                      {app.status === 'APPROVED' && app.assignedRoom ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <Home className="w-3 h-3" />
                          {app.assignedRoom.code} · {app.assignedRoom.buildingName}
                        </span>
                      ) : firstRoom ? (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Home className="w-3 h-3" />
                          NV1: {firstRoom.room.code}
                          {app.roomPreferences.length > 1 && (
                            <span className="text-slate-300">+{app.roomPreferences.length - 1}</span>
                          )}
                        </span>
                      ) : null}

                      {app.status === 'REJECTED' && app.rejectionReason && (
                        <span className="text-red-400 truncate max-w-[200px]">
                          · {app.rejectionReason}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: score + status + arrow */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {app.priorityScore > 0 && (
                      <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                        <span className="text-xs font-bold text-amber-600">{app.priorityScore}</span>
                      </div>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${cfg.bg} ${cfg.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-400 transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </StudentLayout>
  );
}

export default function MyApplicationsPageWrapper() { return <Suspense fallback={null}><MyApplicationsPage /></Suspense>; }

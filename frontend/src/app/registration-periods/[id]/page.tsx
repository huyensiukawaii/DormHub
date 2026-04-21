'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  ArrowLeft,
  Pencil,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  CalendarDays,
  CalendarCheck,
  Home,
  FileText,
  TrendingUp,
  BarChart3,
  Play,
  Pause,
  Settings,
} from 'lucide-react';
import { api } from '@/lib/api';

type PeriodStatus = 'DRAFT' | 'UPCOMING' | 'OPEN' | 'CLOSED' | 'CANCELLED';

interface RegistrationPeriod {
  id: number;
  code: string;
  name: string;
  academicYear: string;
  semester: number;
  description?: string;
  startDate: string;
  endDate: string;
  moveInDate?: string;
  moveOutDate?: string;
  maxApplicationsPerStudent: number;
  allowRoomPreference: boolean;
  autoAssignRoom: boolean;
  targetAdmissionYears?: number[];
  status: PeriodStatus;
  totalApplications: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  isActive: boolean;
  daysRemaining: number | null;
  createdBy?: { id: number; fullName: string };
  createdAt: string;
  updatedAt: string;
}

interface PeriodStats {
  totalApplications: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  cancelledCount: number;
  maleCount: number;
  femaleCount: number;
  applicationsByYear: { year: number; count: number }[];
  dailyApplications: { date: string; count: number }[];
}

const STATUS_CONFIG: Record<PeriodStatus, { label: string; color: string; bg: string; icon: any }> = {
  DRAFT: { label: 'Nháp', color: 'text-slate-600', bg: 'bg-slate-100', icon: FileText },
  UPCOMING: { label: 'Sắp mở', color: 'text-blue-600', bg: 'bg-blue-100', icon: Clock },
  OPEN: { label: 'Đang mở', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: Play },
  CLOSED: { label: 'Đã đóng', color: 'text-amber-600', bg: 'bg-amber-100', icon: Pause },
  CANCELLED: { label: 'Đã hủy', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
};

export default function RegistrationPeriodDetailPage() {
  const router = useRouter();
  const params = useParams();
  const periodId = params.id as string;

  const [period, setPeriod] = useState<RegistrationPeriod | null>(null);
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [periodId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [periodRes, statsRes] = await Promise.all([
        api.get(`/registration-periods/${periodId}`),
        api.get(`/registration-periods/${periodId}/stats`),
      ]);
      setPeriod(periodRes.data);
      setStats(statsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải thông tin');
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

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: PeriodStatus) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full ${config.bg} ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  // Calculate progress percentage
  const getTimeProgress = () => {
    if (!period) return 0;
    const now = new Date().getTime();
    const start = new Date(period.startDate).getTime();
    const end = new Date(period.endDate).getTime();
    
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
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

  if (error || !period) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-red-500 mb-4">{error || 'Không tìm thấy đợt đăng ký'}</p>
          <button onClick={() => router.push('/registration-periods')} className="text-emerald-600 hover:text-emerald-700 font-medium">
            Quay lại danh sách
          </button>
        </div>
      </AdminLayout>
    );
  }

  const timeProgress = getTimeProgress();

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg transition-colors mt-1">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-800">{period.name}</h1>
              {getStatusBadge(period.status)}
            </div>
            <p className="text-sm text-slate-500">
              {period.code} • {period.academicYear} • Học kỳ {period.semester}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/applications?periodId=${period.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            Xem đơn đăng ký
          </Link>
          <button
            onClick={() => router.push(`/registration-periods?edit=${period.id}`)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Chỉnh sửa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Time Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
              Thời gian đăng ký
            </h3>

            {/* Progress bar */}
            {period.status === 'OPEN' && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Tiến độ</span>
                  <span>{timeProgress}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${timeProgress}%` }}
                  />
                </div>
                {period.daysRemaining !== null && (
                  <p className="text-xs text-emerald-600 font-medium mt-1">
                    Còn {period.daysRemaining} ngày nữa
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Play className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Bắt đầu</p>
                  <p className="text-sm font-medium text-slate-800">{formatDateTime(period.startDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                  <Pause className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Kết thúc</p>
                  <p className="text-sm font-medium text-slate-800">{formatDateTime(period.endDate)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Move in/out dates */}
          {(period.moveInDate || period.moveOutDate) && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5 text-emerald-600" />
                Thời gian ở KTX
              </h3>
              <div className="space-y-3">
                {period.moveInDate && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CalendarCheck className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Nhận phòng</p>
                      <p className="text-sm font-medium text-slate-800">{formatDate(period.moveInDate)}</p>
                    </div>
                  </div>
                )}
                {period.moveOutDate && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                      <CalendarDays className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Trả phòng</p>
                      <p className="text-sm font-medium text-slate-800">{formatDate(period.moveOutDate)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Config */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600" />
              Cấu hình
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Số đơn tối đa/SV</span>
                <span className="text-sm font-medium text-slate-800">{period.maxApplicationsPerStudent}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Chọn phòng ưu tiên</span>
                <span className={`text-sm font-medium ${period.allowRoomPreference ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {period.allowRoomPreference ? 'Có' : 'Không'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Tự động xếp phòng</span>
                <span className={`text-sm font-medium ${period.autoAssignRoom ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {period.autoAssignRoom ? 'Có' : 'Không'}
                </span>
              </div>
            </div>

            {period.targetAdmissionYears && period.targetAdmissionYears.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-600 mb-2">Đối tượng (Năm nhập học):</p>
                <div className="flex flex-wrap gap-1">
                  {period.targetAdmissionYears.map((year) => (
                    <span key={year} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                      K{year - 1955}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {period.description && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-base font-semibold text-slate-800 mb-3">Mô tả</h3>
              <p className="text-sm text-slate-600 whitespace-pre-line">{period.description}</p>
            </div>
          )}

          {/* Meta */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="text-xs text-slate-500 space-y-1">
              <p>Tạo bởi: {period.createdBy?.fullName || 'N/A'}</p>
              <p>Ngày tạo: {formatDateTime(period.createdAt)}</p>
              <p>Cập nhật: {formatDateTime(period.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Right column - Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <FileText className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{period.totalApplications}</p>
              <p className="text-xs text-slate-500">Tổng đơn</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-600">{period.approvedCount}</p>
              <p className="text-xs text-slate-500">Đã duyệt</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-600">{period.pendingCount}</p>
              <p className="text-xs text-slate-500">Chờ duyệt</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">{period.rejectedCount}</p>
              <p className="text-xs text-slate-500">Từ chối</p>
            </div>
          </div>

          {/* Charts */}
          {stats && (
            <>
              {/* Gender distribution */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  Phân bổ theo giới tính
                </h3>
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">♂</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{stats.maleCount}</p>
                      <p className="text-xs text-slate-500">Nam</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">♀</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-pink-600">{stats.femaleCount}</p>
                      <p className="text-xs text-slate-500">Nữ</p>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(stats.maleCount / (stats.maleCount + stats.femaleCount || 1)) * 100}%` }}
                      />
                      <div
                        className="h-full bg-pink-500"
                        style={{ width: `${(stats.femaleCount / (stats.maleCount + stats.femaleCount || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* By year */}
              {stats.applicationsByYear.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-600" />
                    Phân bổ theo khóa
                  </h3>
                  <div className="space-y-3">
                    {stats.applicationsByYear.map((item) => {
                      const maxCount = Math.max(...stats.applicationsByYear.map((i) => i.count));
                      const percentage = (item.count / maxCount) * 100;
                      return (
                        <div key={item.year} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-slate-600 w-12">K{item.year - 1955}</span>
                          <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-lg flex items-center justify-end pr-2"
                              style={{ width: `${percentage}%` }}
                            >
                              <span className="text-xs font-medium text-white">{item.count}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Daily trend */}
              {stats.dailyApplications.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    Số đơn theo ngày (14 ngày gần nhất)
                  </h3>
                  <div className="h-40 flex items-end gap-1">
                    {stats.dailyApplications.map((item, index) => {
                      const maxCount = Math.max(...stats.dailyApplications.map((i) => i.count));
                      const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                      return (
                        <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs text-slate-600">{item.count}</span>
                          <div
                            className="w-full bg-emerald-500 rounded-t"
                            style={{ height: `${height}%`, minHeight: item.count > 0 ? '4px' : '0' }}
                          />
                          <span className="text-xs text-slate-400 transform -rotate-45 origin-top-left whitespace-nowrap">
                            {new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Thao tác nhanh</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                href={`/applications?periodId=${period.id}`}
                className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-emerald-50 rounded-lg transition-colors group"
              >
                <FileText className="w-6 h-6 text-slate-500 group-hover:text-emerald-600" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-emerald-700">Tất cả đơn</span>
              </Link>
              <Link
                href={`/applications?periodId=${period.id}&status=PENDING`}
                className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-amber-50 rounded-lg transition-colors group"
              >
                <Clock className="w-6 h-6 text-slate-500 group-hover:text-amber-600" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-amber-700">Chờ duyệt</span>
              </Link>
              <Link
                href={`/applications?periodId=${period.id}&status=APPROVED`}
                className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-emerald-50 rounded-lg transition-colors group"
              >
                <CheckCircle className="w-6 h-6 text-slate-500 group-hover:text-emerald-600" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-emerald-700">Đã duyệt</span>
              </Link>
              <Link
                href={`/rooms?status=AVAILABLE`}
                className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-blue-50 rounded-lg transition-colors group"
              >
                <Home className="w-6 h-6 text-slate-500 group-hover:text-blue-600" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-blue-700">Phòng trống</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
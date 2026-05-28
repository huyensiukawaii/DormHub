'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StudentLayout from '@/components/layouts/StudentLayout';
import { StudentDashboardSkeleton } from '@/components/Skeleton';
import {
  Home,
  Calendar,
  Receipt,
  Wrench,
  ClipboardList,
  ChevronRight,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSignature,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

interface DashboardData {
  student: { id: number; fullName: string; studentCode: string; className: string };
  currentRoom: { id: number; code: string; buildingName: string } | null;
  currentContract: { id: number; endDate: string; daysRemaining: number } | null;
  unpaidInvoice: { id: number; amount: number; dueDate: string; status: string; daysUntilDue: number } | null;
  unpaidInvoicesCount: number;
  pendingTicketsCount: number;
  pendingTransfer: { id: number; code: string; toRoomCode: string } | null;
  recentInvoices: Array<{ id: number; month: string; amount: number; dueDate: string; status: 'PENDING' | 'PAID' | 'OVERDUE' }>;
  recentTickets: Array<{ id: number; title: string; category: string; status: string; createdAt: string }>;
}

type TimelineItem =
  | { kind: 'invoice'; id: number; title: string; subtitle: string; status: string; date: string }
  | { kind: 'ticket'; id: number; title: string; subtitle: string; status: string; date: string };

const CATEGORY_LABEL: Record<string, string> = {
  ELECTRICAL: 'Điện', PLUMBING: 'Nước', AIR_CONDITIONER: 'Điều hòa',
  DOOR_LOCK: 'Khóa cửa', FURNITURE: 'Đồ dùng', OTHER: 'Khác',
};

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getStoredUser()?.role !== 'STUDENT') return;
    api.get('/student/dashboard')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + ' đ';
  const formatDate = (s: string) => new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  // Tính % vòng countdown hợp đồng (max 365 ngày)
  const contractDays = data?.currentContract?.daysRemaining ?? 0;
  const contractPct = Math.min(100, Math.round((contractDays / 365) * 100));
  const contractColor = contractDays <= 30 ? 'text-red-500' : contractDays <= 90 ? 'text-amber-500' : 'text-emerald-500';
  const contractRingColor = contractDays <= 30 ? '#ef4444' : contractDays <= 90 ? '#f59e0b' : '#10b981';

  // Gộp invoices + tickets thành timeline
  const timeline: TimelineItem[] = [
    ...(data?.recentInvoices ?? []).map((inv) => ({
      kind: 'invoice' as const,
      id: inv.id,
      title: `Hoá đơn ${inv.month}`,
      subtitle: formatCurrency(inv.amount),
      status: inv.status,
      date: inv.dueDate,
    })),
    ...(data?.recentTickets ?? []).map((t) => ({
      kind: 'ticket' as const,
      id: t.id,
      title: t.title,
      subtitle: CATEGORY_LABEL[t.category] ?? t.category,
      status: t.status,
      date: t.createdAt,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

  const invoiceStatusConfig: Record<string, { label: string; cls: string }> = {
    PAID:    { label: 'Đã TT',   cls: 'bg-emerald-100 text-emerald-700' },
    PENDING: { label: 'Chưa TT', cls: 'bg-amber-100 text-amber-700' },
    OVERDUE: { label: 'Quá hạn', cls: 'bg-red-100 text-red-700' },
  };
  const ticketStatusConfig: Record<string, { label: string; cls: string }> = {
    NEW:         { label: 'Mới',        cls: 'bg-amber-100 text-amber-700' },
    IN_PROGRESS: { label: 'Đang xử lý', cls: 'bg-blue-100 text-blue-700' },
    COMPLETED:   { label: 'Xong',       cls: 'bg-emerald-100 text-emerald-700' },
    REJECTED:    { label: 'Từ chối',    cls: 'bg-slate-100 text-slate-600' },
  };

  return (
    <StudentLayout>
      {loading ? (
        <StudentDashboardSkeleton />
      ) : (
        <>
          {/* Welcome header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Xin chào, {data?.student.fullName}!</h1>
            <p className="text-sm text-slate-500 mt-1 capitalize">{today}</p>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

            {/* Phòng */}
            <Link href="/student/room" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-sm transition-all block">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Home className="w-5 h-5 text-slate-600" />
                </div>
                {data?.currentRoom && <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">Đang ở</span>}
              </div>
              <p className="text-xs text-slate-500 mt-3">Phòng hiện tại</p>
              {data?.currentRoom ? (
                <>
                  <p className="text-xl font-bold text-slate-800">{data.currentRoom.code}</p>
                  <p className="text-xs text-slate-500">{data.currentRoom.buildingName}</p>
                </>
              ) : (
                <p className="text-sm text-slate-400 mt-1">Chưa có phòng</p>
              )}
            </Link>

            {/* Hợp đồng — countdown ring */}
            <Link href="/student/contracts" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-sm transition-all block">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-slate-600" />
                </div>
                {data?.currentContract && contractDays <= 30 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">Sắp HH</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-3">Hợp đồng đến ngày</p>
              {data?.currentContract ? (
                <>
                  <p className="text-xl font-bold text-slate-800">{formatDate(data.currentContract.endDate)}</p>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${contractPct}%`, backgroundColor: contractRingColor }}
                    />
                  </div>
                  <p className={`text-xs mt-1 font-medium ${contractColor}`}>Còn {contractDays} ngày</p>
                </>
              ) : (
                <p className="text-sm text-slate-400 mt-1">Chưa có hợp đồng</p>
              )}
            </Link>

            {/* Hoá đơn */}
            <Link href="/student/invoices"
              className={`rounded-xl border p-5 transition-all hover:shadow-sm block ${data?.unpaidInvoice ? 'bg-amber-50 border-amber-200 hover:border-amber-300' : 'bg-white border-slate-200 hover:border-amber-300'}`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${data?.unpaidInvoice ? 'bg-amber-100' : 'bg-slate-100'}`}>
                  <Receipt className={`w-5 h-5 ${data?.unpaidInvoice ? 'text-amber-600' : 'text-slate-600'}`} />
                </div>
                {(data?.unpaidInvoicesCount ?? 0) > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-200 text-amber-700 rounded-full">{data!.unpaidInvoicesCount} chưa TT</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-3">Hoá đơn chưa thanh toán</p>
              {data?.unpaidInvoice ? (
                <>
                  <p className="text-xl font-bold text-amber-700">{formatCurrency(data.unpaidInvoice.amount)}</p>
                  <p className={`text-xs ${data.unpaidInvoice.daysUntilDue < 0 ? 'text-red-600 font-medium' : 'text-amber-600'}`}>
                    {data.unpaidInvoice.daysUntilDue < 0
                      ? `Quá hạn ${Math.abs(data.unpaidInvoice.daysUntilDue)} ngày`
                      : `Hạn: ${data.unpaidInvoice.daysUntilDue} ngày nữa`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Đã thanh toán hết</p>
              )}
            </Link>

            {/* Sự cố */}
            <Link href="/student/tickets" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-sm transition-all block">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-slate-600" />
                </div>
                {(data?.pendingTicketsCount ?? 0) > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">{data!.pendingTicketsCount}</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-3">Sự cố đang xử lý</p>
              <p className="text-xl font-bold text-slate-800">{data?.pendingTicketsCount ?? 0}</p>
              <p className="text-xs text-slate-500">sự cố đang chờ</p>
            </Link>
          </div>

          {/* Pending transfer banner */}
          {data?.pendingTransfer && (
            <Link href="/student/room-transfer"
              className="flex items-center justify-between gap-3 mb-6 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-800">Yêu cầu chuyển phòng đang chờ duyệt</p>
                  <p className="text-xs text-orange-600">{data.pendingTransfer.code} — chuyển sang phòng {data.pendingTransfer.toRoomCode}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-400 flex-shrink-0" />
            </Link>
          )}

          {/* Quick actions */}
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-800 mb-3">Thao tác nhanh</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data?.currentContract ? (
                <Link href="/student/room-transfer" className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all group text-center">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                    <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-600">Chuyển phòng</span>
                </Link>
              ) : (
                <Link href="/student/register" className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all group text-center">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                    <ClipboardList className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-600">Đăng ký KTX</span>
                </Link>
              )}
              <Link href="/student/tickets/new" className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all group text-center">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-red-100 transition-colors">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-xs font-medium text-slate-600">Báo sự cố</span>
              </Link>
              <Link href="/student/invoices" className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all group text-center">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-xs font-medium text-slate-600">Hoá đơn</span>
              </Link>
              <Link href="/student/contracts" className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all group text-center">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <FileSignature className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-xs font-medium text-slate-600">Hợp đồng</span>
              </Link>
            </div>
          </div>

          {/* Activity timeline */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Hoạt động gần đây</h2>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>

            {timeline.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">Chưa có hoạt động nào</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {timeline.map((item, idx) => {
                  const isInvoice = item.kind === 'invoice';
                  const statusCfg = isInvoice
                    ? invoiceStatusConfig[item.status]
                    : ticketStatusConfig[item.status];
                  const href = isInvoice ? `/student/invoices/${item.id}` : `/student/tickets/${item.id}`;

                  return (
                    <Link key={`${item.kind}-${item.id}`} href={href}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isInvoice ? 'bg-amber-100' : 'bg-red-100'}`}>
                        {isInvoice
                          ? <Receipt className="w-4 h-4 text-amber-600" />
                          : <Wrench className="w-4 h-4 text-red-500" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.subtitle} • {formatDate(item.date)}</p>
                      </div>

                      {/* Status badge */}
                      {statusCfg && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </StudentLayout>
  );
}

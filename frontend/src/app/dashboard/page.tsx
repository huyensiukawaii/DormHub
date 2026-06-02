'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  DoorOpen,
  Users,
  FileText,
  FileSignature,
  Wrench,
  TrendingUp,
  ArrowRight,
  Building2,
  AlertCircle,
  Loader2,
  ArrowRightLeft,
  ReceiptText,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

interface AdminDashboardData {
  stats: {
    totalRooms: number;
    availableRooms: number;
    studentsWithActiveContracts: number;
    pendingApplications: number;
    contractsNotCheckedIn: number;
    openTickets: number;
    pendingRoomTransfers: number;
    overdueInvoices: number;
  };
  buildingOccupancy: Array<{
    id: number;
    code: string;
    name: string;
    totalCapacity: number;
    occupied: number;
    percentage: number;
  }>;
  recentApplications: Array<{
    id: number;
    studentName: string;
    studentCode: string;
    roomCode: string | null;
    status: string;
    createdAt: string;
  }>;
  recentTickets: Array<{
    id: number;
    title: string;
    roomCode: string;
    priority: string;
    status: string;
    createdAt: string;
  }>;
  revenueByMonth: Array<{ month: string; amount: number }>;
  ticketsByCategory: Array<{ category: string; count: number }>;
  invoiceStats: Array<{ status: string; count: number }>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-');
  return `Th.${parseInt(month)}/${year}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
}

const statusBadge: Record<string, ReactNode> = {
  PENDING: <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Chờ duyệt</span>,
  APPROVED: <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">Đã duyệt</span>,
  REJECTED: <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">Từ chối</span>,
};

const ticketStatusBadge: Record<string, ReactNode> = {
  NEW: <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">Mới</span>,
  IN_PROGRESS: <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Đang xử lý</span>,
  COMPLETED: <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">Hoàn thành</span>,
};

const priorityBadge: Record<string, ReactNode> = {
  URGENT: <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">Khẩn</span>,
  NORMAL: <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Bình thường</span>,
  LOW: <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">Thấp</span>,
};

export default function DashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then((res) => setData(res.data))
      .catch(() => setError('Không thể tải dữ liệu dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const currentDate = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-slate-500">{error}</div>
      </AdminLayout>
    );
  }

  const { stats, buildingOccupancy, recentApplications, recentTickets, revenueByMonth, ticketsByCategory, invoiceStats } = data;
  const currentMonthRevenue = revenueByMonth[revenueByMonth.length - 1]?.amount ?? 0;
  const avgRevenue = Math.round(revenueByMonth.reduce((s, d) => s + d.amount, 0) / (revenueByMonth.length || 1));
  const prevRevenue = revenueByMonth[revenueByMonth.length - 2]?.amount ?? 0;

  const CATEGORY_LABEL: Record<string, string> = {
    ELECTRICAL: 'Điện', PLUMBING: 'Nước', AIR_CONDITIONER: 'Điều hòa',
    DOOR_LOCK: 'Khóa cửa', FURNITURE: 'Đồ dùng', OTHER: 'Khác',
  };
  const INVOICE_LABEL: Record<string, string> = {
    PENDING: 'Chờ TT', PAID: 'Đã TT', OVERDUE: 'Quá hạn', CANCELLED: 'Huỷ',
  };
  const INVOICE_COLOR: Record<string, string> = {
    PENDING: '#f59e0b', PAID: '#10b981', OVERDUE: '#ef4444', CANCELLED: '#94a3b8',
  };
  const CATEGORY_COLORS = ['#6366f1','#3b82f6','#06b6d4','#10b981','#f59e0b','#94a3b8'];

  const ticketChartData = ticketsByCategory.map((t) => ({
    name: CATEGORY_LABEL[t.category] ?? t.category,
    value: t.count,
  }));
  const invoiceChartData = invoiceStats.map((i) => ({
    name: INVOICE_LABEL[i.status] ?? i.status,
    value: i.count,
    color: INVOICE_COLOR[i.status] ?? '#94a3b8',
  }));
  const revenueGrowth = prevRevenue > 0
    ? ((currentMonthRevenue - prevRevenue) / prevRevenue * 100).toFixed(1)
    : null;

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Tổng quan hệ thống</h1>
        <p className="text-sm text-slate-500 mt-1 capitalize">{currentDate}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng phòng', value: stats.totalRooms, icon: Building2, iconBg: 'bg-slate-100', iconColor: 'text-slate-600', href: '/rooms' },
          { label: 'Phòng còn chỗ', value: stats.availableRooms, icon: DoorOpen, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', href: '/rooms?status=ACTIVE' },
          { label: 'SV đang ở', value: stats.studentsWithActiveContracts.toLocaleString(), icon: Users, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', href: '/students' },
          { label: 'Đơn chờ duyệt', value: stats.pendingApplications, icon: FileText, iconBg: 'bg-amber-100', iconColor: 'text-amber-600', href: '/applications?status=PENDING', urgent: stats.pendingApplications > 0 },
          { label: 'HĐ chưa check-in', value: stats.contractsNotCheckedIn, icon: FileSignature, iconBg: 'bg-purple-100', iconColor: 'text-purple-600', href: '/contracts?checkedIn=false' },
          { label: 'Sự cố đang xử lý', value: stats.openTickets, icon: Wrench, iconBg: 'bg-red-100', iconColor: 'text-red-600', href: '/tickets?status=NEW', urgent: stats.openTickets > 0 },
          { label: 'Chuyển phòng chờ duyệt', value: stats.pendingRoomTransfers, icon: ArrowRightLeft, iconBg: 'bg-orange-100', iconColor: 'text-orange-600', href: '/room-transfers?status=PENDING', urgent: stats.pendingRoomTransfers > 0 },
          { label: 'Hóa đơn quá hạn', value: stats.overdueInvoices, icon: ReceiptText, iconBg: 'bg-rose-100', iconColor: 'text-rose-600', href: '/invoices?status=OVERDUE', urgent: stats.overdueInvoices > 0 },
        ].map(({ label, value, icon: Icon, iconBg, iconColor, href, urgent }) => (
          <Link key={label} href={href} className={`bg-white rounded-xl p-4 border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${urgent ? 'border-amber-200' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">{label}</span>
              <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${urgent ? 'text-amber-600' : 'text-slate-800'}`}>{value}</p>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Building occupancy */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Tỷ lệ lấp đầy theo tòa</h3>
              <p className="text-xs text-slate-500 mt-0.5">Dựa trên hợp đồng đang hiệu lực</p>
            </div>
          </div>
          {buildingOccupancy.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-4">
              {buildingOccupancy.map((b) => (
                <div key={b.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700">{b.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{b.occupied}/{b.totalCapacity}</span>
                      <span className={`text-sm font-semibold ${
                        b.percentage >= 90 ? 'text-emerald-600' :
                        b.percentage >= 70 ? 'text-amber-600' :
                        b.percentage > 0 ? 'text-orange-500' : 'text-slate-400'
                      }`}>
                        {b.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        b.percentage >= 90 ? 'bg-emerald-500' :
                        b.percentage >= 70 ? 'bg-amber-500' :
                        b.percentage > 0 ? 'bg-orange-400' : 'bg-slate-300'
                      }`}
                      style={{ width: `${b.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue chart */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Doanh thu 6 tháng gần nhất</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tổng thu từ hóa đơn đã thanh toán</p>
            </div>
            {revenueGrowth !== null && (
              <div className={`flex items-center gap-1 ${Number(revenueGrowth) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">{Number(revenueGrowth) >= 0 ? '+' : ''}{revenueGrowth}%</span>
              </div>
            )}
          </div>

          {currentMonthRevenue === 0 && avgRevenue === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Chưa có dữ liệu doanh thu</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={revenueByMonth.map((d) => ({ ...d, label: formatMonthLabel(d.month) }))} barSize={28}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v) => [formatCurrency(Number(v)), 'Doanh thu']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {revenueByMonth.map((_, idx) => (
                      <Cell key={idx} fill={idx === revenueByMonth.length - 1 ? '#1e293b' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
                <div>
                  <p className="text-xs text-slate-500">Tháng này</p>
                  <p className="text-lg font-bold text-slate-800">{formatCurrency(currentMonthRevenue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Trung bình/tháng</p>
                  <p className="text-lg font-bold text-slate-800">{formatCurrency(avgRevenue)}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Analytics row: Ticket by category + Invoice stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Ticket by category */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-1">Sự cố theo danh mục</h3>
          <p className="text-xs text-slate-500 mb-4">Tổng tất cả thời gian</p>
          {ticketChartData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={ticketChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {ticketChartData.map((_, idx) => (
                    <Cell key={idx} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [Number(v) + ' sự cố']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Invoice stats */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-1">Trạng thái hoá đơn</h3>
          <p className="text-xs text-slate-500 mb-4">Phân bố theo trạng thái</p>
          {invoiceChartData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={invoiceChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70}>
                  {invoiceChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [Number(v) + ' hoá đơn']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 12, color: '#475569' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent applications */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-800">Đơn đăng ký mới nhất</h3>
            <Link href="/applications" className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              Xem tất cả <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentApplications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Chưa có đơn đăng ký</p>
            ) : recentApplications.map((app) => (
              <div key={app.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-slate-600">{app.studentName.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{app.studentName}</p>
                    <p className="text-xs text-slate-500">
                      {app.studentCode}{app.roomCode ? ` • ${app.roomCode}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {statusBadge[app.status] ?? null}
                  <p className="text-xs text-slate-400 mt-1">{timeAgo(app.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent tickets */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-800">Sự cố mới nhất</h3>
            <Link href="/tickets" className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              Xem tất cả <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentTickets.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Không có sự cố nào</p>
            ) : recentTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{ticket.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{ticket.roomCode}</span>
                      {priorityBadge[ticket.priority] ?? null}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {ticketStatusBadge[ticket.status] ?? null}
                  <p className="text-xs text-slate-400 mt-1">{timeAgo(ticket.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

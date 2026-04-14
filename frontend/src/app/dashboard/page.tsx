'use client';

import { useState } from 'react';
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
} from 'lucide-react';

interface BuildingOccupancy {
  id: number;
  code: string;
  name: string;
  occupied: number;
  capacity: number;
  percentage: number;
}

interface RecentApplication {
  id: number;
  studentName: string;
  studentCode: string;
  roomCode: string;
  createdAt: string;
  status: string;
}

interface RecentTicket {
  id: number;
  title: string;
  roomCode: string;
  priority: string;
  createdAt: string;
  status: string;
}

export default function DashboardPage() {
  const [stats] = useState({
    totalRooms: 336,
    availableRooms: 48,
    totalStudents: 1247,
    pendingApplications: 23,
    pendingContracts: 87,
    openTickets: 14,
    roomsChange: 2.1,
    studentsChange: 1.8,
  });

  const [buildingOccupancy] = useState<BuildingOccupancy[]>([
    { id: 1, code: 'A1', name: 'Tòa A1', occupied: 58, capacity: 64, percentage: 90.6 },
    { id: 2, code: 'A2', name: 'Tòa A2', occupied: 52, capacity: 64, percentage: 81.3 },
    { id: 3, code: 'B1', name: 'Tòa B1', occupied: 75, capacity: 80, percentage: 93.8 },
    { id: 4, code: 'B2', name: 'Tòa B2', occupied: 68, capacity: 80, percentage: 85 },
    { id: 5, code: 'C1', name: 'Tòa C1', occupied: 0, capacity: 48, percentage: 0 },
  ]);

  const [recentApplications] = useState<RecentApplication[]>([
    { id: 1, studentName: 'Nguyễn Văn An', studentCode: '20210001', roomCode: 'A101', createdAt: '2 giờ trước', status: 'PENDING' },
    { id: 2, studentName: 'Trần Thị Bình', studentCode: '20210042', roomCode: 'B201', createdAt: '3 giờ trước', status: 'PENDING' },
    { id: 3, studentName: 'Lê Hoàng Nam', studentCode: '20210089', roomCode: 'A305', createdAt: '5 giờ trước', status: 'APPROVED' },
  ]);

  const [recentTickets] = useState<RecentTicket[]>([
    { id: 1, title: 'Điều hòa không hoạt động', roomCode: 'A102', priority: 'HIGH', createdAt: '1 giờ trước', status: 'OPEN' },
    { id: 2, title: 'Bóng đèn hỏng', roomCode: 'B305', priority: 'LOW', createdAt: '4 giờ trước', status: 'IN_PROGRESS' },
    { id: 3, title: 'Nước yếu', roomCode: 'C101', priority: 'MEDIUM', createdAt: '6 giờ trước', status: 'OPEN' },
  ]);

  const [revenueData] = useState([
    { month: 'Th.11/2025', amount: 380000000 },
    { month: 'Th.12/2025', amount: 420000000 },
    { month: 'Th.1/2026', amount: 410000000 },
    { month: 'Th.2/2026', amount: 435000000 },
    { month: 'Th.3/2026', amount: 445000000 },
    { month: 'Th.4/2026', amount: 467000000 },
  ]);

  const currentDate = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const maxRevenue = Math.max(...revenueData.map((d) => d.amount));
  const totalRevenue = revenueData[revenueData.length - 1].amount;
  const avgRevenue = Math.round(revenueData.reduce((a, b) => a + b.amount, 0) / revenueData.length);
  const revenueGrowth = ((revenueData[5].amount - revenueData[4].amount) / revenueData[4].amount * 100).toFixed(1);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Chờ duyệt</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">Đã duyệt</span>;
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
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">Cao</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Trung bình</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">Thấp</span>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Tổng quan hệ thống</h1>
        <p className="text-sm text-slate-500 mt-1 capitalize">{currentDate}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Tổng phòng</span>
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-slate-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.totalRooms}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Phòng trống</span>
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DoorOpen className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.availableRooms}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-600">{stats.roomsChange}% so tháng trước</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">SV đang ở</span>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.totalStudents.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-600">{stats.studentsChange}% so tháng trước</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Đơn chờ duyệt</span>
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.pendingApplications}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">HĐ chưa TT</span>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileSignature className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.pendingContracts}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Sự cố đang xử lý</span>
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <Wrench className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.openTickets}</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Building occupancy */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Tỷ lệ lấp đầy theo tòa</h3>
              <p className="text-xs text-slate-500 mt-0.5">Cập nhật theo thời gian thực</p>
            </div>
            <span className="text-xs text-slate-500">Tháng 4/2026</span>
          </div>
          <div className="space-y-4">
            {buildingOccupancy.map((building) => (
              <div key={building.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700">{building.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{building.occupied}/{building.capacity}</span>
                    <span className={`text-sm font-semibold ${
                      building.percentage >= 90 ? 'text-emerald-600' :
                      building.percentage >= 70 ? 'text-amber-600' :
                      building.percentage > 0 ? 'text-orange-500' : 'text-slate-400'
                    }`}>
                      {building.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      building.percentage >= 90 ? 'bg-emerald-500' :
                      building.percentage >= 70 ? 'bg-amber-500' :
                      building.percentage > 0 ? 'bg-orange-400' : 'bg-slate-300'
                    }`}
                    style={{ width: `${building.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue chart */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Doanh thu 6 tháng gần nhất</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tổng thu từ hóa đơn đã thanh toán</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">+{revenueGrowth}%</span>
            </div>
          </div>

          <div className="flex items-end justify-between gap-3 h-40 mb-4">
            {revenueData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-t-md transition-all ${
                    index === revenueData.length - 1 ? 'bg-slate-800' : 'bg-slate-200'
                  }`}
                  style={{ height: `${(data.amount / maxRevenue) * 100}%` }}
                />
                <span className="text-[10px] text-slate-500 mt-2">{data.month}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-500">Tháng này</p>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Trung bình/tháng</p>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(avgRevenue)}</p>
            </div>
          </div>
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
            {recentApplications.map((app) => (
              <div key={app.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-slate-600">{app.studentName.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{app.studentName}</p>
                    <p className="text-xs text-slate-500">{app.studentCode} • {app.roomCode}</p>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(app.status)}
                  <p className="text-xs text-slate-400 mt-1">{app.createdAt}</p>
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
            {recentTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{ticket.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{ticket.roomCode}</span>
                      {getPriorityBadge(ticket.priority)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {getTicketStatusBadge(ticket.status)}
                  <p className="text-xs text-slate-400 mt-1">{ticket.createdAt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
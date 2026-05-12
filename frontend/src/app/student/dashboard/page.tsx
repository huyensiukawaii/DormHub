'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StudentLayout from '@/components/layouts/StudentLayout';
import {
  Home,
  Calendar,
  Receipt,
  Wrench,
  ClipboardList,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

interface DashboardData {
  student: {
    id: number;
    fullName: string;
    studentCode: string;
    className: string;
  };
  currentRoom: {
    id: number;
    code: string;
    buildingName: string;
  } | null;
  currentContract: {
    id: number;
    endDate: string;
    daysRemaining: number;
  } | null;
  unpaidInvoice: {
    id: number;
    amount: number;
    dueDate: string;
    daysUntilDue: number;
  } | null;
  pendingTicketsCount: number;
  recentInvoices: Array<{
    id: number;
    month: string;
    amount: number;
    dueDate: string;
    status: 'PENDING' | 'PAID' | 'OVERDUE';
  }>;
  recentTickets: Array<{
    id: number;
    title: string;
    category: string;
    status: string;
    createdAt: string;
  }>;
}

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    if (getStoredUser()?.role !== 'STUDENT') return;
    try {
      const res = await api.get('/student/dashboard');
      setData(res.data);
    } catch (err) {
      console.error(err);
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

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="text-xs font-medium text-emerald-600">Đã TT</span>;
      case 'PENDING':
        return <span className="text-xs font-medium text-amber-600">Chưa TT</span>;
      case 'OVERDUE':
        return <span className="text-xs font-medium text-red-600">Quá hạn</span>;
      default:
        return null;
    }
  };

  const getTicketStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">Hoàn thành</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Đang xử lý</span>;
      case 'NEW':
        return <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Mới</span>;
      default:
        return null;
    }
  };

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

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
      {/* Welcome header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Xin chào, {data?.student.fullName}!
        </h1>
        <p className="text-sm text-slate-500 mt-1 capitalize">{today}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Current room */}
        <Link
          href="/student/room"
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-sm transition-all block"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-slate-600" />
            </div>
            {data?.currentRoom && (
              <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                Đang ở
              </span>
            )}
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

        {/* Contract */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-slate-600" />
          </div>
          <p className="text-xs text-slate-500 mt-3">Hợp đồng đến ngày</p>
          {data?.currentContract ? (
            <>
              <p className="text-xl font-bold text-slate-800">{formatDate(data.currentContract.endDate)}</p>
              <p className="text-xs text-amber-600">Còn {data.currentContract.daysRemaining} ngày</p>
            </>
          ) : (
            <p className="text-sm text-slate-400 mt-1">Chưa có hợp đồng</p>
          )}
        </div>

        {/* Unpaid invoice */}
        <div className={`rounded-xl border p-5 ${data?.unpaidInvoice ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-start justify-between">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${data?.unpaidInvoice ? 'bg-amber-100' : 'bg-slate-100'}`}>
              <Receipt className={`w-5 h-5 ${data?.unpaidInvoice ? 'text-amber-600' : 'text-slate-600'}`} />
            </div>
            {data?.unpaidInvoice && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-200 text-amber-700 rounded-full">
                1 chưa TT
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-3">Hóa đơn chưa thanh toán</p>
          {data?.unpaidInvoice ? (
            <>
              <p className="text-xl font-bold text-amber-700">{formatCurrency(data.unpaidInvoice.amount)}</p>
              <p className="text-xs text-amber-600">Hạn: {data.unpaidInvoice.daysUntilDue} ngày nữa</p>
            </>
          ) : (
            <p className="text-sm text-emerald-600 mt-1">Đã thanh toán hết</p>
          )}
        </div>

        {/* Pending tickets */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-slate-600" />
            </div>
            {data?.pendingTicketsCount != null && data.pendingTicketsCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                {data.pendingTicketsCount}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-3">Sự cố đang xử lý</p>
          <p className="text-xl font-bold text-slate-800">{data?.pendingTicketsCount ?? 0}</p>
          <p className="text-xs text-slate-500">sự cố đang chờ</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Thao tác nhanh</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/student/register"
            className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-200 transition-colors">
              <ClipboardList className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">Đăng ký KTX</span>
          </Link>

          <Link
            href="/student/invoices"
            className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-200 transition-colors">
              <Receipt className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">Xem hóa đơn</span>
          </Link>

          <Link
            href="/student/tickets/new"
            className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-200 transition-colors">
              <Wrench className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">Báo sự cố</span>
          </Link>
        </div>
      </div>

      {/* Recent lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent invoices */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-800">Hóa đơn gần đây</h3>
            <Link
              href="/student/invoices"
              className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
            >
              Xem tất cả <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data?.recentInvoices.length ? data.recentInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">{invoice.month}</p>
                  <p className="text-xs text-slate-500">Hạn: {formatDate(invoice.dueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">{formatCurrency(invoice.amount)}</p>
                  {getInvoiceStatusBadge(invoice.status)}
                </div>
              </div>
            )) : (
              <p className="p-4 text-sm text-slate-400 text-center">Chưa có hóa đơn</p>
            )}
          </div>
        </div>

        {/* Recent tickets */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-800">Sự cố của tôi</h3>
            <Link
              href="/student/tickets"
              className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
            >
              Xem tất cả <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data?.recentTickets.length ? data.recentTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mt-0.5">
                    <Wrench className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{ticket.title}</p>
                    <p className="text-xs text-slate-500">{ticket.category} - {formatDate(ticket.createdAt)}</p>
                  </div>
                </div>
                {getTicketStatusBadge(ticket.status)}
              </div>
            )) : (
              <p className="p-4 text-sm text-slate-400 text-center">Chưa có sự cố nào</p>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}

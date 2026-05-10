'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StudentLayout from '@/components/layouts/StudentLayout';
import {
  Receipt, CheckCircle, Clock, AlertCircle, Ban, Loader2,
  ChevronRight, Home, Zap,
} from 'lucide-react';
import { api } from '@/lib/api';

type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
type InvoiceType = 'ROOM_FEE' | 'UTILITY';

interface Invoice {
  id: number;
  code: string;
  type: InvoiceType;
  status: InvoiceStatus;
  billingMonth: string;
  dueDate: string;
  totalAmount: string;
  paymentProof: string | null;
  room: { id: number; code: string; building: { name: string } };
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:   { label: 'Chờ thanh toán', color: 'text-amber-700',   bg: 'bg-amber-100',   icon: Clock },
  PAID:      { label: 'Đã thanh toán',  color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
  OVERDUE:   { label: 'Quá hạn',        color: 'text-red-700',     bg: 'bg-red-100',     icon: AlertCircle },
  CANCELLED: { label: 'Đã hủy',         color: 'text-slate-500',   bg: 'bg-slate-100',   icon: Ban },
};

const fmt = (v: string | number) =>
  new Intl.NumberFormat('vi-VN').format(typeof v === 'string' ? parseFloat(v) : v) + ' đ';

const fmtMonth = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function StudentInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const p = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (filterType)   p.append('type', filterType);
        if (filterStatus) p.append('status', filterStatus);
        const res = await api.get(`/invoices/student/my?${p}`);
        setInvoices(res.data.data);
        setTotalPages(res.data.totalPages);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [page, filterType, filterStatus]);

  const pending = invoices.filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE');

  return (
    <StudentLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Hóa đơn</h1>
        <p className="text-sm text-slate-500 mt-1">Hóa đơn tiền phòng và tiện ích của bạn</p>
      </div>

      {/* Pending alert */}
      {!loading && pending.length > 0 && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Bạn có {pending.length} hóa đơn chưa thanh toán
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Vui lòng thanh toán đúng hạn để tránh bị phạt. Trưởng phòng cần upload minh chứng sau khi chuyển khoản.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
        >
          <option value="">Tất cả loại</option>
          <option value="UTILITY">Tiện ích</option>
          <option value="ROOM_FEE">Tiền phòng</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">Chờ thanh toán</option>
          <option value="PAID">Đã thanh toán</option>
          <option value="OVERDUE">Quá hạn</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Chưa có hóa đơn</h3>
          <p className="text-sm text-slate-500">Hóa đơn sẽ xuất hiện ở đây sau khi phòng có chỉ số điện/nước</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {invoices.map((inv) => {
              const sc = STATUS_CONFIG[inv.status];
              const SIcon = sc.icon;
              const isOverdue = inv.status === 'OVERDUE';
              return (
                <Link
                  key={inv.id}
                  href={`/student/invoices/${inv.id}`}
                  className={`block bg-white rounded-xl border transition-colors hover:border-amber-300 ${isOverdue ? 'border-red-200' : 'border-slate-200'}`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${inv.type === 'UTILITY' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                          {inv.type === 'UTILITY'
                            ? <Zap className="w-5 h-5 text-purple-600" />
                            : <Home className="w-5 h-5 text-blue-600" />
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-800">
                              {inv.type === 'UTILITY' ? 'Tiện ích' : 'Tiền phòng'} – {fmtMonth(inv.billingMonth)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Phòng {inv.room.code} · {inv.room.building.name}
                          </p>
                          <p className="text-xs text-slate-400">Hạn: {fmtDate(inv.dueDate)}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-bold text-slate-800">{fmt(inv.totalAmount)}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${sc.bg} ${sc.color}`}>
                          <SIcon className="w-3 h-3" /> {sc.label}
                        </span>
                        {inv.paymentProof && inv.status === 'PENDING' && (
                          <p className="text-xs text-blue-600 mt-0.5">Đã gửi minh chứng</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="px-4 pb-3 flex justify-end">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      Xem chi tiết <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5">
              <p className="text-sm text-slate-500">Trang {page}/{totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg">Trước</button>
                <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg">Sau</button>
              </div>
            </div>
          )}
        </>
      )}
    </StudentLayout>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StudentLayout from '@/components/layouts/StudentLayout';
import { Bell, CheckCheck, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/timeAgo';

interface Notification {
  id: number;
  title: string;
  content: string | null;
  type: string | null;
  referenceType: string | null;
  referenceId: number | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  data: Notification[];
  total: number;
  page: number;
  totalPages: number;
  unreadCount: number;
}

const TYPE_COLORS: Record<string, string> = {
  TICKET: 'bg-amber-100 text-amber-700',
  INVOICE: 'bg-blue-100 text-blue-700',
  REGISTRATION: 'bg-emerald-100 text-emerald-700',
  SYSTEM: 'bg-slate-100 text-slate-600',
};

const REFERENCE_LINKS: Record<string, (id: number) => string> = {
  Ticket: (id) => `/student/tickets/${id}`,
  Invoice: (id) => `/student/invoices/${id}`,
  Application: (id) => `/student/applications/${id}`,
  Contract: (id) => `/student/contracts/${id}`,
};

export default function StudentNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async (p = 1, unread = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (unread) params.set('unreadOnly', 'true');
      const res = await api.get<NotificationsResponse>(`/notifications?${params}`);
      setNotifications(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setUnreadCount(res.data.unreadCount);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(1, unreadOnly);
  }, [fetchNotifications, unreadOnly]);

  const handleMarkRead = async (notif: Notification) => {
    if (!notif.isRead) {
      await api.patch(`/notifications/${notif.id}/read`).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      window.dispatchEvent(new CustomEvent('notification-updated'));
    }

    if (notif.referenceType && notif.referenceId) {
      const linkFn = REFERENCE_LINKS[notif.referenceType];
      if (linkFn) router.push(linkFn(notif.referenceId));
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const deletedNotification = notifications.find((n) => n.id === id);
    await api.delete(`/notifications/${id}`).catch(() => {});
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    if (deletedNotification && !deletedNotification.isRead) {
      setUnreadCount((c) => Math.max(0, c - 1));
      window.dispatchEvent(new CustomEvent('notification-updated'));
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('notification-updated'));
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <StudentLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Thông báo</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-slate-500 mt-0.5">{unreadCount} thông báo chưa đọc</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchNotifications(page, unreadOnly)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
              >
                {markingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4" />
                )}
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          {[
            { label: 'Tất cả', value: false },
            { label: 'Chưa đọc', value: true },
          ].map((tab) => (
            <button
              key={String(tab.value)}
              onClick={() => setUnreadOnly(tab.value)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                unreadOnly === tab.value
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Bell className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">{unreadOnly ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleMarkRead(n)}
                  className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors ${
                    !n.isRead ? 'bg-amber-50/40' : ''
                  }`}
                >
                  {/* Unread dot */}
                  <div className="mt-1.5 flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${!n.isRead ? 'bg-amber-500' : 'bg-transparent'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!n.isRead ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}`}>
                        {n.title}
                      </p>
                      <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                    {n.content && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.content}</p>
                    )}
                    {n.type && (
                      <span className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-full ${TYPE_COLORS[n.type] ?? 'bg-slate-100 text-slate-600'}`}>
                        {n.type}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, n.id)}
                    className="flex-shrink-0 p-1 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded transition-colors mt-0.5"
                    title="Xóa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{total} thông báo</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => fetchNotifications(page - 1, unreadOnly)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                Trước
              </button>
              <span className="px-3 py-1.5">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => fetchNotifications(page + 1, unreadOnly)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}

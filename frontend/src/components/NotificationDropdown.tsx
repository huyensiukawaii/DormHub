'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Loader2, ArrowRight } from 'lucide-react';
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
  createdAt: string;
}

interface Props {
  /** 'amber' for student, 'emerald' for admin/staff */
  accent?: 'amber' | 'emerald';
  allHref: string;
  referenceLinks?: Record<string, (id: number) => string>;
  onCountChange?: (count: number) => void;
}

const TYPE_DOT: Record<string, string> = {
  TICKET: 'bg-amber-400',
  INVOICE: 'bg-blue-400',
  REGISTRATION: 'bg-emerald-400',
  SYSTEM: 'bg-slate-400',
};

export default function NotificationDropdown({
  accent = 'emerald',
  allHref,
  referenceLinks = {},
  onCountChange,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const accentDot = accent === 'amber' ? 'bg-amber-500' : 'bg-emerald-500';
  const accentBtn =
    accent === 'amber'
      ? 'text-amber-700 hover:bg-amber-50 border-amber-200 bg-amber-50'
      : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200 bg-emerald-50';
  const accentUnread = accent === 'amber' ? 'bg-amber-50/50' : 'bg-emerald-50/30';
  const accentSpinner = accent === 'amber' ? 'text-amber-500' : 'text-emerald-500';

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count ?? 0);
    } catch {
      // ignore
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications?page=1&limit=10');
      setNotifications(res.data.data ?? []);
      setUnreadCount(res.data.unreadCount ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial unread count on mount
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Re-sync badge when the full notifications page mutates (mark read / delete)
  useEffect(() => {
    const handler = () => fetchUnreadCount();
    window.addEventListener('notification-updated', handler);
    return () => window.removeEventListener('notification-updated', handler);
  }, [fetchUnreadCount]);

  // Open dropdown
  const handleToggle = () => {
    if (!open) fetchNotifications();
    setOpen((v) => !v);
  };

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClickNotif = async (n: Notification) => {
    setOpen(false);
    if (!n.isRead) {
      api.patch(`/notifications/${n.id}/read`).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.referenceType && n.referenceId) {
      const linkFn = referenceLinks[n.referenceType];
      if (linkFn) { router.push(linkFn(n.referenceId)); return; }
    }
    router.push(allHref);
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } finally {
      setMarkingAll(false);
    }
  };

  // Single source of truth: sync badge to parent whenever unreadCount changes
  useEffect(() => {
    onCountChange?.(unreadCount);
  }, [unreadCount, onCountChange]);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={handleToggle}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-semibold text-sm text-slate-800">
              Thông báo
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-[11px] font-bold bg-red-100 text-red-600 rounded-full">
                  {unreadCount}
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors disabled:opacity-50 ${accentBtn}`}
              >
                {markingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCheck className="w-3 h-3" />
                )}
                Đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className={`w-5 h-5 animate-spin ${accentSpinner}`} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">Chưa có thông báo nào</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => handleClickNotif(n)}
                    className={`flex items-start gap-2.5 px-3 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                      !n.isRead ? accentUnread : ''
                    }`}
                  >
                    {/* type color dot */}
                    <div className="flex-shrink-0 mt-1.5">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          !n.isRead
                            ? (n.type ? (TYPE_DOT[n.type] ?? accentDot) : accentDot)
                            : 'bg-slate-200'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${!n.isRead ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'}`}>
                        {n.title}
                      </p>
                      {n.content && (
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-snug">
                          {n.content}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100">
            <button
              onClick={() => { setOpen(false); router.push(allHref); }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Xem tất cả thông báo
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

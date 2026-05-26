'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Users,
  CalendarRange,
  FileText,
  FileSignature,
  Zap,
  Receipt,
  Wrench,
  Settings,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ArrowRightLeft,
  Megaphone,
} from 'lucide-react';
import { getStoredUser, clearAuth, type User } from '@/lib/auth';
import NotificationDropdown from '@/components/NotificationDropdown';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  staffLabel?: string; // label override for STAFF role
}

interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'csvc',
    label: 'Cơ sở vật chất',
    items: [
      { label: 'Tòa nhà', href: '/buildings', icon: Building2 },
      { label: 'Phòng', href: '/rooms', icon: DoorOpen },
    ],
  },
  {
    key: 'sinhvien',
    label: 'Sinh viên & Đăng ký',
    items: [
      { label: 'Sinh viên', href: '/students', icon: Users },
      { label: 'Đợt đăng ký', href: '/registration-periods', icon: CalendarRange },
      { label: 'Đơn đăng ký', href: '/applications', icon: FileText },
      { label: 'Minh chứng', href: '/priority-documents', icon: ShieldCheck },
    ],
  },
  {
    key: 'vanhanh',
    label: 'Vận hành',
    items: [
      { label: 'Hợp đồng', href: '/contracts', icon: FileSignature },
      { label: 'Chuyển phòng', href: '/room-transfers', icon: ArrowRightLeft },
      { label: 'Công tơ', href: '/meters', icon: Zap },
      { label: 'Hóa đơn', href: '/invoices', icon: Receipt },
      { label: 'Sự cố', href: '/tickets', icon: Wrench },
    ],
  },
  {
    key: 'hethong',
    label: 'Hệ thống',
    items: [
      { label: 'Nhân viên', href: '/staff', icon: Users, staffLabel: 'Tòa của tôi' },
      { label: 'Bảng thông báo', href: '/announcements', icon: Megaphone },
      { label: 'Thông báo', href: '/notifications', icon: Bell },
      { label: 'Cài đặt', href: '/settings', icon: Settings, adminOnly: true },
    ],
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  hideSearch?: boolean;
}

export default function AdminLayout({ children, hideSearch }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Mở nhóm chứa trang active, thu các nhóm khác lại
  const getInitialCollapsed = () => {
    const collapsed: Record<string, boolean> = {};
    NAV_GROUPS.forEach((g) => {
      const hasActive = g.items.some((item) => pathname.startsWith(item.href));
      collapsed[g.key] = !hasActive;
    });
    return collapsed;
  };

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(getInitialCollapsed);

  // Ensure the active group is always expanded on navigation
  useEffect(() => {
    setCollapsed((prev) => {
      const next = { ...prev };
      NAV_GROUPS.forEach((g) => {
        const hasActive = g.items.some((item) => pathname.startsWith(item.href));
        if (hasActive) next[g.key] = false;
      });
      return next;
    });
  }, [pathname]);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      router.push('/login');
      return;
    }
    if (storedUser.role === 'STUDENT') {
      router.push('/student/dashboard');
      return;
    }
    setUser(storedUser);

  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#1a2332] flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/10 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-white text-lg font-bold tracking-tight">DormHub</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-5 py-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 rounded-lg">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-xs font-medium uppercase tracking-wide">
              {user.role === 'ADMIN' ? 'Admin / Staff' : 'Staff'}
            </span>
          </div>
        </div>

        {/* Navigation - scrollable */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          {/* Dashboard — luôn hiển thị, không nhóm */}
          <Link
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive('/dashboard')
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <LayoutDashboard className={`w-[18px] h-[18px] ${isActive('/dashboard') ? 'text-emerald-400' : ''}`} />
            <span>Dashboard</span>
          </Link>

          {/* Grouped nav */}
          {NAV_GROUPS.map((group) => {
            const isAdmin = user?.role === 'ADMIN';
            const visibleItems = group.items.filter((item) => !item.adminOnly || isAdmin);
            if (visibleItems.length === 0) return null;

            const isOpen = !collapsed[group.key];
            const hasActiveItem = visibleItems.some((item) => isActive(item.href));

            return (
              <div key={group.key} className="mt-1">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                    hasActiveItem
                      ? 'text-emerald-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
                  />
                </button>

                {/* Group items */}
                {isOpen && (
                  <ul className="mt-0.5 space-y-0.5">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      const label = (!isAdmin && item.staffLabel) ? item.staffLabel : item.label;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              active
                                ? 'bg-white/10 text-white'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <Icon className={`w-[17px] h-[17px] flex-shrink-0 ${active ? 'text-emerald-400' : ''}`} />
                            <span>{label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {/* Version */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-white/5">
          <p className="text-[11px] text-slate-600">DormHub v1.0.0</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
            >
              <Menu className="w-5 h-5" />
            </button>
            {!hideSearch && (
              <div className="hidden sm:flex items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm sinh viên, phòng, hóa đơn..."
                    className="w-80 pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <NotificationDropdown
              accent="emerald"
              allHref="/notifications"
              referenceLinks={{
                Ticket: (id) => `/tickets/${id}`,
                Invoice: (id) => `/invoices/${id}`,
                Application: (id) => `/applications/${id}`,
                Contract: (id) => `/contracts/${id}`,
                RoomTransfer: (id) => `/room-transfers/${id}`,
              }}
            />

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 p-1.5 pr-3 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-emerald-700 text-sm font-semibold">
                    {user.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-800">{user.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {user.role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Users className="w-4 h-4" />
                      Thông tin cá nhân
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Settings className="w-4 h-4" />
                      Cài đặt
                    </Link>
                    <hr className="my-1 border-slate-200" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

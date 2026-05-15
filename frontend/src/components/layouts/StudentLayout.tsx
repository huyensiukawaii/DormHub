'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  User,
  ClipboardList,
  FileText,
  FileSignature,
  Receipt,
  Wrench,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Settings,
  Building2,
  ClipboardCheck,
  ArrowRightLeft,
} from 'lucide-react';
import { getStoredUser, clearAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import NotificationDropdown from '@/components/NotificationDropdown';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: 'Trang chủ', href: '/student/dashboard', icon: Home },
  { label: 'Hồ sơ cá nhân', href: '/student/profile', icon: User },
  { label: 'Phòng của tôi', href: '/student/room', icon: Home },
  { label: 'Đăng ký KTX', href: '/student/register', icon: ClipboardList },
  { label: 'Đơn đăng ký', href: '/student/applications', icon: FileText },
  { label: 'Hướng dẫn nhận phòng', href: '/student/check-in-guide', icon: ClipboardCheck },
  { label: 'Hợp đồng', href: '/student/contracts', icon: FileSignature },
  { label: 'Hóa đơn', href: '/student/invoices', icon: Receipt },
  { label: 'Báo sự cố', href: '/student/tickets', icon: Wrench },
  { label: 'Chuyển phòng', href: '/student/room-transfer', icon: ArrowRightLeft },
  { label: 'Thông báo', href: '/student/notifications', icon: Bell },
];

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      router.push('/login');
      return;
    }
    if (storedUser.role !== 'STUDENT') {
      router.push('/dashboard');
      return;
    }
    setUser(storedUser);

    api.get('/auth/me').then((res) => {
      const { student, currentRoom } = res.data;
      setStudentInfo({
        studentCode: student?.studentCode ?? storedUser.studentCode ?? '',
        fullName: student?.fullName ?? storedUser.fullName ?? '',
        className: student?.className ?? '',
        currentRoom: currentRoom ?? null,
      });
    }).catch(() => {
      setStudentInfo({
        studentCode: storedUser.studentCode ?? '',
        fullName: storedUser.fullName ?? '',
        className: '',
        currentRoom: null,
      });
    });

  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex-shrink-0 flex items-center justify-between px-4 border-b border-slate-100">
          <Link href="/student/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-lg font-bold text-slate-800">DormHub</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 hover:bg-slate-100 rounded lg:hidden"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Student info card */}
        <div className="flex-shrink-0 p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-semibold">
              {studentInfo?.fullName?.charAt(0) || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {studentInfo?.fullName}
              </p>
              <p className="text-xs text-slate-500">
                {studentInfo?.studentCode} - {studentInfo?.className}
              </p>
            </div>
          </div>
          {studentInfo?.currentRoom && (
            <div className="mt-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-emerald-700">
                  Đang ở - Phòng {studentInfo.currentRoom.code}{studentInfo.currentRoom.buildingName ? ` (${studentInfo.currentRoom.buildingName})` : ''}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-3 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-amber-500 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1">{item.label}</span>
                    {item.label === 'Thông báo' && notificationCount > 0 && (
                      <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                        active ? 'bg-white text-amber-600' : 'bg-red-500 text-white'
                      }`}>
                        {notificationCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>


      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-sm font-medium text-slate-500">
              Cổng thông tin Sinh viên
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <NotificationDropdown
              accent="amber"
              allHref="/student/notifications"
              onCountChange={setNotificationCount}
              referenceLinks={{
                Ticket: (id) => `/student/tickets/${id}`,
                Invoice: (id) => `/student/invoices/${id}`,
                Application: (id) => `/student/applications/${id}`,
                Contract: (id) => `/student/contracts/${id}`,
                RoomTransfer: () => `/student/room-transfer`,
              }}
            />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg"
              >
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-semibold text-sm">
                  {studentInfo?.fullName?.charAt(0) || 'S'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-800">
                    {studentInfo?.fullName}
                  </p>
                  <p className="text-xs text-slate-500">{studentInfo?.studentCode}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                    <Link
                      href="/student/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      Hồ sơ cá nhân
                    </Link>
                    <Link
                      href="/student/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Cài đặt
                    </Link>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

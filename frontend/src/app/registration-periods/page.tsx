'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  AlertCircle,
  X,
  Loader2,
  ChevronRight,
  Clock,
  XCircle,
  Pause,
  Play,
  Eye,
  MoreHorizontal,
  CalendarDays,
  FileText,
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
  autoAssignRoom: boolean;
  targetAdmissionYears?: number[];
  allowedBuildingIds: number[];
  allowedTypes: string;
  status: PeriodStatus;
  totalApplications: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  isActive: boolean;
  daysRemaining: number | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<PeriodStatus, { label: string; color: string; bg: string; icon: any }> = {
  DRAFT: { label: 'Nháp', color: 'text-slate-600', bg: 'bg-slate-100', icon: FileText },
  UPCOMING: { label: 'Sắp mở', color: 'text-blue-600', bg: 'bg-blue-100', icon: Clock },
  OPEN: { label: 'Đang mở', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: Play },
  CLOSED: { label: 'Đã đóng', color: 'text-amber-600', bg: 'bg-amber-100', icon: Pause },
  CANCELLED: { label: 'Đã hủy', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
};

function RegistrationPeriodsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [periods, setPeriods] = useState<RegistrationPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedPeriod, setSelectedPeriod] = useState<RegistrationPeriod | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Status modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<PeriodStatus>('DRAFT');
  const [statusLoading, setStatusLoading] = useState(false);

  // Action menu
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const handleMenuToggle = (e: React.MouseEvent<HTMLButtonElement>, periodId: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ x: rect.right, y: rect.bottom });
    setOpenMenuId(openMenuId === periodId ? null : periodId);
  };

  // Buildings list for picker
  const [buildings, setBuildings] = useState<{ id: number; code: string; name: string }[]>([]);

  // Form data
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    academicYear: '',
    semester: 1,
    description: '',
    startDate: '',
    endDate: '',
    moveInDate: '',
    moveOutDate: '',
    maxApplicationsPerStudent: 1,
    allowRoomPreference: true,
    autoAssignRoom: false,
    targetAdmissionYears: [] as number[],
    allowedBuildingIds: [] as number[],
    allowedTypes: 'ALL',
    status: 'DRAFT' as PeriodStatus,
  });

  // Generate academic year options
  const currentYear = new Date().getFullYear();
  const academicYearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = currentYear + i - 2;
    return `${year}-${year + 1}`;
  });

  // Admission year options (K-class years, e.g. 2020-2026)
  const admissionYearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

  // Format ISO date to datetime-local input value (YYYY-MM-DDTHH:mm)
  const toDatetimeLocal = (dateStr: string) => {
    const d = new Date(dateStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    fetchPeriods();
  }, [page, filterYear, filterStatus]);

  useEffect(() => {
    api.get('/buildings?status=ACTIVE&limit=50').then((res) => {
      const list = res.data?.data ?? res.data;
      setBuildings(Array.isArray(list) ? list.map((b: any) => ({ id: b.id, code: b.code, name: b.name })) : []);
    }).catch(() => {});
  }, []);

  // Handle ?edit=id from detail page "Chỉnh sửa" button
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId) return;
    api.get(`/registration-periods/${editId}`)
      .then((res) => {
        openEditModal(res.data);
        router.replace('/registration-periods');
      })
      .catch(() => {});
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchPeriods();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (search) params.append('search', search);
      if (filterYear) params.append('academicYear', filterYear);
      if (filterStatus) params.append('status', filterStatus);

      const response = await api.get(`/registration-periods?${params.toString()}`);
      setPeriods(response.data.data);
      setTotal(response.data.total);
      setTotalPages(Math.ceil(response.data.total / limit));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    const nextYear = `${currentYear}-${currentYear + 1}`;
    setModalMode('create');
    setFormData({
      code: '',
      name: '',
      academicYear: nextYear,
      semester: 1,
      description: '',
      startDate: '',
      endDate: '',
      moveInDate: '',
      moveOutDate: '',
      maxApplicationsPerStudent: 1,
      allowRoomPreference: true,
      autoAssignRoom: false,
      targetAdmissionYears: [],
      allowedBuildingIds: [],
      allowedTypes: 'ALL',
      status: 'DRAFT',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (period: RegistrationPeriod) => {
    setModalMode('edit');
    setSelectedPeriod(period);
    setFormData({
      code: period.code,
      name: period.name,
      academicYear: period.academicYear,
      semester: period.semester,
      description: period.description || '',
      startDate: toDatetimeLocal(period.startDate),
      endDate: toDatetimeLocal(period.endDate),
      moveInDate: period.moveInDate?.split('T')[0] || '',
      moveOutDate: period.moveOutDate?.split('T')[0] || '',
      maxApplicationsPerStudent: period.maxApplicationsPerStudent,
      allowRoomPreference: true,
      autoAssignRoom: period.autoAssignRoom,
      targetAdmissionYears: period.targetAdmissionYears || [],
      allowedBuildingIds: period.allowedBuildingIds || [],
      allowedTypes: period.allowedTypes || 'ALL',
      status: period.status,
    });
    setFormError('');
    setShowModal(true);
    setOpenMenuId(null);
  };

  const openDeleteModal = (period: RegistrationPeriod) => {
    setSelectedPeriod(period);
    setShowDeleteModal(true);
    setOpenMenuId(null);
  };

  const openStatusModal = (period: RegistrationPeriod, status: PeriodStatus) => {
    setSelectedPeriod(period);
    setNewStatus(status);
    setShowStatusModal(true);
    setOpenMenuId(null);
  };

  const formatApiError = (message: unknown): string => {
    if (Array.isArray(message)) return message.join(' • ');
    if (typeof message === 'string') return message;
    return 'Có lỗi xảy ra';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (formData.code.trim().length < 5) {
      setFormError('Mã đợt phải có ít nhất 5 ký tự');
      return;
    }
    if (formData.name.trim().length < 5) {
      setFormError('Tên đợt đăng ký phải có ít nhất 5 ký tự');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setFormError('Vui lòng chọn thời gian bắt đầu và kết thúc');
      return;
    }

    setFormLoading(true);

    try {
      const payload = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        moveInDate: formData.moveInDate ? new Date(formData.moveInDate).toISOString() : null,
        moveOutDate: formData.moveOutDate ? new Date(formData.moveOutDate).toISOString() : null,
      };

      if (modalMode === 'create') {
        await api.post('/registration-periods', payload);
      } else {
        if (!selectedPeriod) {
          setFormError('Không tìm thấy đợt đăng ký để cập nhật');
          return;
        }
        await api.put(`/registration-periods/${selectedPeriod.id}`, payload);
      }
      setShowModal(false);
      fetchPeriods();
    } catch (err: any) {
      setFormError(formatApiError(err.response?.data?.message));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPeriod) return;
    setDeleteLoading(true);

    try {
      await api.delete(`/registration-periods/${selectedPeriod.id}`);
      setShowDeleteModal(false);
      setSelectedPeriod(null);
      fetchPeriods();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedPeriod) return;
    setStatusLoading(true);

    try {
      await api.patch(`/registration-periods/${selectedPeriod.id}/status`, { status: newStatus });
      setShowStatusModal(false);
      setSelectedPeriod(null);
      fetchPeriods();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể cập nhật trạng thái');
    } finally {
      setStatusLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: PeriodStatus) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getAvailableStatusTransitions = (status: PeriodStatus): PeriodStatus[] => {
    const transitions: Record<PeriodStatus, PeriodStatus[]> = {
      DRAFT: ['UPCOMING', 'OPEN', 'CANCELLED'],
      UPCOMING: ['OPEN', 'CANCELLED'],
      OPEN: ['CLOSED', 'CANCELLED'],
      CLOSED: [],
      CANCELLED: [],
    };
    return transitions[status] || [];
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Đợt đăng ký</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý các đợt đăng ký ký túc xá</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tạo đợt đăng ký
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo mã, tên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <select
              value={filterYear}
              onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="">Tất cả năm học</option>
              {academicYearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-red-500">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Đợt đăng ký</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Thời gian</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Đơn đăng ký</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Trạng thái</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periods.map((period) => (
                    <tr key={period.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <button
                            onClick={() => router.push(`/registration-periods/${period.id}`)}
                            className="text-sm font-semibold text-slate-800 hover:text-emerald-600 transition-colors flex items-center gap-1"
                          >
                            {period.name}
                            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                          </button>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-slate-500">
                              {period.code} • {period.academicYear} • HK{period.semester}
                            </p>
                            {period.autoAssignRoom ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Tự động</span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Ưu tiên</span>
                            )}
                            {period.allowedBuildingIds?.length > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                {period.allowedBuildingIds.length} tòa
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-600 flex items-center justify-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {formatDate(period.startDate)} - {formatDate(period.endDate)}
                          </p>
                          {period.isActive && period.daysRemaining !== null && (
                            <p className="text-xs text-emerald-600 font-medium">
                              Còn {period.daysRemaining} ngày
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <div className="text-center">
                            <p className="text-lg font-bold text-slate-800">{period.totalApplications}</p>
                            <p className="text-xs text-slate-500">Tổng</p>
                          </div>
                          <div className="h-8 w-px bg-slate-200" />
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-emerald-600" title="Đã duyệt">✓ {period.approvedCount}</span>
                            <span className="text-amber-600" title="Chờ duyệt">◷ {period.pendingCount}</span>
                            <span className="text-red-600" title="Từ chối">✗ {period.rejectedCount}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {getStatusBadge(period.status)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center relative">
                          <button
                            onClick={(e) => handleMenuToggle(e, period.id)}
                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </button>

                          {openMenuId === period.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div
                                className="fixed w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1"
                                style={{ top: menuPosition.y + 4, right: window.innerWidth - menuPosition.x }}
                              >
                                <button
                                  onClick={() => { router.push(`/registration-periods/${period.id}`); setOpenMenuId(null); }}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  Xem chi tiết
                                </button>
                                <button
                                  onClick={() => openEditModal(period)}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Pencil className="w-4 h-4" />
                                  Chỉnh sửa
                                </button>

                                {getAvailableStatusTransitions(period.status).length > 0 && (
                                  <>
                                    <div className="border-t border-slate-100 my-1" />
                                    {getAvailableStatusTransitions(period.status).map((status) => (
                                      <button
                                        key={status}
                                        onClick={() => openStatusModal(period, status)}
                                        className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${STATUS_CONFIG[status].color}`}
                                      >
                                        {(() => {
                                          const Icon = STATUS_CONFIG[status].icon;
                                          return <Icon className="w-4 h-4" />;
                                        })()}
                                        Chuyển sang {STATUS_CONFIG[status].label}
                                      </button>
                                    ))}
                                  </>
                                )}

                                {['DRAFT', 'CANCELLED'].includes(period.status) && period.totalApplications === 0 && (
                                  <>
                                    <div className="border-t border-slate-100 my-1" />
                                    <button
                                      onClick={() => openDeleteModal(period)}
                                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Xóa
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {periods.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Chưa có đợt đăng ký nào</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Trang {page} / {totalPages} ({total} đợt)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                  >
                    Trước
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                {modalMode === 'create' ? 'Tạo đợt đăng ký mới' : 'Chỉnh sửa đợt đăng ký'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Mã đợt <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="2025-2026-HK1"
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as PeriodStatus })}
                    disabled={formData.status === 'CLOSED' || formData.status === 'CANCELLED'}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    <option value="DRAFT">Nháp</option>
                    <option value="UPCOMING">Sắp mở</option>
                    <option value="OPEN">Đang mở</option>
                    <option value="CLOSED">Đã đóng</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                  {(formData.status === 'CLOSED' || formData.status === 'CANCELLED') && (
                    <p className="mt-1 text-xs text-slate-500">Trạng thái này chỉ thay đổi qua luồng chuyển trạng thái.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên đợt đăng ký <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Đăng ký KTX HK1 năm học 2025-2026"
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Năm học <span className="text-red-500">*</span></label>
                  <select
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                    required
                  >
                    {academicYearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Học kỳ <span className="text-red-500">*</span></label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    <option value={1}>Học kỳ 1</option>
                    <option value={2}>Học kỳ 2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả chi tiết về đợt đăng ký..."
                  rows={2}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-lg space-y-4">
                <h4 className="text-sm font-semibold text-slate-700">Thời gian đăng ký</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Bắt đầu <span className="text-red-500">*</span></label>
                    <input
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Kết thúc <span className="text-red-500">*</span></label>
                    <input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg space-y-4">
                <h4 className="text-sm font-semibold text-slate-700">Thời gian ở KTX</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Ngày nhận phòng</label>
                    <input
                      type="date"
                      value={formData.moveInDate}
                      onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Ngày trả phòng</label>
                    <input
                      type="date"
                      value={formData.moveOutDate}
                      onChange={(e) => setFormData({ ...formData, moveOutDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">Đối tượng đăng ký</h4>
                <p className="text-xs text-slate-500">Chọn các khóa được phép đăng ký (để trống = tất cả khóa)</p>
                <div className="flex flex-wrap gap-2">
                  {admissionYearOptions.map((year) => {
                    const checked = formData.targetAdmissionYears.includes(year);
                    return (
                      <label key={year} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ${checked ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 accent-emerald-600"
                          checked={checked}
                          onChange={(e) => {
                            const years = e.target.checked
                              ? [...formData.targetAdmissionYears, year]
                              : formData.targetAdmissionYears.filter((y) => y !== year);
                            setFormData({ ...formData, targetAdmissionYears: years });
                          }}
                        />
                        K{year - 1956} ({year})
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg space-y-4">
                <h4 className="text-sm font-semibold text-slate-700">Cấu hình</h4>

                {/* Approval mode */}
                {(() => {
                  const locked = modalMode === 'edit' && !!selectedPeriod &&
                    (selectedPeriod.status !== 'DRAFT' || selectedPeriod.totalApplications > 0);
                  return (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-2">Phương thức duyệt đơn</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => !locked && setFormData({ ...formData, autoAssignRoom: false })}
                          className={`flex flex-col items-start gap-1 p-3 rounded-lg border-2 text-left transition-colors ${
                            !formData.autoAssignRoom
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          } ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <span className={`text-sm font-semibold ${!formData.autoAssignRoom ? 'text-emerald-700' : 'text-slate-700'}`}>
                            Xét duyệt theo ưu tiên
                          </span>
                          <span className="text-xs text-slate-500">Admin duyệt thủ công, xếp phòng theo điểm ưu tiên</span>
                        </button>
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => !locked && setFormData({ ...formData, autoAssignRoom: true, maxApplicationsPerStudent: 1 })}
                          className={`flex flex-col items-start gap-1 p-3 rounded-lg border-2 text-left transition-colors ${
                            formData.autoAssignRoom
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          } ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <span className={`text-sm font-semibold ${formData.autoAssignRoom ? 'text-blue-700' : 'text-slate-700'}`}>
                            Duyệt tự động
                          </span>
                          <span className="text-xs text-slate-500">Được duyệt ngay khi nộp đơn, xếp phòng tự động</span>
                        </button>
                      </div>
                      {locked && (
                        <p className="text-xs text-amber-600 mt-1.5">
                          Không thể thay đổi sau khi đợt đã mở hoặc đã có đơn đăng ký.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {!formData.autoAssignRoom && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Số nguyện vọng tối đa mỗi SV</label>
                    <input
                      type="number"
                      value={formData.maxApplicationsPerStudent}
                      onChange={(e) => setFormData({ ...formData, maxApplicationsPerStudent: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={5}
                      className="w-24 px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                )}

                {/* Application type restriction */}
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">Loại đơn được nhận</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'ALL', label: 'Tất cả', desc: 'Cả mới & gia hạn' },
                      { value: 'NEW_ONLY', label: 'Chỉ mới', desc: 'Không nhận gia hạn' },
                      { value: 'RENEWAL_ONLY', label: 'Chỉ gia hạn', desc: 'Không nhận mới' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, allowedTypes: opt.value })}
                        className={`flex flex-col items-start gap-0.5 p-3 rounded-lg border-2 text-left transition-colors ${
                          formData.allowedTypes === opt.value
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className={`text-sm font-semibold ${formData.allowedTypes === opt.value ? 'text-emerald-700' : 'text-slate-700'}`}>
                          {opt.label}
                        </span>
                        <span className="text-xs text-slate-500">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Building filter */}
                {buildings.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1.5">
                      Tòa nhà được đăng ký
                      <span className="ml-1 font-normal text-slate-400">(để trống = tất cả)</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {buildings.map((b) => {
                        const selected = formData.allowedBuildingIds.includes(b.id);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              const ids = selected
                                ? formData.allowedBuildingIds.filter((id) => id !== b.id)
                                : [...formData.allowedBuildingIds, b.id];
                              setFormData({ ...formData, allowedBuildingIds: ids });
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-colors ${
                              selected
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {b.code} – {b.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg flex items-center justify-center gap-2"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {modalMode === 'create' ? 'Tạo mới' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Xóa đợt đăng ký?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Bạn có chắc muốn xóa đợt <strong>{selectedPeriod.name}</strong>?
              </p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg flex items-center justify-center gap-2"
                >
                  {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowStatusModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex flex-col items-center text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${STATUS_CONFIG[newStatus].bg}`}>
                {(() => {
                  const Icon = STATUS_CONFIG[newStatus].icon;
                  return <Icon className={`w-6 h-6 ${STATUS_CONFIG[newStatus].color}`} />;
                })()}
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Xác nhận thay đổi trạng thái</h3>
              <p className="text-sm text-slate-500 mb-6">
                Chuyển đợt <strong>{selectedPeriod.name}</strong> sang trạng thái <strong>{STATUS_CONFIG[newStatus].label}</strong>?
              </p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowStatusModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">
                  Hủy
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={statusLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg flex items-center justify-center gap-2"
                >
                  {statusLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function RegistrationPeriodsPageWrapper() {
  return (
    <Suspense fallback={null}>
      <RegistrationPeriodsPage />
    </Suspense>
  );
}
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Users,
  AlertCircle,
  X,
  Loader2,
  ChevronRight,
  Upload,
  Download,
  Phone,
  Home,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { MAJORS } from '@/lib/constants';

interface Student {
  id: number;
  studentCode: string;
  fullName: string;
  email: string;
  phone: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  major: string;
  classCode: string;
  admissionYear: number;
  status: 'ACTIVE' | 'GRADUATED' | 'SUSPENDED' | 'DROPPED_OUT';
  currentRoom: {
    id: number;
    code: string;
    buildingName: string;
  } | null;
  hasActiveContract: boolean;
}

type StudentFormData = {
  studentCode: string;
  fullName: string;
  email: string;
  phone: string;
  gender: Student['gender'];
  dateOfBirth: string;
  major: string;
  classCode: string;
  admissionYear: number;
  status: Student['status'];
};

export default function StudentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [filterMajor, setFilterMajor] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterHasRoom, setFilterHasRoom] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<StudentFormData>({
    studentCode: '',
    fullName: '',
    email: '',
    phone: '',
    gender: 'MALE',
    dateOfBirth: '',
    major: '',
    classCode: '',
    admissionYear: new Date().getFullYear(), // chỉ dùng khi tạo mới; update bỏ qua
    status: 'ACTIVE',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  // Generate year options (last 10 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

  useEffect(() => {
    fetchStudents();
  }, [page, filterMajor, filterYear, filterStatus, filterHasRoom]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchStudents();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (search) params.append('search', search);
      if (filterMajor) params.append('major', filterMajor);
      if (filterYear) params.append('admissionYear', filterYear);
      if (filterStatus) params.append('status', filterStatus);
      if (filterHasRoom) params.append('hasRoom', filterHasRoom);

      const response = await api.get(`/students?${params.toString()}`);
      setStudents(response.data.data);
      setTotal(response.data.total);
      setTotalPages(Math.ceil(response.data.total / limit));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách sinh viên');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      studentCode: '',
      fullName: '',
      email: '',
      phone: '',
      gender: 'MALE',
      dateOfBirth: '',
      major: '',
      classCode: '',
      admissionYear: currentYear,
      status: 'ACTIVE',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (student: Student) => {
    setModalMode('edit');
    setSelectedStudent(student);
    setFormData({
      studentCode: student.studentCode,
      fullName: student.fullName,
      email: student.email,
      phone: student.phone,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth.split('T')[0],
      major: student.major,
      classCode: student.classCode,
      admissionYear: student.admissionYear,
      status: student.status,
    });
    setFormError('');
    setShowModal(true);
  };

  const openDeleteModal = (student: Student) => {
    setSelectedStudent(student);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      if (modalMode === 'create') {
        await api.post('/students', formData);
      } else {
        await api.put(`/students/${selectedStudent?.id}`, formData);
      }
      setShowModal(false);
      fetchStudents();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;
    setDeleteLoading(true);

    try {
      await api.delete(`/students/${selectedStudent.id}`);
      setShowDeleteModal(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa sinh viên');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await api.post('/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setImportResult(response.data);
      if (response.data.success > 0) {
        fetchStudents();
      }
    } catch (err: any) {
      setImportResult({
        success: 0,
        failed: 0,
        errors: [err.response?.data?.message || 'Lỗi khi import file'],
      });
    } finally {
      setImportLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/students/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `students_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert('Không thể xuất file');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full whitespace-nowrap">Đang học</span>;
      case 'GRADUATED':
        return <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full whitespace-nowrap">Đã tốt nghiệp</span>;
      case 'SUSPENDED':
        return <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full whitespace-nowrap">Tạm nghỉ</span>;
      case 'DROPPED_OUT':
        return <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full whitespace-nowrap">Thôi học</span>;
      default:
        return null;
    }
  };

  const getGenderBadge = (gender: string) => (
    gender === 'MALE' ? (
      <span className="text-blue-600">♂</span>
    ) : (
      <span className="text-pink-600">♀</span>
    )
  );

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    const first = parts[0].slice(0, 1);
    const last = parts[parts.length - 1].slice(0, 1);
    return (first + last).toUpperCase();
  };

  const clearFilters = () => {
    setSearch('');
    setFilterMajor('');
    setFilterYear('');
    setFilterStatus('');
    setFilterHasRoom('');
    setPage(1);
  };

  const hasActiveFilters = search || filterMajor || filterYear || filterStatus || filterHasRoom;

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Sinh viên</h1>
          <p className="text-sm text-slate-500 mt-1">{total} sinh viên trong hệ thống</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm sinh viên
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[250px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo MSSV, tên, email, SĐT..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <select
              value={filterMajor}
              onChange={(e) => { setFilterMajor(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white min-w-[150px]"
            >
              <option value="">Tất cả ngành</option>
              {MAJORS.map((m) => <option key={m.code} value={m.code}>{m.code} - {m.name}</option>)}
            </select>

            <select
              value={filterYear}
              onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="">Tất cả khóa</option>
              {yearOptions.map((y) => <option key={y} value={y}>K{y - 1955}</option>)}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang học</option>
              <option value="GRADUATED">Đã tốt nghiệp</option>
              <option value="SUSPENDED">Tạm nghỉ</option>
              <option value="DROPPED_OUT">Thôi học</option>
            </select>

            <select
              value={filterHasRoom}
              onChange={(e) => { setFilterHasRoom(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="">Tất cả</option>
              <option value="true">Đang ở KTX</option>
              <option value="false">Chưa ở KTX</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Xóa bộ lọc
              </button>
            )}
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
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Sinh viên</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Liên hệ</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Ngành / Lớp</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Khóa</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Phòng KTX</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Trạng thái</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center ring-1 ring-emerald-200">
                              <span className="text-emerald-700 text-sm font-semibold">
                                {getInitials(student.fullName)}
                              </span>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full border border-slate-200 flex items-center justify-center">
                              <span className="text-[11px] leading-none">{getGenderBadge(student.gender)}</span>
                            </div>
                          </div>
                          <div className="min-w-0 pt-0.5">
                            <button
                              onClick={() => router.push(`/students/${student.id}`)}
                              className="group inline-flex items-start gap-1 text-left"
                            >
                              <span className="text-sm font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors line-clamp-2">
                                {student.fullName}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <p className="text-xs text-slate-500 whitespace-nowrap">{student.studentCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs text-slate-600 flex items-center gap-1">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span>{student.phone || '—'}</span>
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm text-slate-800">{student.major}</p>
                        <p className="text-xs text-slate-500">{student.classCode}</p>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="text-sm text-slate-600">K{student.admissionYear - 1955}</span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {student.currentRoom ? (
                          <button
                            onClick={() => router.push(`/rooms/${student.currentRoom!.id}`)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            <Home className="w-3 h-3" />
                            {student.currentRoom.code}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {getStatusBadge(student.status)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(student)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(student)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {students.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Không tìm thấy sinh viên nào</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, total)} / {total} sinh viên
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    Trước
                  </button>
                  <span className="text-sm text-slate-600">
                    Trang {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
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
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                {modalMode === 'create' ? 'Thêm sinh viên mới' : 'Chỉnh sửa sinh viên'}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">MSSV <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.studentCode}
                    onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                    placeholder="20210001"
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Giới tính <span className="text-red-500">*</span></label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Họ và tên <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@sis.hust.edu.vn"
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Số điện thoại <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0912345678"
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ngày sinh <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Ngành học <span className="text-red-500">*</span></label>
                  <select
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                    required
                  >
                    <option value="">Chọn ngành</option>
                    {MAJORS.map((m) => <option key={m.code} value={m.code}>{m.code} - {m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Lớp <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.classCode}
                    onChange={(e) => setFormData({ ...formData, classCode: e.target.value })}
                    placeholder="Việt-Nhật 01 K66"
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {modalMode === 'create' ? 'Năm nhập học' : 'Khóa'}
                  </label>
                  {modalMode === 'create' ? (
                    <select
                      value={formData.admissionYear}
                      onChange={(e) => setFormData({ ...formData, admissionYear: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                    >
                      {yearOptions.map((y) => <option key={y} value={y}>{y} (K{y - 1955})</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={`K${formData.admissionYear - 1955} (${formData.admissionYear})`}
                      disabled
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  )}
                </div>
                {modalMode === 'edit' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Trạng thái</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="ACTIVE">Đang học</option>
                      <option value="GRADUATED">Đã tốt nghiệp</option>
                      <option value="SUSPENDED">Tạm nghỉ</option>
                      <option value="DROPPED_OUT">Thôi học</option>
                    </select>
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
                  {modalMode === 'create' ? 'Thêm mới' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Xóa sinh viên?</h3>
              <p className="text-sm text-slate-500 mb-2">
                Bạn có chắc muốn xóa sinh viên <strong>{selectedStudent.fullName}</strong> ({selectedStudent.studentCode})?
              </p>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-6 text-left">
                Tài khoản sinh viên sẽ bị vô hiệu hóa và không thể đăng nhập. Dữ liệu lịch sử (hợp đồng, sự cố) vẫn được lưu lại.
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowImportModal(false); setImportFile(null); setImportResult(null); }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Import danh sách sinh viên</h3>
              <button onClick={() => { setShowImportModal(false); setImportFile(null); setImportResult(null); }} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5">
              {!importResult ? (
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors"
                  >
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    {importFile ? (
                      <p className="text-sm font-medium text-emerald-600">{importFile.name}</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-slate-700 mb-1">Kéo thả hoặc click để chọn file</p>
                        <p className="text-xs text-slate-500">Hỗ trợ file .csv, .xlsx</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />

                  <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs font-medium text-slate-700 mb-2">Định dạng file:</p>
                    <p className="text-xs text-slate-500">studentCode, fullName, email, phone, gender, dateOfBirth, major, classCode, admissionYear</p>
                  </div>

                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => { setShowImportModal(false); setImportFile(null); }}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={!importFile || importLoading}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg flex items-center justify-center gap-2"
                    >
                      {importLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Import
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center py-4">
                    {importResult.success > 0 ? (
                      <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    ) : (
                      <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    )}
                    <p className="text-lg font-semibold text-slate-800 mb-2">Kết quả import</p>
                    <div className="flex items-center justify-center gap-6 text-sm">
                      <span className="text-emerald-600">
                        <CheckCircle className="w-4 h-4 inline mr-1" />
                        Thành công: {importResult.success}
                      </span>
                      <span className="text-red-600">
                        <XCircle className="w-4 h-4 inline mr-1" />
                        Thất bại: {importResult.failed}
                      </span>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg max-h-40 overflow-y-auto">
                      <p className="text-xs font-medium text-red-700 mb-2">Lỗi:</p>
                      {importResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600">{err}</p>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => { setShowImportModal(false); setImportFile(null); setImportResult(null); }}
                    className="w-full mt-5 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                  >
                    Đóng
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
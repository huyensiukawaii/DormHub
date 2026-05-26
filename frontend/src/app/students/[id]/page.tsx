'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  ArrowLeft,
  Pencil,
  User,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  Home,
  FileSignature,
  Receipt,
  Wrench,
  AlertCircle,
  Loader2,
  MapPin,
  CreditCard,
  Clock,
  ChevronRight,
  HeartHandshake,
  X,
  Crown,
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
  hometown: string | null;
  idCardNumber: string | null;
  major: string;
  classCode: string;
  admissionYear: number;
  status: 'ACTIVE' | 'GRADUATED' | 'SUSPENDED' | 'DROPPED_OUT';
  avatar: string | null;
  createdAt: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  user: {
    id: number;
    email: string;
  } | null;
  currentContract: Contract | null;
  contractHistory: Contract[];
  stats: {
    totalContracts: number;
    totalInvoices: number;
    unpaidInvoices: number;
    totalTickets: number;
  };
}

interface Contract {
  id: number;
  contractNumber: string;
  isRoomLeader: boolean;
  room: {
    id: number;
    code: string;
    buildingName: string;
  };
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  monthlyRent: number;
  checkInDate: string | null;
  checkOutDate: string | null;
}

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    studentCode: '', fullName: '', email: '', phone: '',
    gender: 'MALE' as 'MALE' | 'FEMALE', dateOfBirth: '',
    major: '', classCode: '',
    status: 'ACTIVE' as Student['status'],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const openEdit = () => {
    if (!student) return;
    setFormData({
      studentCode: student.studentCode,
      fullName: student.fullName,
      email: student.email,
      phone: student.phone,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth.split('T')[0],
      major: student.major,
      classCode: student.classCode,
      status: student.status,
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      await api.put(`/students/${studentId}`, formData);
      setShowEditModal(false);
      fetchStudent();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setFormLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/students/${studentId}`);
      setStudent(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải thông tin sinh viên');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' đ';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full whitespace-nowrap">Đang học</span>;
      case 'GRADUATED':
        return <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full whitespace-nowrap">Đã tốt nghiệp</span>;
      case 'SUSPENDED':
        return <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full whitespace-nowrap">Tạm nghỉ</span>;
      case 'DROPPED_OUT':
        return <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full whitespace-nowrap">Thôi học</span>;
      default:
        return null;
    }
  };

  const getContractStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">Đang hiệu lực</span>;
      case 'EXPIRED':
        return <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">Hết hạn</span>;
      case 'TERMINATED':
        return <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">Đã kết thúc</span>;
      default:
        return null;
    }
  };

  const getGenderText = (gender: string) => gender === 'MALE' ? 'Nam' : 'Nữ';

  const currentRoomId = student?.currentContract?.room.id;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !student) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-red-500 mb-4">{error || 'Không tìm thấy sinh viên'}</p>
          <button onClick={() => router.push('/students')} className="text-emerald-600 hover:text-emerald-700 font-medium">
            Quay lại danh sách
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg transition-colors mt-1">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-4">
            {student.avatar ? (
              <img src={student.avatar} alt={student.fullName} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="text-emerald-700 text-2xl font-bold">{student.fullName.charAt(0)}</span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-800">{student.fullName}</h1>
                {getStatusBadge(student.status)}
              </div>
              <p className="text-sm text-slate-500 mt-1">{student.studentCode} • {student.classCode}</p>
            </div>
          </div>
        </div>
        <button
          onClick={openEdit}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
        >
          <Pencil className="w-4 h-4" />
          Chỉnh sửa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Personal info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Thông tin cá nhân</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Giới tính</p>
                  <p className="text-sm font-medium text-slate-800">{getGenderText(student.gender)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ngày sinh</p>
                  <p className="text-sm font-medium text-slate-800">{formatDate(student.dateOfBirth)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 flex-shrink-0 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm font-medium text-slate-800 break-all">{student.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Phone className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Số điện thoại</p>
                  <p className="text-sm font-medium text-slate-800">{student.phone}</p>
                </div>
              </div>

              {student.hometown && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Quê quán</p>
                    <p className="text-sm font-medium text-slate-800">{student.hometown}</p>
                  </div>
                </div>
              )}

              {student.idCardNumber && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">CCCD/CMND</p>
                    <p className="text-sm font-medium text-slate-800">{student.idCardNumber}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Academic info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Thông tin học tập</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ngành học</p>
                  <p className="text-sm font-medium text-slate-800">{student.major}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Lớp</p>
                  <p className="text-sm font-medium text-slate-800">{student.classCode}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Khóa</p>
                  <p className="text-sm font-medium text-slate-800">K{student.admissionYear - 1955} ({student.admissionYear})</p>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency contact */}
          {(student.emergencyContactName || student.emergencyContactPhone) && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <HeartHandshake className="w-4 h-4 text-rose-500" />
                <h3 className="text-base font-semibold text-slate-800">Liên hệ khẩn cấp</h3>
              </div>
              <div className="space-y-3">
                {student.emergencyContactName && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 flex-shrink-0 bg-rose-50 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Họ tên{student.emergencyContactRelation ? ` (${student.emergencyContactRelation})` : ''}</p>
                      <p className="text-sm font-medium text-slate-800">{student.emergencyContactName}</p>
                    </div>
                  </div>
                )}
                {student.emergencyContactPhone && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 flex-shrink-0 bg-rose-50 rounded-lg flex items-center justify-center">
                      <Phone className="w-4 h-4 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Số điện thoại</p>
                      <p className="text-sm font-medium text-slate-800">{student.emergencyContactPhone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Thống kê KTX</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-slate-800">{student.stats.totalContracts}</p>
                <p className="text-xs text-slate-500">Hợp đồng</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-slate-800">{student.stats.totalTickets}</p>
                <p className="text-xs text-slate-500">Sự cố</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${student.stats.unpaidInvoices > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                <p className={`text-2xl font-bold ${student.stats.unpaidInvoices > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                  {student.stats.unpaidInvoices}
                </p>
                <p className={`text-xs ${student.stats.unpaidInvoices > 0 ? 'text-red-500' : 'text-slate-500'}`}>Hóa đơn chưa trả</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-slate-800">{student.stats.totalInvoices}</p>
                <p className="text-xs text-slate-500">Tổng hóa đơn</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current room */}
          {student.currentContract && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-emerald-700 font-medium">Đang ở phòng</p>
                    <p className="text-xl font-bold text-emerald-800">
                      {student.currentContract.room.code} - {student.currentContract.room.buildingName}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/rooms/${student.currentContract.room.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Xem phòng
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="mt-4 flex items-center gap-6 text-sm text-emerald-700">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Nhận phòng: {student.currentContract.checkInDate ? formatDate(student.currentContract.checkInDate) : '—'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  HĐ đến: {formatDate(student.currentContract.endDate)}
                </span>
                <span className="flex items-center gap-1">
                  <Receipt className="w-4 h-4" />
                  {formatCurrency(student.currentContract.monthlyRent)}/tháng
                </span>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Thao tác nhanh</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                href={`/contracts?studentId=${student.id}`}
                className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-emerald-50 rounded-lg transition-colors group"
              >
                <FileSignature className="w-6 h-6 text-slate-500 group-hover:text-emerald-600" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-emerald-700">Hợp đồng</span>
              </Link>
              <Link
                href={`/invoices?studentId=${student.id}`}
                className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-emerald-50 rounded-lg transition-colors group"
              >
                <Receipt className="w-6 h-6 text-slate-500 group-hover:text-emerald-600" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-emerald-700">Hóa đơn</span>
              </Link>
              <Link
                href={`/tickets?studentId=${student.id}`}
                className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-emerald-50 rounded-lg transition-colors group"
              >
                <Wrench className="w-6 h-6 text-slate-500 group-hover:text-emerald-600" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-emerald-700">Sự cố</span>
              </Link>
              <Link
                href={`/applications?studentId=${student.id}`}
                className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-emerald-50 rounded-lg transition-colors group"
              >
                <Home className="w-6 h-6 text-slate-500 group-hover:text-emerald-600" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-emerald-700">Đăng ký KTX</span>
              </Link>
            </div>
          </div>

          {/* Contract history */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Lịch sử ở KTX</h3>
              <Link
                href={`/contracts?studentId=${student.id}`}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Xem tất cả
              </Link>
            </div>

            {student.contractHistory && student.contractHistory.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {student.contractHistory.map((contract) => (
                  <div key={contract.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          contract.status === 'ACTIVE' ? 'bg-emerald-100' : 'bg-slate-100'
                        }`}>
                          <Home className={`w-5 h-5 ${
                            contract.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-500'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-800">
                              {contract.room.code} - {contract.room.buildingName}
                            </p>
                            {getContractStatusBadge(contract.status)}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <p className="text-xs text-slate-500">Mã HĐ: {contract.contractNumber}</p>
                            {contract.isRoomLeader && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                                <Crown className="w-3 h-3" /> Trưởng phòng
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                            </span>
                            <span>{formatCurrency(contract.monthlyRent)}/tháng</span>
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/contracts/${contract.id}`}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-1">Chưa có lịch sử ở KTX</p>
                <p className="text-sm text-slate-400">Sinh viên chưa từng đăng ký ở ký túc xá</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Chỉnh sửa sinh viên</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">MSSV</label>
                  <input
                    type="text"
                    value={formData.studentCode}
                    disabled
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Giới tính <span className="text-red-500">*</span></label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'MALE' | 'FEMALE' })}
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
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Khóa</label>
                  <input
                    type="text"
                    value={`K${student.admissionYear - 1955} (${student.admissionYear})`}
                    disabled
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Student['status'] })}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="ACTIVE">Đang học</option>
                    <option value="GRADUATED">Đã tốt nghiệp</option>
                    <option value="SUSPENDED">Tạm nghỉ</option>
                    <option value="DROPPED_OUT">Thôi học</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg flex items-center justify-center gap-2"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
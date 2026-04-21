'use client';

import { useState, useEffect, useRef } from 'react';
import StudentLayout from '@/components/layouts/StudentLayout';
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Users,
  Star,
  Upload,
  Trash2,
  Clock,
  XCircle,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

interface ProfileData {
  studentCode: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  idCardNumber: string;
  email: string;
  phone: string;
  faculty: string;
  className: string;
  hometownProvince: string;
  hometownDistance: number;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
}

type DocType =
  | 'POOR_HOUSEHOLD'
  | 'NEAR_POOR'
  | 'ORPHAN'
  | 'DISABLED'
  | 'POLICY_FAMILY'
  | 'GPA_TRANSCRIPT';
type DocStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface PriorityDocument {
  id: number;
  type: DocType;
  fileUrl: string;
  fileName: string;
  status: DocStatus;
  reviewNote: string | null;
  reviewedBy: { fullName: string } | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface PriorityScore {
  score: number;
  approvedTypes: DocType[];
  breakdown: { type: DocType; label: string; points: number }[];
}

const DOC_CRITERIA: { type: DocType; label: string; description: string; points: number }[] = [
  { type: 'POOR_HOUSEHOLD', label: 'Hộ nghèo', description: 'Giấy xác nhận hộ nghèo từ địa phương', points: 15 },
  { type: 'NEAR_POOR', label: 'Hộ cận nghèo', description: 'Giấy xác nhận hộ cận nghèo từ địa phương', points: 10 },
  { type: 'ORPHAN', label: 'Mồ côi', description: 'Giấy khai sinh hoặc giấy tờ chứng minh mồ côi', points: 15 },
  { type: 'DISABLED', label: 'Khuyết tật', description: 'Giấy xác nhận khuyết tật từ cơ quan có thẩm quyền', points: 15 },
  { type: 'POLICY_FAMILY', label: 'Gia đình chính sách', description: 'Con thương binh, liệt sĩ, người có công', points: 10 },
  { type: 'GPA_TRANSCRIPT', label: 'Bảng điểm GPA', description: 'Bảng điểm kỳ gần nhất (GPA ≥2.5)', points: 10 },
];

const STATUS_CONFIG: Record<DocStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Chờ duyệt', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
  APPROVED: { label: 'Đã duyệt', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  REJECTED: { label: 'Từ chối', color: 'text-red-600 bg-red-50 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
};

async function openFile(docId: number) {
  try {
    const res = await api.get(`/student/priority-documents/${docId}/file`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    alert('Không thể mở file');
  }
}

export default function StudentProfile() {
  const [activeTab, setActiveTab] = useState<'personal' | 'emergency' | 'priority'>('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<ProfileData>({
    studentCode: '',
    fullName: '',
    gender: 'FEMALE',
    dateOfBirth: '',
    idCardNumber: '',
    email: '',
    phone: '',
    faculty: '',
    className: '',
    hometownProvince: '',
    hometownDistance: 0,
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
  });

  const [documents, setDocuments] = useState<PriorityDocument[]>([]);
  const [priorityScore, setPriorityScore] = useState<PriorityScore | null>(null);
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadType, setPendingUploadType] = useState<DocType | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'priority') fetchPriorityData();
  }, [activeTab]);

  const fetchProfile = async () => {
    if (getStoredUser()?.role !== 'STUDENT') return;
    try {
      const res = await api.get('/auth/me');
      const { student } = res.data;
      setFormData({
        studentCode: student?.studentCode ?? '',
        fullName: student?.fullName ?? res.data.fullName ?? '',
        gender: student?.gender ?? 'FEMALE',
        dateOfBirth: student?.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
        idCardNumber: student?.idCardNumber ?? '',
        email: student?.email ?? res.data.email ?? '',
        phone: student?.phone ?? res.data.phone ?? '',
        faculty: student?.faculty ?? '',
        className: student?.className ?? '',
        hometownProvince: student?.hometownProvince ?? '',
        hometownDistance: student?.hometownDistance ?? 0,
        emergencyContactName: student?.emergencyContactName ?? '',
        emergencyContactPhone: student?.emergencyContactPhone ?? '',
        emergencyContactRelation: student?.emergencyContactRelation ?? '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPriorityData = async () => {
    try {
      const [docsRes, scoreRes] = await Promise.all([
        api.get('/student/priority-documents'),
        api.get('/student/priority-documents/score'),
      ]);
      setDocuments(docsRes.data);
      setPriorityScore(scoreRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await api.put('/student/profile', {
        fullName: formData.fullName,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth || undefined,
        idCardNumber: formData.idCardNumber || undefined,
        hometownProvince: formData.hometownProvince || undefined,
        hometownDistance: formData.hometownDistance ?? undefined,
        emergencyContactName: formData.emergencyContactName || undefined,
        emergencyContactPhone: formData.emergencyContactPhone || undefined,
        emergencyContactRelation: formData.emergencyContactRelation || undefined,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  const triggerUpload = (type: DocType) => {
    setPendingUploadType(type);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadType) return;
    e.target.value = '';

    setUploading(pendingUploadType);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/student/priority-documents/upload?type=${pendingUploadType}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchPriorityData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Upload thất bại');
    } finally {
      setUploading(null);
      setPendingUploadType(null);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm('Xóa minh chứng này?')) return;
    setDeleting(docId);
    try {
      await api.delete(`/student/priority-documents/${docId}`);
      await fetchPriorityData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xóa thất bại');
    } finally {
      setDeleting(null);
    }
  };

  const getDocForType = (type: DocType) => documents.find((d) => d.type === type && d.status !== 'REJECTED') ?? documents.find((d) => d.type === type);

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Hồ sơ cá nhân</h1>
        <p className="text-sm text-slate-500 mt-1">Cập nhật thông tin và minh chứng ưu tiên</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-slate-200 mb-6">
        <div className="p-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-pink-600">{formData.fullName.charAt(0)}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{formData.fullName}</h2>
            <p className="text-sm text-slate-500">{formData.studentCode} - {formData.faculty}</p>
            <p className="text-sm text-slate-500">{formData.className}</p>
          </div>
          {priorityScore && priorityScore.score > 0 && (
            <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <div>
                <p className="text-lg font-bold text-amber-700 leading-none">{priorityScore.score}</p>
                <p className="text-xs text-amber-600">điểm ưu tiên</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-t border-slate-100 px-6">
          <div className="flex gap-6">
            {(['personal', 'emergency', 'priority'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'personal' ? 'Thông tin cá nhân' : tab === 'emergency' ? 'Liên hệ khẩn cấp' : 'Minh chứng ưu tiên'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Priority tab */}
      {activeTab === 'priority' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
          />

          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Minh chứng điểm ưu tiên</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Upload minh chứng để được tính điểm ưu tiên khi đăng ký KTX. Admin/Staff sẽ duyệt trong 1-3 ngày làm việc.
              </p>
            </div>
            {priorityScore && (
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-600">{priorityScore.score}</p>
                <p className="text-xs text-slate-500">điểm đã duyệt</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {DOC_CRITERIA.map((criterion) => {
              const doc = getDocForType(criterion.type);
              const statusCfg = doc ? STATUS_CONFIG[doc.status] : null;
              const isUploading = uploading === criterion.type;

              return (
                <div key={criterion.type} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-800">{criterion.label}</span>
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          +{criterion.points} điểm
                        </span>
                        {statusCfg && (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium border px-1.5 py-0.5 rounded ${statusCfg.color}`}>
                            {statusCfg.icon}
                            {statusCfg.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{criterion.description}</p>

                      {/* File info */}
                      {doc && (
                        <div className="mt-2 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-600 truncate max-w-xs">{doc.fileName}</span>
                          <button
                            onClick={() => openFile(doc.id)}
                            className="text-amber-600 hover:text-amber-700"
                            title="Xem file"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Review note if rejected */}
                      {doc?.status === 'REJECTED' && doc.reviewNote && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs text-red-600">
                            <span className="font-medium">Lý do từ chối:</span> {doc.reviewNote}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Upload button */}
                      {(!doc || doc.status === 'REJECTED') && (
                        <button
                          onClick={() => triggerUpload(criterion.type)}
                          disabled={isUploading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg transition-colors"
                        >
                          {isUploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          {doc?.status === 'REJECTED' ? 'Nộp lại' : 'Upload'}
                        </button>
                      )}

                      {/* Delete button (PENDING or REJECTED only) */}
                      {doc && doc.status !== 'APPROVED' && (
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deleting === doc.id}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          {deleting === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Score breakdown */}
          {priorityScore && priorityScore.breakdown.length > 0 && (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <h4 className="text-sm font-semibold text-emerald-800 mb-2">Điểm ưu tiên đã được duyệt</h4>
              <div className="space-y-1">
                {priorityScore.breakdown.map((item) => (
                  <div key={item.type} className="flex justify-between text-sm text-emerald-700">
                    <span>{item.label}</span>
                    <span className="font-semibold">+{item.points}</span>
                  </div>
                ))}
                <div className="border-t border-emerald-300 pt-1 mt-1 flex justify-between text-sm font-bold text-emerald-800">
                  <span>Tổng điểm</span>
                  <span>{priorityScore.score}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Personal + Emergency tabs inside a form */}
      {activeTab !== 'priority' && (
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-lg">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Đã lưu thông tin thành công!
              </div>
            )}

            {activeTab === 'personal' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">MSSV</label>
                    <input type="text" value={formData.studentCode} disabled className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Họ và tên <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Giới tính</label>
                    <input type="text" value={formData.gender === 'MALE' ? 'Nam' : 'Nữ'} disabled className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Ngày sinh</label>
                    <input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Số CCCD</label>
                    <input type="text" value={formData.idCardNumber} onChange={(e) => setFormData({ ...formData, idCardNumber: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                    <input type="email" value={formData.email} disabled className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-500" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Số điện thoại</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Khoa</label>
                    <input type="text" value={formData.faculty} disabled className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-500" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Lớp</label>
                    <input type="text" value={formData.className} disabled className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Tỉnh quê quán</label>
                    <input type="text" value={formData.hometownProvince} onChange={(e) => setFormData({ ...formData, hometownProvince: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Khoảng cách đến trường (km)</label>
                  <input type="number" value={formData.hometownDistance} onChange={(e) => setFormData({ ...formData, hometownDistance: parseInt(e.target.value) || 0 })} className="w-full max-w-xs px-4 py-2.5 text-sm border border-slate-200 rounded-lg" />
                </div>
              </div>
            )}

            {activeTab === 'emergency' && (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                  <div className="flex items-start gap-2">
                    <Users className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Thông tin liên hệ khẩn cấp</p>
                      <p className="text-xs text-amber-600 mt-0.5">Vui lòng cung cấp thông tin người thân để liên hệ trong trường hợp khẩn cấp</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Họ tên người liên hệ <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.emergencyContactName} onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })} placeholder="Nguyễn Văn A" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg" required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Số điện thoại <span className="text-red-500">*</span></label>
                    <input type="tel" value={formData.emergencyContactPhone} onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })} placeholder="0987654321" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Mối quan hệ <span className="text-red-500">*</span></label>
                    <select value={formData.emergencyContactRelation} onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white" required>
                      <option value="">Chọn mối quan hệ</option>
                      <option value="Bố">Bố</option>
                      <option value="Mẹ">Mẹ</option>
                      <option value="Anh/Chị">Anh/Chị</option>
                      <option value="Người thân khác">Người thân khác</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white text-sm font-medium rounded-lg transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu thay đổi
              </button>
            </div>
          </div>
        </form>
      )}
    </StudentLayout>
  );
}

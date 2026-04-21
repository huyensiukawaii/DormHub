'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Filter,
  User,
  Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';

type DocStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type DocType = 'POOR_HOUSEHOLD' | 'NEAR_POOR' | 'ORPHAN' | 'DISABLED' | 'POLICY_FAMILY' | 'GPA_TRANSCRIPT';

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
  student: {
    id: number;
    studentCode: string;
    fullName: string;
    faculty: string;
    className: string;
  };
}

const TYPE_LABELS: Record<DocType, string> = {
  POOR_HOUSEHOLD: 'Hộ nghèo',
  NEAR_POOR: 'Hộ cận nghèo',
  ORPHAN: 'Mồ côi',
  DISABLED: 'Khuyết tật',
  POLICY_FAMILY: 'Gia đình chính sách',
  GPA_TRANSCRIPT: 'Bảng điểm GPA',
};

async function openFile(docId: number) {
  try {
    const res = await api.get(`/admin/priority-documents/${docId}/file`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    alert('Không thể mở file');
  }
}

const TYPE_POINTS: Record<DocType, number> = {
  POOR_HOUSEHOLD: 15,
  NEAR_POOR: 10,
  ORPHAN: 15,
  DISABLED: 15,
  POLICY_FAMILY: 10,
  GPA_TRANSCRIPT: 10,
};

export default function PriorityDocumentsPage() {
  const [documents, setDocuments] = useState<PriorityDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DocStatus | ''>('PENDING');
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<{ docId: number } | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [statusFilter]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await api.get(`/admin/priority-documents${params}`);
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (docId: number) => {
    setReviewing(docId);
    try {
      await api.patch(`/admin/priority-documents/${docId}/review`, { action: 'APPROVED' });
      await fetchDocuments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setReviewing(null);
    }
  };

  const reject = async () => {
    if (!rejectModal) return;
    setReviewing(rejectModal.docId);
    try {
      await api.patch(`/admin/priority-documents/${rejectModal.docId}/review`, {
        action: 'REJECTED',
        reviewNote: rejectNote,
      });
      setRejectModal(null);
      setRejectNote('');
      await fetchDocuments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setReviewing(null);
    }
  };

  const pendingCount = documents.filter((d) => d.status === 'PENDING').length;

  const filteredDocuments = documents.filter((doc) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      doc.student.fullName.toLowerCase().includes(q) ||
      doc.student.studentCode.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Minh chứng ưu tiên</h1>
        <p className="text-sm text-slate-500 mt-1">
          Xét duyệt minh chứng điểm ưu tiên của sinh viên
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc mã sinh viên..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">Trạng thái:</span>
        {(['', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              statusFilter === s
                ? 'bg-amber-500 border-amber-500 text-white'
                : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {s === '' ? 'Tất cả' : s === 'PENDING' ? `Chờ duyệt${pendingCount > 0 && statusFilter !== 'PENDING' ? ` (${pendingCount})` : ''}` : s === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
          </button>
        ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Không có minh chứng nào</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Sinh viên</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Loại minh chứng</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">File</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Trạng thái</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Ngày nộp</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{doc.student.fullName}</p>
                          <p className="text-xs text-slate-500">{doc.student.studentCode} · {doc.student.className}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-800">{TYPE_LABELS[doc.type]}</span>
                      <span className="ml-2 text-xs text-amber-600 font-medium">+{TYPE_POINTS[doc.type]}đ</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openFile(doc.id)}
                        className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 max-w-[160px] truncate"
                        title="Xem file"
                      >
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{doc.fileName}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {doc.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> Chờ duyệt
                        </span>
                      )}
                      {doc.status === 'APPROVED' && (
                        <div>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Đã duyệt
                          </span>
                          {doc.reviewedBy && (
                            <p className="text-xs text-slate-400 mt-0.5">bởi {doc.reviewedBy.fullName}</p>
                          )}
                        </div>
                      )}
                      {doc.status === 'REJECTED' && (
                        <div>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> Từ chối
                          </span>
                          {doc.reviewNote && (
                            <p className="text-xs text-red-500 mt-0.5 max-w-[160px] truncate" title={doc.reviewNote}>
                              {doc.reviewNote}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {doc.status === 'PENDING' && (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => approve(doc.id)}
                            disabled={reviewing === doc.id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded-lg transition-colors whitespace-nowrap"
                          >
                            {reviewing === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            Duyệt
                          </button>
                          <button
                            onClick={() => { setRejectModal({ docId: doc.id }); setRejectNote(''); }}
                            disabled={reviewing === doc.id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg transition-colors whitespace-nowrap"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Từ chối
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Từ chối minh chứng</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Lý do từ chối</label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="VD: Giấy tờ không rõ ràng, hết hạn..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                Hủy
              </button>
              <button
                onClick={reject}
                disabled={reviewing !== null}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg"
              >
                {reviewing !== null && <Loader2 className="w-4 h-4 animate-spin" />}
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

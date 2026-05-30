'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Users,
  Building2,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  Trash2,
  Pencil,
  UserX,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

interface AssignedBuilding {
  building: { id: number; code: string; name: string };
  assignedAt: string;
}

interface StaffUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  assignedBuildings: AssignedBuilding[];
}

interface Building {
  id: number;
  code: string;
  name: string;
}

type StaffFormData = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

type EditFormData = {
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
};

// ── Read-only view for STAFF ───────────────────────────────────────────────
function StaffSelfView() {
  const currentUser = getStoredUser();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/buildings')
      .then((res) => {
        const all: Building[] = res.data.data || res.data;
        const ids = currentUser?.assignedBuildingIds ?? [];
        setBuildings(all.filter((b) => ids.includes(b.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tòa của tôi</h1>
          <p className="text-sm text-gray-500">Các tòa nhà bạn được phân công quản lý</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Tên</p>
          <p className="font-semibold text-gray-900">{currentUser?.fullName}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Email</p>
          <p className="text-gray-700">{currentUser?.email}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Tòa được phân công</p>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          ) : buildings.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Chưa được phân công tòa nào</p>
          ) : (
            <ul className="space-y-2">
              {buildings.map((b) => (
                <li key={b.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">{b.name}</p>
                    <p className="text-xs text-blue-500">Tòa {b.code}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Admin management view ──────────────────────────────────────────────────
function AdminView() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<StaffFormData>({ fullName: '', email: '', phone: '', password: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffUser | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({ fullName: '', email: '', phone: '', isActive: true });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = () => {
    Promise.all([api.get('/users?role=STAFF'), api.get('/buildings')])
      .then(([usersRes, buildingsRes]) => {
        setUsers(usersRes.data);
        setBuildings(buildingsRes.data.data || buildingsRes.data);
      })
      .catch(() => setError('Không thể tải danh sách nhân viên'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const assignedIds = selectedUser
    ? selectedUser.assignedBuildings.map((ab) => ab.building.id)
    : [];

  const handleToggleBuilding = async (building: Building) => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const isAssigned = assignedIds.includes(building.id);
      const res = isAssigned
        ? await api.delete(`/users/${selectedUser.id}/buildings/${building.id}`)
        : await api.post(`/users/${selectedUser.id}/buildings/${building.id}`, {});
      const updated: StaffUser = res.data;
      setSelectedUser(updated);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast('success', isAssigned ? 'Đã xóa phân công' : 'Đã giao tòa thành công');
    } catch {
      showToast('error', 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await api.put(`/users/${selectedUser.id}/buildings`, { buildingIds: [] });
      const updated: StaffUser = res.data;
      setSelectedUser(updated);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast('success', 'Đã xóa tất cả phân công');
    } catch {
      showToast('error', 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      const res = await api.post('/users', createForm);
      setUsers((prev) => [...prev, res.data]);
      setShowCreateModal(false);
      setCreateForm({ fullName: '', email: '', phone: '', password: '' });
      showToast('success', 'Đã tạo tài khoản nhân viên');
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setCreateLoading(false);
    }
  };

  const openEditModal = (user: StaffUser) => {
    setEditTarget(user);
    setEditForm({ fullName: user.fullName, email: user.email, phone: user.phone ?? '', isActive: user.isActive });
    setEditError('');
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    setEditError('');
    try {
      const res = await api.put(`/users/${editTarget.id}`, editForm);
      const updated: StaffUser = res.data;
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      if (selectedUser?.id === updated.id) setSelectedUser(updated);
      setShowEditModal(false);
      showToast('success', 'Đã cập nhật thông tin nhân viên');
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setEditLoading(false);
    }
  };

  const openDeleteModal = (user: StaffUser) => {
    setDeleteTarget(user);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setUsers((prev) => prev.map((u) => u.id === deleteTarget.id ? { ...u, isActive: false } : u));
      if (selectedUser?.id === deleteTarget.id) setSelectedUser(null);
      setShowDeleteModal(false);
      showToast('success', 'Đã vô hiệu hóa tài khoản nhân viên');
    } catch {
      showToast('error', 'Có lỗi xảy ra');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý nhân viên</h1>
            <p className="text-sm text-gray-500">Tạo tài khoản và phân công tòa nhà cho nhân viên</p>
          </div>
        </div>
        <button
          onClick={() => { setCreateError(''); setCreateForm({ fullName: '', email: '', phone: '', password: '' }); setShowCreateModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm nhân viên
        </button>
      </div>

      {toast && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff list */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-3">Danh sách nhân viên</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">Không có nhân viên nào</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((user) => (
                <li key={user.id}>
                  <div className={`flex items-center px-4 py-3 hover:bg-gray-50 transition-colors ${selectedUser?.id === user.id ? 'bg-blue-50' : ''} ${!user.isActive ? 'opacity-50' : ''}`}>
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.fullName}</p>
                        {!user.isActive && (
                          <span className="flex-shrink-0 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Đã vô hiệu</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </button>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      {user.assignedBuildings.length > 0 ? (
                        <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mr-1">
                          <Building2 className="w-3 h-3" />
                          {user.assignedBuildings.length} tòa
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 mr-1">Chưa giao tòa</span>
                      )}
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Sửa"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {user.isActive && (
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Vô hiệu hóa"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Building assignment panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {selectedUser ? (
            <>
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800">{selectedUser.fullName}</h2>
                  <p className="text-xs text-gray-500">{selectedUser.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {assignedIds.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      disabled={saving}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-2 py-1 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Xóa tất cả
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <p className="text-xs text-gray-500 mb-3">Bấm để giao / thu hồi phân công tòa</p>
                {buildings.map((building) => {
                  const isAssigned = assignedIds.includes(building.id);
                  return (
                    <button
                      key={building.id}
                      onClick={() => handleToggleBuilding(building)}
                      disabled={saving || !selectedUser.isActive}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all disabled:opacity-50 ${
                        isAssigned
                          ? 'bg-blue-50 border-blue-300 text-blue-800'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className={`w-4 h-4 ${isAssigned ? 'text-blue-500' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium">{building.name}</span>
                        <span className="text-xs text-gray-400">({building.code})</span>
                      </div>
                      {isAssigned ? (
                        <span className="flex items-center gap-1 text-xs text-blue-600">
                          <X className="w-3 h-3" /> Xóa
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Plus className="w-3 h-3" /> Giao
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <Building2 className="w-10 h-10" />
              <p className="text-sm">Chọn nhân viên để quản lý phân công tòa</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Thêm nhân viên mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {createError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {createError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ và tên <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="staff@dormhub.vn"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại</label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="0912345678"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Tối thiểu 6 ký tự"
                  minLength={6}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg flex items-center justify-center gap-2"
                >
                  {createLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Chỉnh sửa nhân viên</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-5 space-y-4">
              {editError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {editError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ và tên</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Tài khoản đang hoạt động</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg flex items-center justify-center gap-2"
                >
                  {editLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <UserX className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Vô hiệu hóa tài khoản?</h3>
              <p className="text-sm text-gray-500 mb-2">
                Bạn có chắc muốn vô hiệu hóa tài khoản <strong>{deleteTarget.fullName}</strong>?
              </p>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-6 text-left w-full">
                Nhân viên sẽ không thể đăng nhập. Dữ liệu lịch sử vẫn được giữ lại. Bạn có thể kích hoạt lại qua chức năng Sửa.
              </p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg flex items-center justify-center gap-2"
                >
                  {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Vô hiệu hóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page entry point ───────────────────────────────────────────────────────
export default function StaffPage() {
  const currentUser = getStoredUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <AdminLayout>
      {isAdmin ? <AdminView /> : <StaffSelfView />}
    </AdminLayout>
  );
}

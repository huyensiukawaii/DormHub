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

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    Promise.all([api.get('/users?role=STAFF'), api.get('/buildings')])
      .then(([usersRes, buildingsRes]) => {
        setUsers(usersRes.data);
        setBuildings(buildingsRes.data.data || buildingsRes.data);
      })
      .catch(() => setError('Không thể tải danh sách nhân viên'))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý nhân viên</h1>
          <p className="text-sm text-gray-500">Phân công tòa nhà cho nhân viên quản lý</p>
        </div>
      </div>

      {toast && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
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
                  <button
                    onClick={() => setSelectedUser(user)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      selectedUser?.id === user.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      {user.assignedBuildings.length > 0 ? (
                        <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          <Building2 className="w-3 h-3" />
                          {user.assignedBuildings.length} tòa
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Chưa giao tòa</span>
                      )}
                    </div>
                  </button>
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
                      disabled={saving}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
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

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Building2,
  AlertCircle,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser, type User } from '@/lib/auth';

interface Building {
  id: number;
  code: string;
  name: string;
  totalFloors: number;
  description: string | null;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  stats: {
    totalRooms: number;
    totalCapacity: number;
    occupiedCount: number;
    availableCount: number;
    occupancyRate: number;
  };
}

type BuildingFormData = {
  code: string;
  name: string;
  totalFloors: number;
  description: string;
  status: Building['status'];
};

export default function BuildingsPage() {
  const router = useRouter();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const [userRole, setUserRole] = useState<User['role'] | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [formData, setFormData] = useState<BuildingFormData>({
    code: '',
    name: '',
    totalFloors: 1,
    description: '',
    status: 'ACTIVE',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    setUserRole(getStoredUser()?.role ?? null);
  }, []);

  const isStaff = userRole === 'STAFF';

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/buildings');
      setBuildings(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách tòa nhà');
    } finally {
      setLoading(false);
    }
  };

  const filteredBuildings = buildings.filter(
    (b) =>
      b.code.toLowerCase().includes(search.toLowerCase()) ||
      b.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({ code: '', name: '', totalFloors: 1, description: '', status: 'ACTIVE' });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (building: Building) => {
    setModalMode('edit');
    setSelectedBuilding(building);
    setFormData({
      code: building.code,
      name: building.name,
      totalFloors: building.totalFloors,
      description: building.description || '',
      status: building.status,
    });
    setFormError('');
    setShowModal(true);
  };

  const openDeleteModal = (building: Building) => {
    setSelectedBuilding(building);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      if (modalMode === 'create') {
        await api.post('/buildings', formData);
      } else {
        await api.put(`/buildings/${selectedBuilding?.id}`, formData);
      }
      setShowModal(false);
      fetchBuildings();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBuilding) return;
    setDeleteLoading(true);

    try {
      await api.delete(`/buildings/${selectedBuilding.id}`);
      setShowDeleteModal(false);
      setSelectedBuilding(null);
      fetchBuildings();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa tòa nhà');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">Hoạt động</span>;
      case 'MAINTENANCE':
        return <span className="px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Bảo trì</span>;
      case 'INACTIVE':
        return <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">Ngừng hoạt động</span>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Tòa nhà</h1>
          <p className="text-sm text-slate-500 mt-1">{buildings.length} tòa nhà trong hệ thống</p>
        </div>
        {!isStaff && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm tòa nhà
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã hoặc tên tòa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Mã</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Tên tòa</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Số tầng</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Số phòng</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Sức chứa</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Đang ở</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Trạng thái</th>
                  {!isStaff && <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBuildings.map((building) => (
                  <tr key={building.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center justify-center w-12 h-8 bg-slate-100 text-slate-700 text-sm font-semibold rounded">
                        {building.code}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => router.push(`/buildings/${building.id}`)}
                        className="group flex flex-col items-start"
                      >
                        <span className="text-sm font-medium text-slate-800 group-hover:text-emerald-600 transition-colors flex items-center gap-1">
                          {building.name}
                          <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                        {building.description && (
                          <span className="text-xs text-slate-500 line-clamp-1 max-w-xs">{building.description}</span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm text-slate-600">{building.totalFloors} tầng</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm text-slate-600">{building.stats.totalRooms} phòng</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm text-slate-600">{building.stats.totalCapacity} người</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-medium text-slate-800">
                        {building.stats.occupiedCount}/{building.stats.totalCapacity}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">({building.stats.occupancyRate}%)</span>
                    </td>
                    <td className="px-4 py-4 text-center">{getStatusBadge(building.status)}</td>
                    {!isStaff && (
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(building)}
                            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(building)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredBuildings.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Không tìm thấy tòa nhà nào</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                {modalMode === 'create' ? 'Thêm tòa nhà mới' : 'Chỉnh sửa tòa nhà'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mã tòa nhà <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="VD: B01"
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên tòa nhà <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Tòa A1"
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Số tầng <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  value={formData.totalFloors}
                  onChange={(e) => setFormData({ ...formData, totalFloors: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả ngắn về tòa nhà..."
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
              </div>

              {modalMode === 'edit' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="MAINTENANCE">Bảo trì</option>
                    <option value="INACTIVE">Ngừng hoạt động</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg transition-colors flex items-center justify-center gap-2"
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
      {showDeleteModal && selectedBuilding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Xóa tòa nhà?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Bạn có chắc muốn xóa tòa nhà <strong>{selectedBuilding.name}</strong>? Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
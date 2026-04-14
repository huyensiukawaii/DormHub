'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  ArrowLeft,
  Search,
  Plus,
  Pencil,
  Trash2,
  DoorOpen,
  Users,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser, type User } from '@/lib/auth';

interface Building {
  id: number;
  code: string;
  name: string;
  totalFloors: number;
  description: string | null;
  status: string;
  stats: {
    totalRooms: number;
    totalCapacity: number;
    occupiedCount: number;
    availableCount: number;
    occupancyRate: number;
  };
  rooms: Room[];
}

interface Room {
  id: number;
  code: string;
  floor: number;
  roomType: 'STANDARD' | 'AIR_CONDITIONED';
  gender: 'MALE' | 'FEMALE';
  capacity: number;
  pricePerMonth: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  occupiedCount: number;
  availableCount: number;
}

type RoomFormData = {
  code: string;
  floor: number;
  roomType: Room['roomType'];
  gender: Room['gender'];
  capacity: number;
  pricePerMonth: number;
  description: string;
  status: Room['status'];
};

export default function BuildingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.id as string;

  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<RoomFormData>({
    code: '',
    floor: 1,
    roomType: 'STANDARD',
    gender: 'MALE',
    capacity: 8,
    pricePerMonth: 350000,
    description: '',
    status: 'ACTIVE',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [userRole, setUserRole] = useState<User['role'] | null>(null);

  useEffect(() => {
    fetchBuilding();
  }, [buildingId]);

  useEffect(() => {
    setUserRole(getStoredUser()?.role ?? null);
  }, []);

  const isStaff = userRole === 'STAFF';

  const fetchBuilding = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/buildings/${buildingId}`);
      setBuilding(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải thông tin tòa nhà');
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = building?.rooms.filter((room) => {
    if (search && !room.code.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterFloor && room.floor !== parseInt(filterFloor)) return false;
    if (filterType && room.roomType !== filterType) return false;
    if (filterGender && room.gender !== filterGender) return false;
    if (filterStatus && room.status !== filterStatus) return false;
    return true;
  }) || [];

  const floors = building ? Array.from({ length: building.totalFloors }, (_, i) => i + 1) : [];

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      code: '',
      floor: 1,
      roomType: 'STANDARD',
      gender: 'MALE',
      capacity: 8,
      pricePerMonth: 350000,
      description: '',
      status: 'ACTIVE',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (room: Room) => {
    setModalMode('edit');
    setSelectedRoom(room);
    setFormData({
      code: room.code,
      floor: room.floor,
      roomType: room.roomType,
      gender: room.gender,
      capacity: room.capacity,
      pricePerMonth: room.pricePerMonth,
      description: '',
      status: room.status,
    });
    setFormError('');
    setShowModal(true);
  };

  const openDeleteModal = (room: Room) => {
    setSelectedRoom(room);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const payload = { ...formData, buildingId: parseInt(buildingId) };
      if (modalMode === 'create') {
        await api.post('/rooms', payload);
      } else {
        await api.put(`/rooms/${selectedRoom?.id}`, payload);
      }
      setShowModal(false);
      fetchBuilding();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRoom) return;
    setDeleteLoading(true);

    try {
      await api.delete(`/rooms/${selectedRoom.id}`);
      setShowDeleteModal(false);
      setSelectedRoom(null);
      fetchBuilding();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa phòng');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' đ';

  const getRoomTypeBadge = (type: string) => (
    type === 'AIR_CONDITIONED' ? (
      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Điều hòa</span>
    ) : (
      <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">Thường</span>
    )
  );

  const getGenderBadge = (gender: string) => (
    gender === 'MALE' ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
        <span className="text-blue-500">♂</span> Nam
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-pink-50 text-pink-700 rounded-full">
        <span className="text-pink-500">♀</span> Nữ
      </span>
    )
  );

  const getStatusBadge = (status: string, occupiedCount: number, capacity: number) => {
    if (status !== 'ACTIVE') {
      return status === 'MAINTENANCE' ? (
        <span className="px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Bảo trì</span>
      ) : (
        <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">Ngừng HĐ</span>
      );
    }
    if (occupiedCount >= capacity) {
      return <span className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Đầy</span>;
    }
    return <span className="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">Còn chỗ</span>;
  };

  const getOccupancyBar = (occupied: number, capacity: number) => {
    const pct = (occupied / capacity) * 100;
    let color = 'bg-emerald-500';
    if (pct >= 100) color = 'bg-red-500';
    else if (pct >= 80) color = 'bg-amber-500';

    return (
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <span className="text-xs text-slate-600 whitespace-nowrap">{occupied}/{capacity}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !building) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-red-500 mb-4">{error || 'Không tìm thấy tòa nhà'}</p>
          <button onClick={() => router.push('/buildings')} className="text-emerald-600 hover:text-emerald-700 font-medium">
            Quay lại danh sách
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/buildings')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">{building.name}</h1>
              {building.status === 'ACTIVE' ? (
                <span className="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">Hoạt động</span>
              ) : building.status === 'MAINTENANCE' ? (
                <span className="px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Bảo trì</span>
              ) : (
                <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">Ngừng HĐ</span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Mã: {building.code} • {building.totalFloors} tầng</p>
          </div>
        </div>
        {!isStaff && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm phòng
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Tổng phòng</span>
            <DoorOpen className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">{building.stats.totalRooms}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Sức chứa</span>
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">{building.stats.totalCapacity}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Đang ở</span>
            <Users className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{building.stats.occupiedCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Còn trống</span>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">{building.stats.availableCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã phòng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <select
            value={filterFloor}
            onChange={(e) => setFilterFloor(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="">Tất cả tầng</option>
            {floors.map((f) => <option key={f} value={f}>Tầng {f}</option>)}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="">Tất cả loại</option>
            <option value="STANDARD">Thường</option>
            <option value="AIR_CONDITIONED">Điều hòa</option>
          </select>

          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="">Tất cả giới tính</option>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="MAINTENANCE">Bảo trì</option>
            <option value="INACTIVE">Ngừng HĐ</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Mã phòng</th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Tầng</th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Loại</th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Giới tính</th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Sức chứa</th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Đang ở</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Giá/tháng</th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Trạng thái</th>
                {!isStaff && <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">
                    <button
                      onClick={() => router.push(`/rooms/${room.id}`)}
                      className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      {room.code}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-slate-600">Tầng {room.floor}</td>
                  <td className="px-4 py-4 text-center">{getRoomTypeBadge(room.roomType)}</td>
                  <td className="px-4 py-4 text-center">{getGenderBadge(room.gender)}</td>
                  <td className="px-4 py-4 text-center text-sm text-slate-600">{room.capacity} người</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">{getOccupancyBar(room.occupiedCount, room.capacity)}</div>
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-medium text-slate-800">{formatCurrency(room.pricePerMonth)}</td>
                  <td className="px-4 py-4 text-center">{getStatusBadge(room.status, room.occupiedCount, room.capacity)}</td>
                  {!isStaff && (
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEditModal(room)} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Chỉnh sửa">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => openDeleteModal(room)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRooms.length === 0 && (
            <div className="text-center py-12">
              <DoorOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Không tìm thấy phòng nào</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">{modalMode === 'create' ? 'Thêm phòng mới' : 'Chỉnh sửa phòng'}</h3>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Mã phòng <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="VD: A101"
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tầng <span className="text-red-500">*</span></label>
                  <select
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                    required
                  >
                    {floors.map((f) => <option key={f} value={f}>Tầng {f}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Loại phòng <span className="text-red-500">*</span></label>
                  <select
                    value={formData.roomType}
                    onChange={(e) => setFormData({ ...formData, roomType: e.target.value as any })}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="STANDARD">Thường</option>
                    <option value="AIR_CONDITIONED">Điều hòa</option>
                  </select>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Sức chứa <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Giá/tháng (đ) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={formData.pricePerMonth}
                    onChange={(e) => setFormData({ ...formData, pricePerMonth: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg"
                    required
                  />
                </div>
              </div>

              {modalMode === 'edit' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="MAINTENANCE">Bảo trì</option>
                    <option value="INACTIVE">Ngừng HĐ</option>
                  </select>
                </div>
              )}

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
      {showDeleteModal && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Xóa phòng?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Bạn có chắc muốn xóa phòng <strong>{selectedRoom.code}</strong>?
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
    </AdminLayout>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  DoorOpen,
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
}

interface Room {
  id: number;
  code: string;
  buildingId: number;
  building: { id: number; code: string; name: string };
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
  buildingId: number;
  code: string;
  floor: number;
  roomType: Room['roomType'];
  gender: Room['gender'];
  capacity: number;
  pricePerMonth: number;
  status: Room['status'];
};

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<RoomFormData>({
    buildingId: 0,
    code: '',
    floor: 1,
    roomType: 'STANDARD',
    gender: 'MALE',
    capacity: 8,
    pricePerMonth: 350000,
    status: 'ACTIVE',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [userRole, setUserRole] = useState<User['role'] | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setUserRole(getStoredUser()?.role ?? null);
  }, []);

  const isStaff = userRole === 'STAFF';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsRes, buildingsRes] = await Promise.all([
        api.get('/rooms'),
        api.get('/buildings'),
      ]);
      setRooms(roomsRes.data);
      setBuildings(buildingsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter((room) => {
    if (search && !room.code.toLowerCase().includes(search.toLowerCase()) && 
        !room.building.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterBuilding && room.buildingId !== parseInt(filterBuilding)) return false;
    if (filterType && room.roomType !== filterType) return false;
    if (filterGender && room.gender !== filterGender) return false;
    if (filterStatus && room.status !== filterStatus) return false;
    return true;
  });

  const selectedBuildingFloors = formData.buildingId
    ? buildings.find(b => b.id === formData.buildingId)?.totalFloors || 1
    : 1;
  const floors = Array.from({ length: selectedBuildingFloors }, (_, i) => i + 1);

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      buildingId: buildings[0]?.id || 0,
      code: '',
      floor: 1,
      roomType: 'STANDARD',
      gender: 'MALE',
      capacity: 8,
      pricePerMonth: 350000,
      status: 'ACTIVE',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (room: Room) => {
    setModalMode('edit');
    setSelectedRoom(room);
    setFormData({
      buildingId: room.buildingId,
      code: room.code,
      floor: room.floor,
      roomType: room.roomType,
      gender: room.gender,
      capacity: room.capacity,
      pricePerMonth: room.pricePerMonth,
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
      if (modalMode === 'create') {
        await api.post('/rooms', formData);
      } else {
        await api.put(`/rooms/${selectedRoom?.id}`, formData);
      }
      setShowModal(false);
      fetchData();
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
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa phòng');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' đ';

  const getRoomTypeBadge = (type: string) => (
    type === 'AIR_CONDITIONED' ? (
      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full whitespace-nowrap">Điều hòa</span>
    ) : (
      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full whitespace-nowrap">Thường</span>
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
        <span className="inline-block px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full whitespace-nowrap">Bảo trì</span>
      ) : (
        <span className="inline-block px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full whitespace-nowrap">Ngừng HĐ</span>
      );
    }
    if (occupiedCount >= capacity) {
      return <span className="inline-block px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full whitespace-nowrap">Đầy</span>;
    }
    return <span className="inline-block px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full whitespace-nowrap">Còn chỗ</span>;
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

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Phòng</h1>
          <p className="text-sm text-slate-500 mt-1">{rooms.length} phòng trong hệ thống</p>
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

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã phòng, tòa nhà..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <select
            value={filterBuilding}
            onChange={(e) => setFilterBuilding(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="">Tất cả tòa</option>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
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
            <option value="ACTIVE">Còn chỗ</option>
            <option value="MAINTENANCE">Bảo trì</option>
            <option value="INACTIVE">Ngừng HĐ</option>
          </select>
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
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Mã phòng</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Tòa</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Tầng</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Loại</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Giới tính</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Sức chứa</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Đang ở</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Giá/tháng</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Trạng thái</th>
                  {!isStaff && <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/rooms/${room.id}`)}
                        className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        {room.code}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{room.building.name}</td>
                    <td className="px-4 py-3 text-center text-sm text-slate-600 whitespace-nowrap">Tầng {room.floor}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">{getRoomTypeBadge(room.roomType)}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">{getGenderBadge(room.gender)}</td>
                    <td className="px-4 py-3 text-center text-sm text-slate-600 whitespace-nowrap">{room.capacity} người</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">{getOccupancyBar(room.occupiedCount, room.capacity)}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-800 whitespace-nowrap">{formatCurrency(room.pricePerMonth)}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge(room.status, room.occupiedCount, room.capacity)}</td>
                    {!isStaff && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditModal(room)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Chỉnh sửa">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => openDeleteModal(room)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
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
        )}
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tòa nhà <span className="text-red-500">*</span></label>
                <select
                  value={formData.buildingId}
                  onChange={(e) => setFormData({ ...formData, buildingId: parseInt(e.target.value), floor: 1 })}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                  required
                >
                  <option value="">Chọn tòa nhà</option>
                  {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Mã phòng <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="VD: A101"
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg"
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Loại phòng</label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Giới tính</label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Sức chứa</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Giá/tháng (đ)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={formData.pricePerMonth}
                    onChange={(e) => setFormData({ ...formData, pricePerMonth: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg"
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
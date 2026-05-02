'use client';

import { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Zap,
  Droplets,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  Save,
  RefreshCw,
  Download,
  Upload,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

type MeterType = 'ELECTRICITY' | 'WATER';

interface RoomForReading {
  roomId: number;
  roomCode: string;
  buildingCode: string;
  buildingName: string;
  floor: number;
  occupants: number;
  previousReading: number;
  hasReading: boolean;
  currentReading: number | null;
  consumption: number | null;
  readingId: number | null;
}

interface Stats {
  month: string;
  totalOccupiedRooms: number;
  electricity: { recorded: number; remaining: number; totalConsumption: number; avgConsumption: number; unit: string };
  water: { recorded: number; remaining: number; totalConsumption: number; avgConsumption: number; unit: string };
}

interface Building {
  id: number;
  code: string;
  name: string;
}

export default function MetersPage() {
  // Current month default
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  const [meterType, setMeterType] = useState<MeterType>('ELECTRICITY');
  const [readingMonth, setReadingMonth] = useState(defaultMonth);
  const [buildingId, setBuildingId] = useState<string>('');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<RoomForReading[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Editable values
  const [editValues, setEditValues] = useState<Record<number, string>>({});
  const [saveResults, setSaveResults] = useState<Record<number, 'success' | 'error' | null>>({});
  const [importSummary, setImportSummary] = useState<{ matched: number; notFound: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [buildingsReady, setBuildingsReady] = useState(false);

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (buildingsReady && readingMonth) {
      fetchRooms();
      fetchStats();
    }
  }, [meterType, readingMonth, buildingId, buildingsReady]);

  const fetchBuildings = async () => {
    try {
      const res = await api.get('/buildings?status=ACTIVE&limit=50');
      const all: Building[] = res.data.data || res.data;
      const currentUser = getStoredUser();
      if (currentUser?.role === 'STAFF' && currentUser.assignedBuildingIds?.length) {
        const allowed = all.filter((b) => currentUser.assignedBuildingIds!.includes(b.id));
        setBuildings(allowed);
        if (allowed.length > 0) setBuildingId(String(allowed[0].id));
      } else {
        setBuildings(all);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBuildingsReady(true);
    }
  };

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('meterType', meterType);
      params.append('readingMonth', `${readingMonth}-01`);
      if (buildingId) params.append('buildingId', buildingId);

      const res = await api.get(`/meters/rooms?${params.toString()}`);
      setRooms(res.data);

      // Init edit values
      const vals: Record<number, string> = {};
      res.data.forEach((r: RoomForReading) => {
        vals[r.roomId] = r.currentReading !== null ? r.currentReading.toString() : '';
      });
      setEditValues(vals);
      setSaveResults({});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({ readingMonth: `${readingMonth}-01` });
      if (buildingId) params.append('buildingId', buildingId);
      const res = await api.get(`/meters/stats?${params.toString()}`);
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Excel: Tải mẫu ──────────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const headers = ['STT', 'Mã phòng', 'Tòa', 'Tầng', 'Chỉ số trước', 'Chỉ số hiện tại'];
    const data = rooms.map((r, i) => [
      i + 1,
      r.roomCode,
      r.buildingCode,
      r.floor,
      r.previousReading,
      r.currentReading ?? '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 8 },
      { wch: 8 }, { wch: 16 }, { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ghi chỉ số');
    const label = meterType === 'ELECTRICITY' ? 'dien' : 'nuoc';
    XLSX.writeFile(wb, `cong-to-${label}-${readingMonth}.xlsx`);
  };

  // ─── Excel: Import ────────────────────────────────────────────────────────
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    try {
        const data = new Uint8Array(buffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Cột 1 = Mã phòng, cột 5 = Chỉ số hiện tại (theo template)
        const roomMap = new Map(rooms.map((r) => [r.roomCode, r.roomId]));
        const newEditValues: Record<number, string> = {};
        const notFound: string[] = [];
        let matched = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const roomCode = String(row[1] ?? '').trim();
          const rawValue = row[5];
          if (!roomCode) continue;

          const roomId = roomMap.get(roomCode);
          if (roomId === undefined) {
            notFound.push(roomCode);
            continue;
          }

          if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
            const value = parseFloat(String(rawValue));
            if (!isNaN(value)) {
              newEditValues[roomId] = String(value);
              matched++;
            }
          }
        }

        setEditValues((prev) => ({ ...prev, ...newEditValues }));
        setImportSummary({ matched, notFound });
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => setImportSummary(null), 10000);
    } catch {
      alert('Không thể đọc file. Vui lòng dùng đúng mẫu Excel đã tải về.');
    }
  };

  const isRoomReadingValid = (room: RoomForReading) => {
    const value = editValues[room.roomId];
    if (!value || value.trim() === '') return false;
    const current = parseFloat(value);
    if (isNaN(current)) return false;
    return current >= room.previousReading;
  };

  const handleSaveAll = async () => {
    const toSave = rooms
      .filter((r) => !r.hasReading && isRoomReadingValid(r))
      .map((r) => ({
        roomId: r.roomId,
        currentReading: parseFloat(editValues[r.roomId]),
      }));

    if (toSave.length === 0) {
      alert('Không có phòng nào cần ghi');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/meters/batch', {
        meterType,
        readingMonth: `${readingMonth}-01`,
        readings: toSave,
      });

      // Update results
      const newResults: Record<number, 'success' | 'error'> = {};
      res.data.results.forEach((r: any) => {
        newResults[r.roomId] = r.success ? 'success' : 'error';
      });
      setSaveResults(newResults);

      // Refresh
      setTimeout(() => {
        fetchRooms();
        fetchStats();
      }, 500);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi lưu');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSingle = async (room: RoomForReading) => {
    const value = editValues[room.roomId];
    if (!value || value.trim() === '') return;

    const currentReading = parseFloat(value);
    if (isNaN(currentReading)) return;

    setSaveResults((prev) => ({ ...prev, [room.roomId]: null }));

    try {
      if (room.hasReading && room.readingId) {
        await api.put(`/meters/${room.readingId}`, { currentReading });
      } else {
        await api.post('/meters', {
          roomId: room.roomId,
          meterType,
          readingMonth: `${readingMonth}-01`,
          currentReading,
        });
      }
      setSaveResults((prev) => ({ ...prev, [room.roomId]: 'success' }));
      fetchRooms();
      fetchStats();
    } catch (err: any) {
      setSaveResults((prev) => ({ ...prev, [room.roomId]: 'error' }));
      alert(err.response?.data?.message || 'Lỗi');
    }
  };

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    if (search) {
      return r.roomCode.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const recordedCount = rooms.filter((r) => r.hasReading).length;
  const remainingCount = rooms.length - recordedCount;
  const unit = meterType === 'ELECTRICITY' ? 'kWh' : 'm³';
  const meterLabel = meterType === 'ELECTRICITY' ? 'Điện' : 'Nước';
  const MeterIcon = meterType === 'ELECTRICITY' ? Zap : Droplets;

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Ghi chỉ số công tơ</h1>
        <p className="text-sm text-slate-500 mt-1">Ghi chỉ số điện, nước hàng tháng cho từng phòng</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Meter type toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setMeterType('ELECTRICITY')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                meterType === 'ELECTRICITY'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Zap className="w-4 h-4" /> Điện
            </button>
            <button
              onClick={() => setMeterType('WATER')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                meterType === 'WATER'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Droplets className="w-4 h-4" /> Nước
            </button>
          </div>

          {/* Month picker */}
          <input
            type="month"
            value={readingMonth}
            onChange={(e) => setReadingMonth(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          />

          {/* Building filter */}
          <select
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            {getStoredUser()?.role !== 'STAFF' && <option value="">Tất cả tòa nhà</option>}
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[150px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm phòng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <button
            onClick={fetchRooms}
            className="p-2 hover:bg-slate-100 rounded-lg"
            title="Tải lại"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>

          <div className="h-5 w-px bg-slate-200" />

          {/* Excel actions */}
          <button
            onClick={handleDownloadTemplate}
            disabled={rooms.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40 rounded-lg transition-colors"
            title="Tải file Excel mẫu để điền chỉ số"
          >
            <Download className="w-4 h-4" />
            Tải mẫu
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors"
            title="Import chỉ số từ file Excel"
          >
            <Upload className="w-4 h-4" />
            Import Excel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportExcel}
            className="hidden"
          />
        </div>
      </div>

      {/* Import result banner */}
      {importSummary && (
        <div className={`mb-4 flex items-start gap-3 p-3 rounded-lg border text-sm ${
          importSummary.notFound.length > 0
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {importSummary.notFound.length > 0
            ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            : <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <div>
            <p className="font-medium">
              Đã import {importSummary.matched} phòng thành công.
            </p>
            {importSummary.notFound.length > 0 && (
              <p className="text-xs mt-0.5">
                Không tìm thấy: {importSummary.notFound.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{rooms.length}</p>
            <p className="text-xs text-slate-500">Tổng phòng</p>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{recordedCount}</p>
            <p className="text-xs text-emerald-700">Đã ghi</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{remainingCount}</p>
            <p className="text-xs text-amber-700">Chưa ghi</p>
          </div>
          <div className={`rounded-xl border p-4 text-center ${meterType === 'ELECTRICITY' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
            <p className={`text-2xl font-bold ${meterType === 'ELECTRICITY' ? 'text-yellow-600' : 'text-blue-600'}`}>
              {meterType === 'ELECTRICITY'
                ? stats.electricity.totalConsumption.toLocaleString('vi-VN')
                : stats.water.totalConsumption.toLocaleString('vi-VN')}
            </p>
            <p className={`text-xs ${meterType === 'ELECTRICITY' ? 'text-yellow-700' : 'text-blue-700'}`}>
              Tổng tiêu thụ ({unit})
            </p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {rooms.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Tiến độ ghi {meterLabel.toLowerCase()}</span>
            <span className="text-sm text-slate-500">{recordedCount}/{rooms.length} phòng</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${meterType === 'ELECTRICITY' ? 'bg-amber-500' : 'bg-blue-500'}`}
              style={{ width: `${rooms.length > 0 ? (recordedCount / rooms.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed min-w-[700px]">
                <colgroup>
                  <col className="w-[160px]" />
                  <col className="w-16" />
                  <col className="w-20" />
                  <col className="w-28" />
                  <col className="w-40" />
                  <col className="w-32" />
                  <col className="w-14" />
                  <col className="w-14" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Phòng</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Tòa</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Số người</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Chỉ số trước</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Chỉ số hiện tại</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Tiêu thụ</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Trạng thái</th>
                    <th className="w-14"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRooms.map((room) => {
                    const inputVal = editValues[room.roomId] || '';
                    const numVal = parseFloat(inputVal);
                    const consumption = !isNaN(numVal) ? numVal - room.previousReading : null;
                    const isValid = consumption !== null && consumption >= 0;
                    const result = saveResults[room.roomId];

                    return (
                      <tr key={room.roomId} className={`transition-colors ${room.hasReading ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-slate-800">{room.roomCode}</p>
                          <p className="text-xs text-slate-500">Tầng {room.floor}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">{room.buildingCode}</td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">{room.occupants}</td>
                        <td className="px-4 py-3 text-center text-sm font-mono text-slate-600">
                          {room.previousReading.toLocaleString('vi-VN')}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={inputVal}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, [room.roomId]: e.target.value }))}
                            placeholder="Nhập chỉ số..."
                            className={`w-full px-3 py-1.5 text-sm font-mono border rounded-lg text-center ${
                              room.hasReading
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : result === 'error'
                                ? 'border-red-300 bg-red-50'
                                : 'border-slate-200'
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isValid ? (
                            <span className="text-sm font-semibold font-mono text-slate-800">
                              {consumption!.toLocaleString('vi-VN')} <span className="text-xs text-slate-500 font-normal">{unit}</span>
                            </span>
                          ) : inputVal ? (
                            <span className="text-xs text-red-500">Không hợp lệ</span>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {room.hasReading ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                          ) : result === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                          ) : result === 'error' ? (
                            <AlertCircle className="w-5 h-5 text-red-500 mx-auto" />
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {(!room.hasReading || room.readingId) && inputVal && isValid && (
                            <button
                              onClick={() => handleSaveSingle(room)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg"
                              title="Lưu"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredRooms.length === 0 && !loading && (
                <div className="text-center py-12">
                  <MeterIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">
                    {rooms.length === 0
                      ? 'Không có phòng nào có người ở'
                      : 'Không tìm thấy phòng'}
                  </p>
                </div>
              )}
            </div>

            {/* Save all button */}
            {remainingCount > 0 && (
              <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                <p className="text-sm text-slate-500">
                  Còn <strong>{remainingCount}</strong> phòng chưa ghi chỉ số
                </p>
                <button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${
                    meterType === 'ELECTRICITY'
                      ? 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300'
                      : 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300'
                  }`}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Lưu tất cả ({rooms.filter((r) => !r.hasReading && isRoomReadingValid(r)).length} phòng)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StudentLayout from '@/components/layouts/StudentLayout';
import {
  FileText,
  RefreshCw,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  Home,
  CheckCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

type ApplicationType = 'NEW' | 'RENEWAL';
type Step = 1 | 2 | 3;

interface Room {
  id: number;
  code: string;
  buildingName: string;
  floor: number;
  roomType: 'STANDARD' | 'AIR_CONDITIONED';
  capacity: number;
  availableSlots: number;
  pricePerMonth: number;
  gender: 'MALE' | 'FEMALE';
  isCurrentRoom?: boolean;
}

interface PeriodInfo {
  id: number;
  code: string;
  name: string;
  endDate: string;
  allowedTypes: string;
  autoAssignRoom: boolean;
}

export default function RegisterKTXPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [period, setPeriod] = useState<PeriodInfo | null>(null);
  const [noPeriod, setNoPeriod] = useState(false);
  const [hasActiveContract, setHasActiveContract] = useState(false);
  const [existingApplicationId, setExistingApplicationId] = useState<number | null>(null);

  const [applicationType, setApplicationType] = useState<ApplicationType>('NEW');

  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);

  const steps = [
    { number: 1, label: 'Loại đăng ký' },
    { number: 2, label: 'Chọn nguyện vọng' },
    { number: 3, label: 'Xác nhận' },
  ];

  useEffect(() => {
    fetchPeriod();
  }, []);

  const fetchPeriod = async () => {
    if (getStoredUser()?.role !== 'STUDENT') return;
    try {
      const res = await api.get('/student/register/period');
      if (!res.data || res.data.data === null) {
        setNoPeriod(true);
        return;
      }

      const { period: p, availableRooms: rooms } = res.data;
      const isAutoAssign = !!p.autoAssignRoom;

      // For manual-review periods: redirect if already applied
      if (res.data.hasExistingApplication && !isAutoAssign) {
        router.push('/student/applications');
        return;
      }

      if (res.data.hasExistingApplication && isAutoAssign) {
        setExistingApplicationId(res.data.existingApplicationId ?? null);
      }

      setPeriod({
        id: p.id,
        code: p.code,
        name: p.name,
        endDate: p.endDate,
        allowedTypes: p.allowedTypes ?? 'ALL',
        autoAssignRoom: isAutoAssign,
      });
      const hasContract = !!res.data.hasActiveContract;
      setHasActiveContract(hasContract);
      const cRoomId: number | null = res.data.currentRoomId ?? null;
      setCurrentRoomId(cRoomId);
      // Auto-select type based on student's current status, then override with period restriction
      let autoType: ApplicationType = hasContract ? 'RENEWAL' : 'NEW';
      if (p.allowedTypes === 'NEW_ONLY') autoType = 'NEW';
      if (p.allowedTypes === 'RENEWAL_ONLY') autoType = 'RENEWAL';
      setApplicationType(autoType);
      setAvailableRooms(rooms);
      // Pre-select room: existing approved choice takes priority, then current room for RENEWAL.
      // Only pre-select if the room is actually in the available list for this period
      // (it may be absent when allowedBuildingIds restricts it to a different building).
      const existingRoomId: number | null = res.data.existingApprovedRoomId ?? null;
      const preSelect = existingRoomId ?? (autoType === 'RENEWAL' ? cRoomId : null);
      const preSelectValid = preSelect !== null && rooms.some((r: { id: number }) => r.id === preSelect);
      if (preSelectValid) setSelectedRooms([preSelect as number]);
    } catch (err) {
      setNoPeriod(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomSelect = (roomId: number) => {
    if (selectedRooms.includes(roomId)) {
      setSelectedRooms(selectedRooms.filter((id) => id !== roomId));
    } else if (period?.autoAssignRoom) {
      // Auto-assign: replace selection (only 1 room)
      setSelectedRooms([roomId]);
    } else if (selectedRooms.length < 3) {
      setSelectedRooms([...selectedRooms, roomId]);
    }
  };

  const moveRoomUp = (index: number) => {
    if (index === 0) return;
    const newRooms = [...selectedRooms];
    [newRooms[index - 1], newRooms[index]] = [newRooms[index], newRooms[index - 1]];
    setSelectedRooms(newRooms);
  };

  const moveRoomDown = (index: number) => {
    if (index === selectedRooms.length - 1) return;
    const newRooms = [...selectedRooms];
    [newRooms[index], newRooms[index + 1]] = [newRooms[index + 1], newRooms[index]];
    setSelectedRooms(newRooms);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      await api.post('/student/applications', {
        applicationType,
        priorityInfo: {},
        roomPreferences: selectedRooms.map((roomId, index) => ({
          priority: index + 1,
          roomId,
        })),
      });
      router.push('/student/applications?success=true');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (currentStep === 2) {
      if (period?.autoAssignRoom) return selectedRooms.length === 1;
      return selectedRooms.length > 0;
    }
    return true;
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' đ';

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </StudentLayout>
    );
  }

  if (noPeriod || !period) {
    return (
      <StudentLayout>
        <div className="max-w-lg mx-auto py-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Chưa có đợt đăng ký</h2>
          <p className="text-sm text-slate-500 mb-6">
            Hiện tại chưa có đợt đăng ký KTX nào đang mở. Vui lòng quay lại sau.
          </p>
          <button
            onClick={() => router.push('/student/dashboard')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg"
          >
            Quay lại trang chủ
          </button>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Đăng ký KTX</h1>
        <p className="text-sm text-slate-500 mt-1">
          {period.name} - Đang mở đến {new Date(period.endDate).toLocaleDateString('vi-VN')}
        </p>
      </div>

      {/* Progress steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center max-w-lg mx-auto">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    currentStep >= step.number
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {currentStep > step.number ? <Check className="w-4 h-4" /> : step.number}
                </div>
                <span className={`text-xs mt-1.5 ${currentStep >= step.number ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-24 sm:w-36 h-0.5 mx-2 mb-4 ${currentStep > step.number ? 'bg-amber-500' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-3xl mx-auto">
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Step 1: Application Type */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Chọn loại đăng ký</h2>
            {period.allowedTypes !== 'ALL' && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {period.allowedTypes === 'NEW_ONLY'
                  ? 'Đợt này chỉ nhận đăng ký mới.'
                  : 'Đợt này chỉ nhận đơn gia hạn.'}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {period.allowedTypes !== 'RENEWAL_ONLY' && (
                <button
                  onClick={() => { setApplicationType('NEW'); setSelectedRooms([]); }}
                  disabled={hasActiveContract || period.allowedTypes === 'RENEWAL_ONLY'}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    applicationType === 'NEW'
                      ? 'border-amber-500 bg-amber-50'
                      : !hasActiveContract && period.allowedTypes !== 'RENEWAL_ONLY'
                      ? 'border-slate-200 hover:border-slate-300'
                      : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    applicationType === 'NEW' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">Đăng ký mới</h3>
                  <p className="text-xs text-slate-500">Dành cho sinh viên chưa ở KTX</p>
                </button>
              )}

              {period.allowedTypes !== 'NEW_ONLY' && (
                <button
                  onClick={() => {
                    setApplicationType('RENEWAL');
                    const inList = !!currentRoomId && availableRooms.some((r) => r.id === currentRoomId);
                    setSelectedRooms(inList ? [currentRoomId!] : []);
                  }}
                  disabled={!hasActiveContract}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    applicationType === 'RENEWAL'
                      ? 'border-amber-500 bg-amber-50'
                      : hasActiveContract
                      ? 'border-slate-200 hover:border-slate-300'
                      : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    applicationType === 'RENEWAL' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">Gia hạn</h3>
                  <p className="text-xs text-slate-500">Dành cho sinh viên đang ở KTX</p>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Room Preferences */}
        {currentStep === 2 && period && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">
              {period.autoAssignRoom ? 'Chọn phòng' : 'Chọn nguyện vọng'}
            </h2>
            {period.autoAssignRoom ? (
              <p className="text-xs text-slate-500 mb-4">
                Chọn 1 phòng còn chỗ. Hợp đồng sẽ được tạo sau khi đợt kết thúc.
                {existingApplicationId && ' Bạn có thể đổi lựa chọn bất kỳ lúc nào trước deadline.'}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mb-4">Chọn tối đa 3 phòng theo thứ tự ưu tiên.</p>
            )}

            {/* Selected room(s) */}
            {selectedRooms.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-700 mb-2">
                  {period.autoAssignRoom ? 'PHÒNG ĐÃ CHỌN' : 'NGUYỆN VỌNG'}
                </h3>
                <div className="space-y-2">
                  {selectedRooms.map((roomId, index) => {
                    const room = availableRooms.find((r) => r.id === roomId);
                    if (!room) return null;
                    return (
                      <div key={roomId} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        {!period.autoAssignRoom && (
                          <span className="w-6 h-6 bg-amber-500 text-white text-sm font-semibold rounded-full flex items-center justify-center">
                            {index + 1}
                          </span>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">
                              {room.code} - {room.buildingName}
                            </span>
                            {room.isCurrentRoom && (
                              <span className="px-1.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                                Phòng hiện tại
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            Tầng {room.floor} • {room.roomType === 'AIR_CONDITIONED' ? 'Điều hòa' : 'Thường'} • Còn {room.availableSlots}/{room.capacity} chỗ • {formatCurrency(room.pricePerMonth)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!period.autoAssignRoom && (
                            <>
                              <button onClick={() => moveRoomUp(index)} disabled={index === 0} className="p-1 hover:bg-amber-100 rounded disabled:opacity-30">↑</button>
                              <button onClick={() => moveRoomDown(index)} disabled={index === selectedRooms.length - 1} className="p-1 hover:bg-amber-100 rounded disabled:opacity-30">↓</button>
                            </>
                          )}
                          <button onClick={() => handleRoomSelect(roomId)} className="p-1 hover:bg-red-100 text-red-500 rounded ml-1">✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available rooms list */}
            {(!period.autoAssignRoom || selectedRooms.length === 0) && (
              <>
                <h3 className="text-sm font-medium text-slate-700 mb-2">
                  PHÒNG CÒN TRỐNG ({availableRooms.filter((r) => !selectedRooms.includes(r.id) && r.availableSlots > 0).length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableRooms
                    .filter((r) => !selectedRooms.includes(r.id) && r.availableSlots > 0)
                    .sort((a, b) => (b.isCurrentRoom ? 1 : 0) - (a.isCurrentRoom ? 1 : 0))
                    .map((room) => (
                      <button
                        key={room.id}
                        onClick={() => handleRoomSelect(room.id)}
                        disabled={!period.autoAssignRoom && selectedRooms.length >= 3}
                        className={`w-full flex items-center justify-between p-3 border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          room.isCurrentRoom
                            ? 'border-emerald-300 bg-emerald-50 hover:border-emerald-400'
                            : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${room.isCurrentRoom ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                            <Home className={`w-5 h-5 ${room.isCurrentRoom ? 'text-emerald-600' : 'text-slate-600'}`} />
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-800">
                                {room.code} - {room.buildingName}
                              </p>
                              {room.isCurrentRoom && (
                                <span className="px-1.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                                  Phòng hiện tại
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              Tầng {room.floor} • {room.roomType === 'AIR_CONDITIONED' ? 'Điều hòa' : 'Thường'} • Còn {room.availableSlots}/{room.capacity} chỗ
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-amber-600">{formatCurrency(room.pricePerMonth)}</span>
                      </button>
                    ))}
                </div>
                {availableRooms.filter((r) => r.availableSlots === 0 && !r.isCurrentRoom).length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium text-slate-500">ĐÃ HẾT CHỖ</p>
                    {availableRooms
                      .filter((r) => r.availableSlots === 0 && !r.isCurrentRoom)
                      .map((room) => (
                        <div key={room.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg opacity-50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                              <Home className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium text-slate-600">{room.code} - {room.buildingName}</p>
                              <p className="text-xs text-red-500">Đã hết chỗ ({room.capacity}/{room.capacity})</p>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400">{formatCurrency(room.pricePerMonth)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3: Confirmation */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Xác nhận đăng ký</h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Loại đăng ký</h3>
                <p className="text-sm text-slate-800">{applicationType === 'NEW' ? 'Đăng ký mới' : 'Gia hạn'}</p>
              </div>

              {selectedRooms.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Nguyện vọng phòng</h3>
                  <div className="space-y-1">
                    {selectedRooms.map((roomId, index) => {
                      const room = availableRooms.find((r) => r.id === roomId);
                      return (
                        <div key={roomId} className="flex items-center gap-2">
                          <p className="text-sm text-slate-800">
                            {index + 1}. {room?.code} - {room?.buildingName}
                          </p>
                          {room?.isCurrentRoom && (
                            <span className="px-1.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                              Phòng hiện tại
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Lưu ý quan trọng</p>
                    {period?.autoAssignRoom ? (
                      <ul className="text-xs text-amber-700 mt-1 space-y-1 list-disc list-inside">
                        <li>Phòng được giữ chỗ ngay sau khi nộp đơn</li>
                        <li>Bạn có thể đổi phòng bất kỳ lúc nào trước khi đợt kết thúc</li>
                        <li>Hợp đồng sẽ được tạo tự động sau khi đợt đóng đăng ký</li>
                      </ul>
                    ) : (
                      <ul className="text-xs text-amber-700 mt-1 space-y-1 list-disc list-inside">
                        <li>Đơn sẽ được xét duyệt theo điểm ưu tiên</li>
                        <li>Kết quả sẽ được thông báo qua email</li>
                        <li>Sau khi được duyệt, bạn cần xác nhận nhận phòng trong 3 ngày</li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep((currentStep - 1) as Step)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
              Quay lại
            </button>
          ) : (
            <div />
          )}

          {currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep((currentStep + 1) as Step)}
              disabled={!canProceed()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Tiếp theo
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {existingApplicationId ? 'Đổi phòng' : 'Gửi đơn đăng ký'}
            </button>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}

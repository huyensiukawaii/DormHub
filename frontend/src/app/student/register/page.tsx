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
}

interface PeriodInfo {
  id: number;
  code: string;
  name: string;
  endDate: string;
  allowRoomPreference: boolean;
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

  const [applicationType, setApplicationType] = useState<ApplicationType>('NEW');

  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);

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

      if (res.data.hasExistingApplication) {
        router.push('/student/applications');
        return;
      }

      const { period: p, availableRooms: rooms } = res.data;
      setPeriod({
        id: p.id,
        code: p.code,
        name: p.name,
        endDate: p.endDate,
        allowRoomPreference: p.allowRoomPreference,
      });
      setAvailableRooms(rooms);
      setHasActiveContract(!!res.data.hasActiveContract);
    } catch (err) {
      setNoPeriod(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomSelect = (roomId: number) => {
    if (selectedRooms.includes(roomId)) {
      setSelectedRooms(selectedRooms.filter((id) => id !== roomId));
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setApplicationType('NEW')}
                className={`p-5 rounded-xl border-2 text-left transition-all ${
                  applicationType === 'NEW'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-slate-200 hover:border-slate-300'
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

              <button
                onClick={() => setApplicationType('RENEWAL')}
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
            </div>
          </div>
        )}

        {/* Step 2: Room Preferences */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Chọn nguyện vọng</h2>

            <>
                {selectedRooms.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-700 mb-2">NGUYỆN VỌNG</h3>
                    <div className="space-y-2">
                      {selectedRooms.map((roomId, index) => {
                        const room = availableRooms.find((r) => r.id === roomId);
                        if (!room) return null;
                        return (
                          <div key={roomId} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <span className="w-6 h-6 bg-amber-500 text-white text-sm font-semibold rounded-full flex items-center justify-center">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <span className="text-sm font-medium text-slate-800">
                                {room.code} - {room.buildingName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => moveRoomUp(index)} disabled={index === 0} className="p-1 hover:bg-amber-100 rounded disabled:opacity-30">↑</button>
                              <button onClick={() => moveRoomDown(index)} disabled={index === selectedRooms.length - 1} className="p-1 hover:bg-amber-100 rounded disabled:opacity-30">↓</button>
                              <button onClick={() => handleRoomSelect(roomId)} className="p-1 hover:bg-red-100 text-red-500 rounded ml-2">✕</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <h3 className="text-sm font-medium text-slate-700 mb-2">
                  PHÒNG CÒN TRỐNG ({availableRooms.filter((r) => !selectedRooms.includes(r.id) && r.availableSlots > 0).length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableRooms
                    .filter((r) => !selectedRooms.includes(r.id) && r.availableSlots > 0)
                    .map((room) => (
                      <button
                        key={room.id}
                        onClick={() => handleRoomSelect(room.id)}
                        disabled={selectedRooms.length >= 3}
                        className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Home className="w-5 h-5 text-slate-600" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-slate-800">
                              {room.code} - {room.buildingName}
                            </p>
                            <p className="text-xs text-slate-500">
                              Tầng {room.floor} • {room.roomType === 'AIR_CONDITIONED' ? 'Điều hòa' : 'Thường'} • Còn {room.availableSlots}/{room.capacity} chỗ
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-amber-600">{formatCurrency(room.pricePerMonth)}</span>
                      </button>
                    ))}
                </div>
                <p className="text-xs text-slate-500 mt-3">Chọn tối đa 3 phòng theo thứ tự ưu tiên.</p>
              </>
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
                        <p key={roomId} className="text-sm text-slate-800">
                          {index + 1}. {room?.code} - {room?.buildingName}
                        </p>
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
                    <ul className="text-xs text-amber-700 mt-1 space-y-1 list-disc list-inside">
                      <li>Đơn sẽ được xét duyệt theo điểm ưu tiên</li>
                      <li>Kết quả sẽ được thông báo qua email</li>
                      <li>Sau khi được duyệt, bạn cần xác nhận nhận phòng trong 3 ngày</li>
                    </ul>
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
              Gửi đơn đăng ký
            </button>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}

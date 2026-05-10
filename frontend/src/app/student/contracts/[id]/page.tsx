'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import StudentLayout from '@/components/layouts/StudentLayout';
import {
  ArrowLeft,
  Calendar,
  Loader2,
  AlertCircle,
  LogIn,
  Crown,
  FileText,
  CalendarX,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';

interface ContractDetail {
  id: number;
  code: string;
  status: 'ACTIVE' | 'TERMINATED' | 'EXPIRED';
  startDate: string;
  endDate: string;
  monthlyRent: number;
  isRoomLeader: boolean;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  terminationReason: string | null;
  daysRemaining: number;
  currentOccupants: number;
  student: {
    id: number;
    studentCode: string;
    fullName: string;
    gender: string;
    faculty: string;
  };
  room: {
    id: number;
    code: string;
    floor: number;
    roomType: string;
    capacity: number;
    pricePerMonth: number;
    building: { code: string; name: string };
  };
  application: {
    id: number;
    type: string;
    period: { name: string };
  } | null;
  roommates: Array<{ id: number; studentCode: string; fullName: string; gender: string; isRoomLeader: boolean }>;
}

export default function StudentContractDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = params.id as string;

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDetail();
  }, [contractId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/student/contracts/${contractId}`);
      setContract(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải chi tiết');
    } finally {
      setLoading(false);
    }
  };

  const fd = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' });
  const fc = (v: number | string) => new Intl.NumberFormat('vi-VN').format(typeof v === 'string' ? parseFloat(v) : v) + 'đ/tháng';

  if (loading) return <StudentLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div></StudentLayout>;
  if (error || !contract) return <StudentLayout><div className="flex flex-col items-center justify-center py-20"><AlertCircle className="w-12 h-12 text-red-400 mb-3" /><p className="text-red-500 mb-4">{error}</p><Link href="/student/contracts" className="text-amber-600 font-medium">Quay lại</Link></div></StudentLayout>;

  return (
    <StudentLayout>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg mt-0.5">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-800">Chi tiết Hợp đồng</h1>
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-sm font-mono font-semibold rounded-md">{contract.code}</span>
              {contract.isRoomLeader && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                  <Crown className="w-3 h-3" /> Trưởng phòng
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">{fd(contract.startDate)} → {fd(contract.endDate)}</p>
          </div>
        </div>
        {contract.status === 'ACTIVE' && <span className="px-3 py-1 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">Hoạt động</span>}
        {contract.status === 'EXPIRED' && <span className="px-3 py-1 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full">Hết hạn</span>}
        {contract.status === 'TERMINATED' && <span className="px-3 py-1 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full">Đã chấm dứt</span>}
      </div>

      {contract.status === 'TERMINATED' && contract.terminationReason && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Hợp đồng đã bị chấm dứt</p>
            <p className="text-sm text-red-700 mt-1">{contract.terminationReason}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT */}
        <div className="space-y-6">
          {/* Thông tin Phòng */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Thông tin Phòng</h3>
            <div className="space-y-0">
              {[
                ['Phòng', contract.room.code],
                ['Tòa nhà', contract.room.building.name],
                ['Tầng', `Tầng ${contract.room.floor}`],
                ['Loại phòng', contract.room.roomType === 'AIR_CONDITIONED' ? 'Điều hòa' : 'Thường'],
                ['Sức chứa', `${contract.currentOccupants}/${contract.room.capacity} người`],
                ['Tiền phòng', fc(contract.monthlyRent)],
              ].map(([label, value], i) => (
                <div key={i} className={`flex items-center justify-between py-2.5 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-semibold text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ghi chú */}
          {contract.application && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
              <div className="flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Ghi chú</p>
                  <p className="text-sm text-slate-700">
                    Hợp đồng ký {contract.application.period.name}
                    {contract.application.type === 'RENEWAL' && ' (Gia hạn)'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          {/* Thời gian */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Thời gian hợp đồng</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center mx-auto mb-2.5">
                  <Calendar className="w-5 h-5 text-slate-500" />
                </div>
                <p className="text-xs text-slate-500 mb-1">Ngày bắt đầu</p>
                <p className="text-sm font-bold text-slate-800">{fd(contract.startDate)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center mx-auto mb-2.5">
                  <LogIn className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-xs text-slate-500 mb-1">Ngày check-in</p>
                <p className={`text-sm font-bold ${contract.checkedInAt ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {contract.checkedInAt ? fd(contract.checkedInAt) : '—'}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center mx-auto mb-2.5">
                  <CalendarX className="w-5 h-5 text-slate-500" />
                </div>
                <p className="text-xs text-slate-500 mb-1">Ngày kết thúc</p>
                <p className="text-sm font-bold text-slate-800">{fd(contract.endDate)}</p>
              </div>
            </div>
            {contract.status === 'ACTIVE' && (
              <p className={`text-center text-xs font-medium mt-3 ${contract.daysRemaining <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {contract.daysRemaining > 0 ? `Còn ${contract.daysRemaining} ngày` : 'Đã quá hạn'}
              </p>
            )}
          </div>

          {/* Người ở cùng */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Người ở cùng ({contract.roommates.length + 1})
            </h3>
            <div className="space-y-3">
              {/* Bản thân */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-amber-300 ${contract.student?.gender === 'MALE' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                    {contract.student?.fullName?.split(' ').pop()?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-slate-800">{contract.student?.fullName} <span className="text-slate-400 text-xs">(Bạn)</span></p>
                      {contract.isRoomLeader && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full">
                          <Crown className="w-2.5 h-2.5" /> TP
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{contract.student?.studentCode}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">Giường 01</span>
              </div>

              {contract.roommates.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-2">Chưa có ai ở cùng phòng</p>
              )}
              {contract.roommates.map((mate, idx) => (
                  <div key={mate.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${mate.gender === 'MALE' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                        {mate.fullName.split(' ').pop()?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-slate-800">{mate.fullName}</p>
                          {mate.isRoomLeader && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full">
                              <Crown className="w-2.5 h-2.5" /> TP
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{mate.studentCode}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                      Giường {(idx + 1).toString().padStart(2, '0')}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
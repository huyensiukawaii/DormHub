'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StudentLayout from '@/components/layouts/StudentLayout';
import { getStoredUser } from '@/lib/auth';
import {
  FileSignature,
  Home,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  ChevronRight,
  Crown,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Contract {
  id: number;
  code: string;
  status: 'ACTIVE' | 'TERMINATED' | 'EXPIRED';
  startDate: string;
  endDate: string;
  monthlyRent: number;
  isRoomLeader: boolean;
  checkedInAt: string | null;
  daysRemaining: number;
  room: {
    id: number;
    code: string;
    floor: number;
    roomType: string;
    building: { code: string; name: string };
  };
  application: {
    id: number;
    type: string;
    period: { name: string };
  } | null;
}

export default function StudentContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getStoredUser();
    if (user?.role === 'STUDENT') fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const res = await api.get('/student/contracts');
      setContracts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fd = (d: string) =>
    new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const fc = (v: number | string) =>
    new Intl.NumberFormat('vi-VN').format(typeof v === 'string' ? parseFloat(v) : v) + ' đ';

  const activeContract = contracts.find((c) => c.status === 'ACTIVE');
  const pastContracts = contracts.filter((c) => c.status !== 'ACTIVE');

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Hợp đồng</h1>
        <p className="text-sm text-slate-500 mt-1">Hợp đồng ký túc xá của bạn</p>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileSignature className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Chưa có hợp đồng</h3>
          <p className="text-sm text-slate-500 mb-4">
            Bạn chưa có hợp đồng KTX nào. Hãy đăng ký KTX để bắt đầu.
          </p>
          <Link
            href="/student/register"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg"
          >
            Đăng ký KTX
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active contract */}
          {activeContract && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Hợp đồng hiện tại
              </h2>
              <Link
                href={`/student/contracts/${activeContract.id}`}
                className="block bg-white rounded-xl border-2 border-emerald-200 hover:border-emerald-300 transition-colors overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <Home className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-bold text-slate-800">
                            Phòng {activeContract.room.code}
                          </p>
                          {activeContract.isRoomLeader && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                              <Crown className="w-3 h-3" /> Trưởng phòng
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          {activeContract.room.building.name} • Tầng {activeContract.room.floor}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Đang hiệu lực
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500 mb-0.5">Bắt đầu</p>
                      <p className="text-sm font-semibold text-slate-800">{fd(activeContract.startDate)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500 mb-0.5">Kết thúc</p>
                      <p className="text-sm font-semibold text-slate-800">{fd(activeContract.endDate)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500 mb-0.5">Còn lại</p>
                      <p className={`text-sm font-semibold ${activeContract.daysRemaining <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {activeContract.daysRemaining > 0 ? `${activeContract.daysRemaining} ngày` : 'Đã hết'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="font-mono">{activeContract.code}</span>
                      <span>{fc(activeContract.monthlyRent)}/tháng</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Past contracts */}
          {pastContracts.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Lịch sử ({pastContracts.length})
              </h2>
              <div className="space-y-3">
                {pastContracts.map((contract) => (
                  <Link
                    key={contract.id}
                    href={`/student/contracts/${contract.id}`}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Home className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {contract.room.code} - {contract.room.building.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {fd(contract.startDate)} → {fd(contract.endDate)}
                          {contract.application?.period && ` • ${contract.application.period.name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {contract.status === 'EXPIRED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                          <Clock className="w-3 h-3" /> Hết hạn
                        </span>
                      )}
                      {contract.status === 'TERMINATED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                          <XCircle className="w-3 h-3" /> Chấm dứt
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </StudentLayout>
  );
}
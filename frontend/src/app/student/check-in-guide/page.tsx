'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StudentLayout from '@/components/layouts/StudentLayout';
import {
  CheckCircle,
  Home,
  MapPin,
  FileText,
  AlertTriangle,
  Loader2,
  ChevronRight,
  PartyPopper,
  User,
  Phone,
  Building2,
  IdCard,
} from 'lucide-react';
import { api } from '@/lib/api';

interface CheckInInfo {
  contract: {
    id: number;
    code: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    checkedInAt: string | null;
  };
  room: {
    code: string;
    floor: number;
    roomType: string;
    buildingName: string;
  };
  period: {
    name: string;
    moveInDate: string | null;
  } | null;
}

export default function CheckInGuidePage() {
  const [info, setInfo] = useState<CheckInInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [noContract, setNoContract] = useState(false);

  useEffect(() => {
    fetchInfo();
  }, []);

  const fetchInfo = async () => {
    try {
      const res = await api.get('/student/contracts');
      const contracts = res.data;

      // Tìm hợp đồng ACTIVE chưa check-in
      const pending = contracts.find(
        (c: any) => c.status === 'ACTIVE' && !c.checkedInAt,
      );

      if (!pending) {
        // Nếu không có, tìm hợp đồng ACTIVE đã check-in (đã hoàn thành)
        const active = contracts.find((c: any) => c.status === 'ACTIVE');
        if (active) {
          setInfo({
            contract: active,
            room: {
              code: active.room.code,
              floor: active.room.floor,
              roomType: active.room.roomType,
              buildingName: active.room.building.name,
            },
            period: active.application?.period
              ? { name: active.application.period.name, moveInDate: null }
              : null,
          });
        } else {
          setNoContract(true);
        }
      } else {
        setInfo({
          contract: pending,
          room: {
            code: pending.room.code,
            floor: pending.room.floor,
            roomType: pending.room.roomType,
            buildingName: pending.room.building.name,
          },
          period: pending.application?.period
            ? { name: pending.application.period.name, moveInDate: null }
            : null,
        });
      }
    } catch (err) {
      console.error(err);
      setNoContract(true);
    } finally {
      setLoading(false);
    }
  };

  const fdShort = (d: string) =>
    new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const fc = (v: number | string) =>
    new Intl.NumberFormat('vi-VN').format(
      typeof v === 'string' ? parseFloat(v) : v,
    ) + ' đ';

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </StudentLayout>
    );
  }

  if (noContract || !info) {
    return (
      <StudentLayout>
        <div className="max-w-lg mx-auto py-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Chưa có hợp đồng
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Bạn chưa có hợp đồng KTX nào cần check-in. Hãy đăng ký KTX trước.
          </p>
          <Link
            href="/student/register"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg"
          >
            Đăng ký KTX
          </Link>
        </div>
      </StudentLayout>
    );
  }

  const alreadyCheckedIn = !!info.contract.checkedInAt;

  return (
    <StudentLayout>
      <div className="max-w-3xl mx-auto">
        {/* Hero banner */}
        {!alreadyCheckedIn ? (
          <div className="bg-gradient-to-br from-emerald-50 to-amber-50 border border-emerald-200 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <PartyPopper className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-1">
                  Chúc mừng! Bạn đã có phòng KTX
                </h1>
                <p className="text-sm text-slate-600">
                  Hợp đồng{' '}
                  <span className="font-mono font-semibold">{info.contract.code}</span>{' '}
                  đã được tạo. Vui lòng đọc hướng dẫn bên dưới để hoàn tất thủ tục
                  nhận phòng.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-1">
                  Bạn đã check-in thành công!
                </h1>
                <p className="text-sm text-slate-600">
                  Check-in ngày {fdShort(info.contract.checkedInAt!)}. Chúc bạn có
                  thời gian vui vẻ tại KTX.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Thông tin phòng được xếp */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Phòng được xếp
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
              <Home className="w-7 h-7 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-xl font-bold text-slate-800">
                Phòng {info.room.code} - {info.room.buildingName}
              </p>
              <p className="text-sm text-slate-500">
                Tầng {info.room.floor} •{' '}
                {info.room.roomType === 'AIR_CONDITIONED'
                  ? 'Phòng điều hòa'
                  : 'Phòng thường'}{' '}
                • {fc(info.contract.monthlyRent)}/tháng
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Hợp đồng từ</p>
              <p className="text-sm font-semibold text-slate-800">
                {fdShort(info.contract.startDate)}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Đến</p>
              <p className="text-sm font-semibold text-slate-800">
                {fdShort(info.contract.endDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Hướng dẫn check-in — chỉ hiện khi chưa check-in */}
        {!alreadyCheckedIn && (
          <>
            {/* Timeline steps */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-5">
                Các bước nhận phòng
              </h2>

              <div className="space-y-0">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <div className="w-0.5 bg-amber-200 flex-1 my-1" />
                  </div>
                  <div className="pb-6 flex-1">
                    <h3 className="text-base font-semibold text-slate-800 mb-1">
                      Đến Văn phòng Quản lý KTX
                    </h3>
                    <p className="text-sm text-slate-600 mb-2">
                      Đến phòng Quản lý KTX tại tầng 1, Tòa nhà Hành chính để làm thủ
                      tục nhận phòng.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">
                            Địa chỉ: Phòng 101, Tầng 1, Tòa nhà Hành chính
                          </p>
                          <p className="text-xs text-blue-600 mt-0.5">
                            Giờ làm việc: Thứ 2 – Thứ 6, 8:00 – 17:00
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <div className="w-0.5 bg-amber-200 flex-1 my-1" />
                  </div>
                  <div className="pb-6 flex-1">
                    <h3 className="text-base font-semibold text-slate-800 mb-1">
                      Mang theo giấy tờ cần thiết
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Chuẩn bị đầy đủ các giấy tờ sau:
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
                        <IdCard className="w-5 h-5 text-slate-500 flex-shrink-0" />
                        <span className="text-sm text-slate-700">
                          CCCD/CMND bản gốc + 1 bản photo
                        </span>
                      </div>
                      <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
                        <User className="w-5 h-5 text-slate-500 flex-shrink-0" />
                        <span className="text-sm text-slate-700">
                          Thẻ sinh viên bản gốc
                        </span>
                      </div>
                      <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
                        <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                        <span className="text-sm text-slate-700">
                          Ảnh 3×4 (2 tấm) để làm thẻ ra vào
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <div className="w-0.5 bg-amber-200 flex-1 my-1" />
                  </div>
                  <div className="pb-6 flex-1">
                    <h3 className="text-base font-semibold text-slate-800 mb-1">
                      Đóng phí ký túc xá
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Thanh toán tiền phòng kỳ đầu tiên khi nhận phòng:
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Tiền phòng/tháng</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {fc(info.contract.monthlyRent)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Tiền đặt cọc</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {fc(info.contract.monthlyRent)}
                          </span>
                        </div>
                        <div className="border-t border-amber-200 pt-2 flex items-center justify-between">
                          <span className="text-sm font-semibold text-amber-800">
                            Tổng thanh toán khi nhận phòng
                          </span>
                          <span className="text-lg font-bold text-amber-700">
                            {fc(Number(info.contract.monthlyRent) * 2)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-amber-600 mt-2">
                        Chấp nhận: Chuyển khoản ngân hàng hoặc tiền mặt tại VP
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      4
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-slate-800 mb-1">
                      Nhận chìa khóa & dọn vào phòng
                    </h3>
                    <p className="text-sm text-slate-600">
                      Sau khi hoàn tất thủ tục, bạn sẽ được nhận chìa khóa phòng và thẻ
                      ra vào. Nhân viên sẽ hướng dẫn bạn đến phòng.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lưu ý quan trọng */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800 mb-2">
                    Lưu ý quan trọng
                  </h3>
                  <ul className="space-y-1.5 text-sm text-red-700">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 w-1 h-1 bg-red-500 rounded-full flex-shrink-0" />
                      <span>
                        Vui lòng đến nhận phòng trước ngày{' '}
                        <strong>{fdShort(info.contract.startDate)}</strong>. Quá hạn mà
                        không check-in, hợp đồng có thể bị hủy.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 w-1 h-1 bg-red-500 rounded-full flex-shrink-0" />
                      <span>
                        Nếu không thể đến đúng hẹn, vui lòng liên hệ VP Quản lý KTX
                        trước ít nhất 2 ngày.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 w-1 h-1 bg-red-500 rounded-full flex-shrink-0" />
                      <span>
                        Sinh viên cần tuân thủ nội quy KTX. Vi phạm có thể bị chấm dứt
                        hợp đồng.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Liên hệ */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                Liên hệ hỗ trợ
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Phone className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Hotline KTX</p>
                    <p className="text-sm font-semibold text-slate-800">024.3869.xxxx</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">VP Quản lý KTX</p>
                    <p className="text-sm font-semibold text-slate-800">Phòng 101, Tầng 1</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Quick links */}
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/student/contracts/${info.contract.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            Xem hợp đồng
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </StudentLayout>
  );
}

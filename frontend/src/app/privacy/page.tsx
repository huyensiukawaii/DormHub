import Link from 'next/link';
import { ArrowLeft, Building2, ShieldCheck, Database, Lock, UserCircle } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Full-width Header */}
      <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-emerald-700 tracking-tight">DORMHUB</span>
            </div>

            {/* Back Button */}
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Quay lại đăng ký</span>
              <span className="sm:hidden">Quay lại</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-200/40 ring-1 ring-slate-200">
            {/* Document Header */}
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-12 text-center sm:px-12">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm">
                <ShieldCheck className="h-8 w-8" strokeWidth={2} />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Chính sách Bảo mật
              </h1>
              <p className="mt-4 text-sm font-medium text-slate-500">Cập nhật lần cuối: 15 tháng 8, 2026</p>
            </div>

            {/* Document Body */}
            <div className="px-6 py-10 sm:px-16 text-slate-600 leading-relaxed space-y-10">
              <section>
                <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-900 mb-4">
                  <Database className="w-6 h-6 text-emerald-600" />
                  1. Thông tin chúng tôi thu thập
                </h2>
                <p className="mb-4 text-[15px]">
                  Khi sử dụng hệ thống DORMHUB, chúng tôi thu thập các thông tin cá nhân cơ bản để phục vụ cho việc đăng ký lưu trú và quản lý sinh viên, bao gồm:
                </p>
                <ul className="list-disc pl-6 space-y-2.5 text-[15px]">
                  <li><strong>Thông tin định danh:</strong> Họ và tên, Mã số sinh viên (MSSV), Ngày sinh, Giới tính, Căn cước công dân (CCCD).</li>
                  <li><strong>Thông tin liên lạc:</strong> Địa chỉ email (email trường và email cá nhân), Số điện thoại.</li>
                  <li><strong>Thông tin khẩn cấp:</strong> Tên và số điện thoại của người thân hoặc người giám hộ.</li>
                  <li><strong>Dữ liệu hệ thống:</strong> Lịch sử đăng nhập, IP truy cập, và các thao tác trên phần mềm (nhằm mục đích bảo mật và xử lý sự cố).</li>
                </ul>
              </section>

              <section>
                <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-900 mb-4">
                  <UserCircle className="w-6 h-6 text-emerald-600" />
                  2. Mục đích sử dụng thông tin
                </h2>
                <p className="mb-4 text-[15px]">DORMHUB cam kết chỉ sử dụng thông tin cá nhân của bạn cho các mục đích chính đáng liên quan đến quản lý ký túc xá:</p>
                <ul className="list-disc pl-6 space-y-2.5 text-[15px]">
                  <li>Xác thực danh tính và cấp quyền truy cập vào hệ thống.</li>
                  <li>Sắp xếp, quản lý phòng ở và thông báo các khoản phí liên quan (tiền phòng, điện, nước).</li>
                  <li>Gửi các thông báo quan trọng từ Ban Quản lý Ký túc xá (thông báo bảo trì, cảnh báo an ninh, sự kiện).</li>
                  <li>Liên hệ trong các trường hợp khẩn cấp về y tế hoặc an ninh trật tự.</li>
                </ul>
              </section>

              <section>
                <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-900 mb-4">
                  <Lock className="w-6 h-6 text-emerald-600" />
                  3. Bảo mật và Lưu trữ dữ liệu
                </h2>
                <p className="text-[15px]">
                  Dữ liệu của bạn được lưu trữ trên các máy chủ bảo mật với tiêu chuẩn mã hóa cao. Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức phù hợp để ngăn chặn truy cập trái phép, tiết lộ, thay đổi hoặc phá hủy dữ liệu cá nhân. Chỉ các nhân sự được ủy quyền của Ban Quản lý mới có quyền truy cập vào thông tin này.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">4. Quyền lợi của Sinh viên</h2>
                <p className="text-[15px]">
                  Bạn có quyền truy cập, xem và yêu cầu chỉnh sửa các thông tin cá nhân của mình trên hệ thống. Trong trường hợp phát hiện thông tin không chính xác, vui lòng tạo "Yêu cầu hỗ trợ" trên DORMHUB hoặc liên hệ trực tiếp văn phòng Ban Quản lý để được cập nhật kịp thời.
                </p>
              </section>

              <hr className="border-slate-100 border-t-2" />

              <p className="text-[15px] text-slate-500 italic bg-slate-50 p-4 rounded-lg border border-slate-100">
                Bằng việc tiếp tục đăng ký và sử dụng DORMHUB, bạn xác nhận đã đọc, hiểu và đồng ý với Chính sách Bảo mật này.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm font-medium text-slate-400">
        &copy; {new Date().getFullYear()} DORMHUB. Bảo lưu mọi quyền.
      </footer>
    </div>
  );
}

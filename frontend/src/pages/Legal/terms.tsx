import Link from 'next/link';
import { ArrowLeft, Building2, ScrollText, AlertTriangle, CreditCard, Scale } from 'lucide-react';

export default function TermsPage() {
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
                <ScrollText className="h-8 w-8" strokeWidth={2} />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Điều khoản sử dụng
              </h1>
              <p className="mt-4 text-sm font-medium text-slate-500">Có hiệu lực từ: 01 tháng 09, 2026</p>
            </div>

            {/* Document Body */}
            <div className="px-6 py-10 sm:px-16 text-slate-600 leading-relaxed space-y-10">
              <section>
                <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-900 mb-4">
                  <Scale className="w-6 h-6 text-emerald-600" />
                  1. Chấp nhận điều khoản
                </h2>
                <p className="text-[15px]">
                  Việc bạn đăng ký, đăng nhập và sử dụng nền tảng DORMHUB đồng nghĩa với việc bạn đồng ý tuân thủ toàn bộ các điều khoản được quy định dưới đây, cũng như Nội quy Ký túc xá của nhà trường. Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng ngừng sử dụng dịch vụ.
                </p>
              </section>

              <section>
                <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-900 mb-4">
                  <AlertTriangle className="w-6 h-6 text-emerald-600" />
                  2. Trách nhiệm của Sinh viên
                </h2>
                <ul className="list-disc pl-6 space-y-2.5 text-[15px]">
                  <li><strong>Tính chính xác:</strong> Cung cấp thông tin cá nhân trung thực, chính xác và cập nhật kịp thời khi có thay đổi.</li>
                  <li><strong>Bảo mật tài khoản:</strong> Tự chịu trách nhiệm bảo vệ mật khẩu. Tuyệt đối không chia sẻ tài khoản cho người khác. Mọi thao tác thực hiện từ tài khoản của bạn sẽ được coi là do chính bạn thực hiện.</li>
                  <li><strong>Hành vi cấm:</strong> Không sử dụng hệ thống để phát tán mã độc, spam, thực hiện hành vi gian lận (như đăng ký hộ, mua bán slot phòng), hoặc can thiệp trái phép vào dữ liệu hệ thống.</li>
                </ul>
              </section>

              <section>
                <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-900 mb-4">
                  <CreditCard className="w-6 h-6 text-emerald-600" />
                  3. Quy định thanh toán & Hợp đồng
                </h2>
                <p className="mb-4 text-[15px]">Khi thao tác ký hợp đồng và thanh toán qua DORMHUB, bạn cần lưu ý:</p>
                <ul className="list-disc pl-6 space-y-2.5 text-[15px]">
                  <li>Hợp đồng điện tử được xác nhận trên hệ thống có giá trị pháp lý tương đương hợp đồng giấy.</li>
                  <li>Sinh viên có trách nhiệm thanh toán các khoản phí (tiền phòng, điện, nước) đúng thời hạn được thông báo trên hệ thống.</li>
                  <li>DORMHUB không chịu trách nhiệm cho các giao dịch chuyển khoản sai thông tin từ phía sinh viên.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">4. Xử lý vi phạm và Chấm dứt dịch vụ</h2>
                <p className="text-[15px] mb-4">
                  Ban Quản lý có quyền khóa tài khoản tạm thời hoặc vĩnh viễn, đồng thời hủy bỏ hợp đồng lưu trú mà không cần báo trước nếu phát hiện:
                </p>
                <ul className="list-disc pl-6 space-y-2.5 text-[15px]">
                  <li>Cung cấp thông tin giả mạo.</li>
                  <li>Chuyển nhượng phòng ở/tài khoản trái phép.</li>
                  <li>Vi phạm nghiêm trọng Nội quy Ký túc xá.</li>
                </ul>
              </section>

              <hr className="border-slate-100 border-t-2" />

              <p className="text-[15px] text-slate-500 italic bg-slate-50 p-4 rounded-lg border border-slate-100">
                DORMHUB có thể cập nhật các Điều khoản này bất kỳ lúc nào để phù hợp với quy định mới. Thông báo thay đổi sẽ được gửi đến email hoặc hiển thị trên bảng tin hệ thống.
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
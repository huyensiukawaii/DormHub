import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const users = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'STAFF'] } },
    select: { id: true, fullName: true, role: true },
    take: 5,
  });
  const buildings = await prisma.building.findMany({
    select: { id: true, code: true, name: true },
  });

  console.log('Users:', JSON.stringify(users));
  console.log('Buildings:', JSON.stringify(buildings));

  if (users.length === 0) {
    console.log('No admin/staff users found. Exiting.');
    return;
  }

  const admin = users.find((u) => u.role === 'ADMIN') ?? users[0];
  const staff = users.find((u) => u.role === 'STAFF');

  const posts = [
    // ── Toàn KTX ──────────────────────────────────────────────────
    {
      buildingId: null, authorId: admin.id, isPinned: true,
      title: '📌 Nội quy ký túc xá năm học 2025-2026',
      content: `Kính gửi toàn thể sinh viên đang cư trú tại ký túc xá,\n\nBan Quản lý ký túc xá thông báo về nội quy sinh hoạt áp dụng từ năm học 2025-2026:\n\n1. Giờ giới nghiêm: 23:00 — sinh viên phải có mặt tại phòng.\n2. Không mang thực phẩm có mùi mạnh vào phòng.\n3. Giữ vệ sinh chung hành lang, cầu thang.\n4. Không tự ý sửa chữa điện nước — báo ngay cho bảo vệ.\n5. Vi phạm lần đầu: nhắc nhở; lần hai: phạt 200.000đ; lần ba: huỷ hợp đồng.\n\nMọi thắc mắc liên hệ văn phòng tầng 1, Tòa A.`,
    },
    {
      buildingId: null, authorId: admin.id, isPinned: true,
      title: '🔔 Lịch đóng tiền phòng tháng 6/2026',
      content: `Thông báo đến toàn thể sinh viên:\n\nHạn đóng tiền phòng tháng 6/2026 là ngày 10/06/2026.\n\nHình thức thanh toán:\n• Chuyển khoản: 1234567890 — Ngân hàng VCB — Tên KTX DHBK\n• Trực tiếp tại văn phòng T2–T6 (8:00–17:00)\n\nSinh viên chưa thanh toán sau ngày 15/06 sẽ bị tính phí trễ hạn 5%.\n\nVui lòng ghi chú đầy đủ: [Mã SV] — [Phòng] — [Tháng].`,
    },
    {
      buildingId: null, authorId: admin.id, isPinned: false,
      title: 'Thông báo cúp nước định kỳ — Chủ nhật 22/06',
      content: `Do bảo trì hệ thống đường ống, toàn bộ KTX sẽ ngừng cấp nước vào:\n\nThứ Bảy, 22/06/2026 từ 8:00 đến 16:00\n\nĐề nghị sinh viên chủ động tích trữ nước trước thời gian trên.\nCảm ơn sự hợp tác của các bạn.`,
    },
    {
      buildingId: null, authorId: admin.id, isPinned: false,
      title: 'Khai mạc CLB thể thao KTX — Mùa hè 2026',
      content: `Nhằm tạo sân chơi lành mạnh cho sinh viên, Ban Quản lý phối hợp cùng Đoàn Thanh niên tổ chức các CLB thể thao:\n\n🏸 Cầu lông — Thứ 3 & Thứ 5, 17:30–19:00, sân A2\n⚽ Bóng đá mini — Thứ 7, 16:00–18:00, sân B1\n🏃 Chạy bộ sáng — T2 đến T6, 6:00, tập trung cổng chính\n\nĐăng ký tham gia tại văn phòng hoặc quét QR tại bảng tin mỗi tòa.`,
    },
    {
      buildingId: null, authorId: admin.id, isPinned: false,
      title: 'Kết quả kiểm tra phòng định kỳ tháng 5',
      content: `Ban Quản lý đã hoàn thành đợt kiểm tra phòng định kỳ tháng 5/2026.\n\nKết quả tổng hợp:\n✅ Đạt tiêu chuẩn: 87% phòng\n⚠️ Cần cải thiện: 10% phòng (chủ yếu vệ sinh góc phòng)\n❌ Vi phạm: 3% phòng (để đồ cồng kềnh ngoài hành lang)\n\nCác phòng vi phạm đã được nhắc nhở và sẽ bị kiểm tra lại vào ngày 30/06. Đề nghị toàn thể sinh viên giữ gìn không gian chung.`,
    },
    {
      buildingId: null, authorId: admin.id, isPinned: false,
      title: 'Chào mừng tân sinh viên K69 nhập học KTX',
      content: `Ban Quản lý ký túc xá trân trọng chào đón các bạn tân sinh viên khoá K69!\n\nLịch nhận phòng:\n• 15/08/2026 (T2–T6): Khoa Công nghệ Thông tin, Điện-Điện tử\n• 16/08/2026 (T7): Các khoa còn lại\n• 17/08/2026 (CN): Dự phòng — sinh viên chưa nhận được phòng\n\nGiấy tờ cần mang theo:\n1. Giấy xác nhận trúng tuyển KTX\n2. CCCD bản gốc\n3. 2 ảnh 3x4\n4. Biên lai đặt cọc (nếu có)\n\nBan Quản lý chúc các bạn có kỳ học thật hiệu quả và vui vẻ!`,
    },
    {
      buildingId: null, authorId: admin.id, isPinned: false,
      title: 'Cảnh báo: Thời tiết nắng nóng — Biện pháp phòng ngừa',
      content: `Theo dự báo, tuần tới nhiệt độ TP.HCM sẽ lên đến 38–40°C.\n\nBan Quản lý khuyến cáo sinh viên:\n☀️ Hạn chế ra ngoài từ 10:00–15:00\n💧 Uống đủ 2–2.5 lít nước/ngày\n🌡️ Đặt nhiệt độ điều hòa tối thiểu 26°C (tiết kiệm điện)\n🚿 Tắm nước mát, không tắm nước quá lạnh\n\nNếu có biểu hiện say nắng (chóng mặt, buồn nôn), liên hệ ngay phòng y tế tầng 1.`,
    },
  ];

  // Posts theo tòa (nếu có building)
  const buildingPosts: any[] = [];
  for (const b of buildings.slice(0, 3)) {
    const authorId = staff?.id ?? admin.id;
    buildingPosts.push(
      {
        buildingId: b.id, authorId, isPinned: true,
        title: `📋 Lịch vệ sinh chung tòa ${b.code} — Tháng 6`,
        content: `Kính gửi các bạn sinh viên tòa ${b.name},\n\nLịch tổng vệ sinh chung tháng 6:\n\n• Hành lang tầng 1–3: Thứ 2 hàng tuần, 7:00–8:00\n• Hành lang tầng 4–6: Thứ 4 hàng tuần, 7:00–8:00\n• Khu vực bếp chung: Thứ 6, 6:30–7:30\n• Tổng vệ sinh toàn tòa: Chủ nhật cuối tháng (29/06)\n\nYêu cầu 100% sinh viên tham gia đợt tổng vệ sinh. Vắng mặt không có lý do sẽ bị trừ điểm thi đua.`,
      },
      {
        buildingId: b.id, authorId, isPinned: false,
        title: `Sự cố thang máy tòa ${b.code} — Đã khắc phục`,
        content: `Kính thông báo:\n\nThang máy số 2 tòa ${b.name} đã được sửa chữa xong và hoạt động trở lại từ chiều ngày hôm nay (18/05/2026).\n\nXin lỗi vì sự bất tiện trong thời gian xảy ra sự cố.\nBan Quản lý tòa ${b.code}.`,
      },
      {
        buildingId: b.id, authorId, isPinned: false,
        title: `Nhắc nhở: Không phơi quần áo ngoài cửa sổ — Tòa ${b.code}`,
        content: `Gần đây Ban Quản lý nhận được phản ánh về việc một số sinh viên tòa ${b.name} phơi quần áo, đồ đạc ngoài cửa sổ và lan can.\n\nHành động này:\n❌ Gây mất mỹ quan công trình\n❌ Có thể gây nguy hiểm khi đồ vật rơi xuống\n❌ Vi phạm nội quy KTX\n\nĐề nghị toàn thể sinh viên sử dụng khu phơi đồ tập trung tầng trệt.\nTrường hợp tiếp tục vi phạm sẽ bị xử lý theo quy định.`,
      },
      {
        buildingId: b.id, authorId, isPinned: false,
        title: `Thông báo cắt điện bảo trì — Tòa ${b.code}`,
        content: `Do bảo trì hệ thống điện định kỳ, tòa ${b.name} sẽ ngừng cấp điện:\n\nThứ Bảy, 21/06/2026 — 8:00 đến 12:00\n\n⚡ Vui lòng tắt tất cả thiết bị điện trước 7:45\n⚡ Sạc đầy thiết bị di động trước thời điểm trên\n⚡ Điện sẽ được khôi phục sau 12:00\n\nXin lỗi về sự bất tiện này.`,
      },
    );
  }

  const allPosts = [...posts, ...buildingPosts];

  console.log(`\nInserting ${allPosts.length} posts...`);

  if (process.env.RESET_ANNOUNCEMENTS === 'true') {
    console.log('RESET_ANNOUNCEMENTS=true — xóa dữ liệu cũ...');
    await prisma.announcementReaction.deleteMany({});
    await prisma.announcementPost.deleteMany({});
  }

  for (const p of allPosts) {
    await prisma.announcementPost.create({
      data: {
        buildingId: p.buildingId,
        authorId: p.authorId,
        isPinned: p.isPinned,
        pinnedAt: p.isPinned ? new Date() : null,
        title: p.title,
        content: p.content,
        images: [],
      },
    });
  }

  console.log(`✅ Inserted ${allPosts.length} announcement posts.`);
}

main().catch(console.error).finally(async () => { await prisma.$disconnect(); await pool.end(); });

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import {
  cleanup,
  disconnectDb,
  seedBase,
  TestSeeds,
  TEST_PASSWORD,
  testPrisma,
} from './helpers/db';

describe('Invoices (integration)', () => {
  let app: INestApplication;
  let seeds: TestSeeds;
  let adminToken: string;
  let studentToken: string;

  beforeAll(async () => {
    seeds = await seedBase();
    app = await createTestApp();

    const [adminRes, studentRes] = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seeds.adminUser.email, password: TEST_PASSWORD }),
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seeds.studentUser.email, password: TEST_PASSWORD }),
    ]);

    adminToken = adminRes.body.accessToken;
    studentToken = studentRes.body.accessToken;

    // Tạo hợp đồng cho sinh viên để có context hóa đơn
    await testPrisma.contract.create({
      data: {
        code: 'HD-TEST-001',
        studentId: seeds.studentUser.studentId,
        roomId: seeds.maleRoom.id,
        startDate: new Date('2026-02-10'),
        endDate: new Date('2026-06-30'),
        monthlyRent: 350000,
        status: 'ACTIVE',
        createdById: seeds.adminUser.id,
      },
    });

    // Tạo chỉ số điện/nước tháng 3/2026
    await testPrisma.meterReading.createMany({
      data: [
        {
          roomId: seeds.maleRoom.id,
          meterType: 'ELECTRICITY',
          readingMonth: new Date('2026-03-01'),
          previousReading: 100,
          currentReading: 190,
          consumption: 90,
          recordedById: seeds.adminUser.id,
        },
        {
          roomId: seeds.maleRoom.id,
          meterType: 'WATER',
          readingMonth: new Date('2026-03-01'),
          previousReading: 0,
          currentReading: 8,
          consumption: 8,
          recordedById: seeds.adminUser.id,
        },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
    await disconnectDb();
  });

  // ─── GET /invoices ───────────────────────────────────────────────────────────

  describe('GET /invoices', () => {
    it('200 - admin lấy danh sách hóa đơn (dạng paginated)', async () => {
      const res = await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('401 - không có token bị từ chối', async () => {
      const res = await request(app.getHttpServer()).get('/invoices');
      expect(res.status).toBe(401);
    });

    it('403 - sinh viên không được truy cập route admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ─── GET /invoices/stats ─────────────────────────────────────────────────────

  describe('GET /invoices/stats', () => {
    it('200 - thống kê hóa đơn theo tháng, trả về counts và amounts', async () => {
      const res = await request(app.getHttpServer())
        .get('/invoices/stats?billingMonth=2026-03')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('counts');
      expect(res.body.counts).toHaveProperty('total');
      expect(res.body).toHaveProperty('amounts');
    });

    it('400 - thiếu query param billingMonth', async () => {
      const res = await request(app.getHttpServer())
        .get('/invoices/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('400 - billingMonth sai format', async () => {
      const res = await request(app.getHttpServer())
        .get('/invoices/stats?billingMonth=thang-3')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });

  // ─── POST /invoices (tạo hóa đơn điện nước) ─────────────────────────────────

  describe('POST /invoices', () => {
    let createdInvoiceId: number;

    it('201 - tạo hóa đơn điện nước thành công từ chỉ số đã nhập', async () => {
      const res = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roomId: seeds.maleRoom.id,
          billingMonth: '2026-03-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('UTILITY');
      expect(res.body.status).toBe('PENDING');
      expect(Number(res.body.electricityUsage)).toBe(90);
      expect(Number(res.body.waterUsage)).toBe(8);
      expect(Number(res.body.totalAmount)).toBeGreaterThan(0);
      createdInvoiceId = res.body.id;
    });

    it('409 - tạo lại hóa đơn tháng đó cho cùng phòng bị từ chối', async () => {
      const res = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roomId: seeds.maleRoom.id,
          billingMonth: '2026-03-01',
        });

      expect(res.status).toBe(409);
    });

    it('400 - thiếu roomId trong body', async () => {
      const res = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ billingMonth: '2026-03-01' });

      expect(res.status).toBe(400);
    });

    it('403 - sinh viên không được tạo hóa đơn', async () => {
      const res = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ roomId: seeds.maleRoom.id, billingMonth: '2026-03-01' });

      expect(res.status).toBe(403);
    });

    // ─── GET /invoices/:id ─────────────────────────────────────────────────────

    describe('GET /invoices/:id', () => {
      it('200 - lấy chi tiết hóa đơn UTILITY kèm breakdown điện/nước', async () => {
        const res = await request(app.getHttpServer())
          .get(`/invoices/${createdInvoiceId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.type).toBe('UTILITY');
        expect(res.body.breakdown).not.toBeNull();
        expect(res.body.breakdown.electricity).toBeDefined();
        expect(res.body.breakdown.water).toBeDefined();
      });

      it('404 - hóa đơn không tồn tại', async () => {
        const res = await request(app.getHttpServer())
          .get('/invoices/999999')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });
    });

    // ─── PATCH /invoices/:id/confirm-payment ──────────────────────────────────

    describe('PATCH /invoices/:id/confirm-payment', () => {
      it('200 - admin xác nhận thanh toán, status chuyển sang PAID', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/invoices/${createdInvoiceId}/confirm-payment`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('PAID');
        expect(res.body.paidAt).not.toBeNull();
        expect(res.body.approvedById).toBe(seeds.adminUser.id);
      });

      it('400 - xác nhận thanh toán lần 2 bị từ chối (đã PAID)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/invoices/${createdInvoiceId}/confirm-payment`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect(res.status).toBe(400);
      });
    });
  });

  // ─── GET /invoices/student/my ────────────────────────────────────────────────

  describe('GET /invoices/student/my', () => {
    it('200 - sinh viên xem được danh sách hóa đơn của mình', async () => {
      const res = await request(app.getHttpServer())
        .get('/invoices/student/my')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('403 - admin không truy cập được route của sinh viên', async () => {
      const res = await request(app.getHttpServer())
        .get('/invoices/student/my')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });
  });
});

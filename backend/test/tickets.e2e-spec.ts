import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { cleanup, disconnectDb, seedBase, TestSeeds, TEST_PASSWORD, testPrisma } from './helpers/db';

describe('Tickets (integration)', () => {
  let app: INestApplication;
  let seeds: TestSeeds;
  let adminToken: string;
  let staffToken: string;
  let studentToken: string;

  beforeAll(async () => {
    seeds = await seedBase();
    app = await createTestApp();

    const [adminRes, staffRes, studentRes] = await Promise.all([
      request(app.getHttpServer()).post('/auth/login').send({ email: seeds.adminUser.email, password: TEST_PASSWORD }),
      request(app.getHttpServer()).post('/auth/login').send({ email: seeds.staffUser.email, password: TEST_PASSWORD }),
      request(app.getHttpServer()).post('/auth/login').send({ email: seeds.studentUser.email, password: TEST_PASSWORD }),
    ]);

    adminToken = adminRes.body.accessToken;
    staffToken = staffRes.body.accessToken;
    studentToken = studentRes.body.accessToken;

    // Student cần có hợp đồng ACTIVE để tạo ticket (service yêu cầu)
    await testPrisma.contract.create({
      data: {
        code: 'HD-TICKET-001',
        studentId: seeds.studentUser.studentId,
        roomId: seeds.maleRoom.id,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-08-31'),
        monthlyRent: 350000,
        status: 'ACTIVE',
        createdById: seeds.adminUser.id,
      },
    });
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
    await disconnectDb();
  });

  // ─── POST /tickets/student ───────────────────────────────────────────────────

  describe('POST /tickets/student', () => {
    let createdTicketId: number;

    it('201 - sinh viên tạo ticket báo sự cố thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/tickets/student')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          category: 'ELECTRICAL',
          title: 'Bóng đèn phòng tắm hỏng',
          description: 'Đèn nhà tắm không sáng từ tối qua',
        });

      expect(res.status).toBe(201);
      expect(res.body.category).toBe('ELECTRICAL');
      expect(res.body.status).toBe('NEW');
      createdTicketId = res.body.id;
    });

    it('400 - thiếu category', async () => {
      const res = await request(app.getHttpServer())
        .post('/tickets/student')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Test ticket thiếu category' });

      expect(res.status).toBe(400);
    });

    it('400 - category không hợp lệ', async () => {
      const res = await request(app.getHttpServer())
        .post('/tickets/student')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ category: 'INVALID_CATEGORY', title: 'Test' });

      expect(res.status).toBe(400);
    });

    it('403 - admin không tạo ticket student được', async () => {
      const res = await request(app.getHttpServer())
        .post('/tickets/student')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ category: 'PLUMBING', title: 'Test' });

      expect(res.status).toBe(403);
    });

    it('401 - không có token', async () => {
      const res = await request(app.getHttpServer())
        .post('/tickets/student')
        .send({ category: 'OTHER', title: 'Test' });

      expect(res.status).toBe(401);
    });

    // ─── GET /tickets/student/my ──────────────────────────────────────────────

    describe('GET /tickets/student/my', () => {
      it('200 - sinh viên xem danh sách ticket của mình', async () => {
        const res = await request(app.getHttpServer())
          .get('/tickets/student/my')
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      });

      it('403 - admin không truy cập route student', async () => {
        const res = await request(app.getHttpServer())
          .get('/tickets/student/my')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(403);
      });
    });

    // ─── GET /tickets/student/my/:id ──────────────────────────────────────────

    describe('GET /tickets/student/my/:id', () => {
      it('200 - sinh viên xem chi tiết ticket của mình', async () => {
        const res = await request(app.getHttpServer())
          .get(`/tickets/student/my/${createdTicketId}`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(createdTicketId);
      });

      it('404 - ticket không tồn tại', async () => {
        const res = await request(app.getHttpServer())
          .get('/tickets/student/my/999999')
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(404);
      });
    });

    // ─── GET /tickets (admin) ─────────────────────────────────────────────────

    describe('GET /tickets', () => {
      it('200 - admin lấy danh sách tất cả tickets', async () => {
        const res = await request(app.getHttpServer())
          .get('/tickets')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('200 - staff lấy được tickets', async () => {
        const res = await request(app.getHttpServer())
          .get('/tickets')
          .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(200);
      });

      it('200 - lọc theo status=NEW', async () => {
        const res = await request(app.getHttpServer())
          .get('/tickets?status=NEW')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
      });

      it('403 - student không truy cập route admin', async () => {
        const res = await request(app.getHttpServer())
          .get('/tickets')
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(403);
      });
    });

    // ─── GET /tickets/:id (admin) ─────────────────────────────────────────────

    describe('GET /tickets/:id', () => {
      it('200 - admin lấy chi tiết ticket', async () => {
        const res = await request(app.getHttpServer())
          .get(`/tickets/${createdTicketId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(createdTicketId);
      });
    });

    // ─── PATCH /tickets/:id (admin cập nhật) ──────────────────────────────────

    describe('PATCH /tickets/:id', () => {
      it('200 - admin chuyển trạng thái sang IN_PROGRESS', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/tickets/${createdTicketId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'IN_PROGRESS', priority: 'NORMAL' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('IN_PROGRESS');
      });

      it('200 - admin chuyển trạng thái sang COMPLETED', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/tickets/${createdTicketId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'COMPLETED', resolutionNote: 'Đã thay bóng đèn mới' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('COMPLETED');
      });
    });

    // ─── PATCH /tickets/student/my/:id/rate ──────────────────────────────────

    describe('PATCH /tickets/student/my/:id/rate', () => {
      it('200 - sinh viên đánh giá ticket đã hoàn thành', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/tickets/student/my/${createdTicketId}/rate`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ rating: 5, ratingComment: 'Xử lý nhanh, cảm ơn!' });

        expect(res.status).toBe(200);
        expect(res.body.rating).toBe(5);
      });
    });

    // ─── GET /tickets/stats ───────────────────────────────────────────────────

    describe('GET /tickets/stats', () => {
      it('200 - thống kê tickets', async () => {
        const res = await request(app.getHttpServer())
          .get('/tickets/stats')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
      });
    });

    // ─── PATCH /tickets/:id/reject ────────────────────────────────────────────

    describe('PATCH /tickets/:id/reject (ticket mới)', () => {
      let ticketToRejectId: number;

      beforeAll(async () => {
        const res = await request(app.getHttpServer())
          .post('/tickets/student')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ category: 'DOOR_LOCK', title: 'Khóa cửa hỏng' });
        ticketToRejectId = res.body.id;
      });

      it('200 - admin từ chối ticket', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/tickets/${ticketToRejectId}/reject`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ rejectionReason: 'Không thuộc phạm vi bảo trì KTX' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('REJECTED');
      });

      it('400 - thiếu rejectionReason', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/tickets/${ticketToRejectId}/reject`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect(res.status).toBe(400);
      });
    });

    // ─── PATCH /tickets/student/my/:id/cancel ────────────────────────────────

    describe('PATCH /tickets/student/my/:id/cancel', () => {
      let ticketToCancelId: number;

      beforeAll(async () => {
        const res = await request(app.getHttpServer())
          .post('/tickets/student')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ category: 'FURNITURE', title: 'Ghế gãy' });
        ticketToCancelId = res.body.id;
      });

      it('200 - sinh viên hủy ticket của mình', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/tickets/student/my/${ticketToCancelId}/cancel`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('CANCELLED');
      });
    });
  });
});

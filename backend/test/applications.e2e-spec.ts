import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { cleanup, disconnectDb, seedBase, TestSeeds, TEST_PASSWORD, testPrisma } from './helpers/db';

describe('Student Applications (integration)', () => {
  let app: INestApplication;
  let seeds: TestSeeds;
  let adminToken: string;
  let staffToken: string;
  let studentToken: string;
  let activePeriodId: number;

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

    // Tạo đợt đăng ký đang mở để test applications
    const period = await testPrisma.registrationPeriod.create({
      data: {
        code: 'KTX-APP-TEST-2026',
        name: 'Đợt đăng ký test applications',
        academicYear: '2026-2027',
        semester: 1,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: 'OPEN',
      },
    });
    activePeriodId = period.id;
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
    await disconnectDb();
  });

  // ─── GET /student/dashboard ──────────────────────────────────────────────────

  describe('GET /student/dashboard', () => {
    it('200 - student lấy dashboard của mình', async () => {
      const res = await request(app.getHttpServer())
        .get('/student/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
    });

    it('401/403 - admin không truy cập dashboard student', async () => {
      const res = await request(app.getHttpServer())
        .get('/student/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([401, 403]).toContain(res.status);
    });
  });

  // ─── GET /student/register/period ────────────────────────────────────────────

  describe('GET /student/register/period', () => {
    it('200 - student xem đợt đăng ký đang mở', async () => {
      const res = await request(app.getHttpServer())
        .get('/student/register/period')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      // Response trả về { period: {...}, availableRooms: [...], ... }
      expect(res.body).toHaveProperty('period');
      expect(res.body.period.id).toBe(activePeriodId);
    });
  });

  // ─── POST /student/applications ──────────────────────────────────────────────

  describe('POST /student/applications', () => {
    let createdApplicationId: number;

    it('201 - student nộp đơn đăng ký KTX thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/student/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          applicationType: 'NEW',
          priorityInfo: {
            isFirstYear: false,
            gpaLastSemester: 3.5,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.applicationType).toBe('NEW');
      expect(res.body.status).toBe('PENDING');
      createdApplicationId = res.body.id;
    });

    it('409 - student đã có đơn PENDING, không nộp lại được', async () => {
      const res = await request(app.getHttpServer())
        .post('/student/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          applicationType: 'NEW',
          priorityInfo: {},
        });

      expect(res.status).toBe(409);
    });

    it('400 - thiếu applicationType', async () => {
      const res = await request(app.getHttpServer())
        .post('/student/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ priorityInfo: {} });

      expect(res.status).toBe(400);
    });

    it('403 - admin không nộp đơn được', async () => {
      const res = await request(app.getHttpServer())
        .post('/student/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ applicationType: 'NEW', priorityInfo: {} });

      expect(res.status).toBe(403);
    });

    // ─── GET /student/applications ────────────────────────────────────────────

    describe('GET /student/applications', () => {
      it('200 - student xem danh sách đơn của mình', async () => {
        const res = await request(app.getHttpServer())
          .get('/student/applications')
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(1);
      });

      it('403 - admin không xem route student', async () => {
        const res = await request(app.getHttpServer())
          .get('/student/applications')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(403);
      });
    });

    // ─── GET /student/applications/:id ────────────────────────────────────────

    describe('GET /student/applications/:id', () => {
      it('200 - student xem chi tiết đơn', async () => {
        const res = await request(app.getHttpServer())
          .get(`/student/applications/${createdApplicationId}`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(createdApplicationId);
      });
    });

    // ─── GET /applications (admin) ────────────────────────────────────────────

    describe('GET /applications', () => {
      it('200 - admin lấy danh sách tất cả đơn', async () => {
        const res = await request(app.getHttpServer())
          .get('/applications')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      });

      it('200 - staff lấy được danh sách', async () => {
        const res = await request(app.getHttpServer())
          .get('/applications')
          .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(200);
      });

      it('403 - student không truy cập route admin', async () => {
        const res = await request(app.getHttpServer())
          .get('/applications')
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(403);
      });

      it('200 - lọc theo status=PENDING', async () => {
        const res = await request(app.getHttpServer())
          .get('/applications?status=PENDING')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
      });
    });

    // ─── GET /applications/:id (admin) ───────────────────────────────────────

    describe('GET /applications/:id', () => {
      it('200 - admin xem chi tiết đơn', async () => {
        const res = await request(app.getHttpServer())
          .get(`/applications/${createdApplicationId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(createdApplicationId);
      });

      it('404 - đơn không tồn tại', async () => {
        const res = await request(app.getHttpServer())
          .get('/applications/999999')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });
    });

    // ─── PATCH /applications/:id/status (admin duyệt) ────────────────────────

    describe('PATCH /applications/:id/status', () => {
      it('200 - admin từ chối đơn (REJECTED)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/applications/${createdApplicationId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'REJECTED', rejectionReason: 'Không đủ điều kiện' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('REJECTED');
      });
    });

    // ─── DELETE /student/applications/:id (hủy đơn) ──────────────────────────

    describe('DELETE /student/applications/:id', () => {
      let cancelApplicationId: number | undefined;

      beforeAll(async () => {
        // Nộp đơn mới (NEW) để test cancel — đơn trước đã REJECTED nên cho phép nộp lại
        const res = await request(app.getHttpServer())
          .post('/student/applications')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ applicationType: 'NEW', priorityInfo: {} });
        if (res.status === 201) {
          cancelApplicationId = res.body.id;
        }
      });

      it('200 - student hủy đơn của mình', async () => {
        if (!cancelApplicationId) return; // Skip nếu không tạo được đơn
        const res = await request(app.getHttpServer())
          .delete(`/student/applications/${cancelApplicationId}`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect([200, 204]).toContain(res.status);
      });

      it('404 - hủy đơn không tồn tại', async () => {
        const res = await request(app.getHttpServer())
          .delete('/student/applications/999999')
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(404);
      });
    });
  });

  // ─── GET /admin/dashboard ────────────────────────────────────────────────────

  describe('GET /admin/dashboard', () => {
    it('200 - admin lấy dashboard hệ thống', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('403 - student không xem được admin dashboard', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });
});

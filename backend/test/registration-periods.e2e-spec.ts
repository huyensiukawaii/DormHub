import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { cleanup, disconnectDb, seedBase, TestSeeds, TEST_PASSWORD } from './helpers/db';

describe('Registration Periods (integration)', () => {
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
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
    await disconnectDb();
  });

  // ─── POST /registration-periods ──────────────────────────────────────────────

  describe('POST /registration-periods', () => {
    let createdPeriodId: number;

    it('201 - admin tạo đợt đăng ký mới thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/registration-periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'KTX-2026-HK1',
          name: 'Đợt đăng ký KTX học kỳ 1 năm 2026-2027',
          academicYear: '2026-2027',
          semester: 1,
          startDate: '2026-07-01',
          endDate: '2026-07-31',
          status: 'DRAFT',
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('KTX-2026-HK1');
      expect(res.body.status).toBe('DRAFT');
      createdPeriodId = res.body.id;
    });

    it('409 - mã đợt đã tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .post('/registration-periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'KTX-2026-HK1',
          name: 'Trùng mã',
          academicYear: '2026-2027',
          semester: 1,
          startDate: '2026-08-01',
          endDate: '2026-08-31',
        });

      expect(res.status).toBe(409);
    });

    it('400 - thiếu code', async () => {
      const res = await request(app.getHttpServer())
        .post('/registration-periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Đợt không có mã',
          academicYear: '2026-2027',
          semester: 1,
          startDate: '2026-07-01',
          endDate: '2026-07-31',
        });

      expect(res.status).toBe(400);
    });

    it('400 - academicYear sai format (không đủ 9 ký tự)', async () => {
      const res = await request(app.getHttpServer())
        .post('/registration-periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'KTX-TEST-99',
          name: 'Test',
          academicYear: '2026',
          semester: 1,
          startDate: '2026-07-01',
          endDate: '2026-07-31',
        });

      expect(res.status).toBe(400);
    });

    it('403 - student không tạo được đợt đăng ký', async () => {
      const res = await request(app.getHttpServer())
        .post('/registration-periods')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          code: 'KTX-2026-HK2',
          name: 'Test',
          academicYear: '2026-2027',
          semester: 2,
          startDate: '2026-12-01',
          endDate: '2026-12-31',
        });

      expect(res.status).toBe(403);
    });

    // ─── GET /registration-periods ────────────────────────────────────────────

    describe('GET /registration-periods', () => {
      it('200 - admin lấy danh sách đợt đăng ký', async () => {
        const res = await request(app.getHttpServer())
          .get('/registration-periods')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('200 - staff lấy được danh sách', async () => {
        const res = await request(app.getHttpServer())
          .get('/registration-periods')
          .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(200);
      });

      it('403 - student không xem được danh sách (chỉ xem active)', async () => {
        const res = await request(app.getHttpServer())
          .get('/registration-periods')
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(403);
      });
    });

    // ─── GET /registration-periods/active ─────────────────────────────────────

    describe('GET /registration-periods/active', () => {
      it('200 hoặc 404 - lấy đợt đăng ký đang mở (có thể không có)', async () => {
        const res = await request(app.getHttpServer())
          .get('/registration-periods/active')
          .set('Authorization', `Bearer ${studentToken}`);

        expect([200, 404]).toContain(res.status);
      });
    });

    // ─── GET /registration-periods/:id ────────────────────────────────────────

    describe('GET /registration-periods/:id', () => {
      it('200 - lấy chi tiết đợt đăng ký', async () => {
        const res = await request(app.getHttpServer())
          .get(`/registration-periods/${createdPeriodId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(createdPeriodId);
      });

      it('404 - đợt không tồn tại', async () => {
        const res = await request(app.getHttpServer())
          .get('/registration-periods/999999')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });
    });

    // ─── PUT /registration-periods/:id ────────────────────────────────────────

    describe('PUT /registration-periods/:id', () => {
      it('200 - admin cập nhật đợt đăng ký', async () => {
        const res = await request(app.getHttpServer())
          .put(`/registration-periods/${createdPeriodId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Đợt đăng ký đã cập nhật', description: 'Mô tả mới' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Đợt đăng ký đã cập nhật');
      });
    });

    // ─── PATCH /registration-periods/:id/status ───────────────────────────────

    describe('PATCH /registration-periods/:id/status', () => {
      it('200 - chuyển trạng thái từ DRAFT sang UPCOMING', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/registration-periods/${createdPeriodId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'UPCOMING' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('UPCOMING');
      });

      it('200 - chuyển trạng thái sang OPEN', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/registration-periods/${createdPeriodId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'OPEN' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OPEN');
      });

      it('200 - chuyển trạng thái sang CLOSED', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/registration-periods/${createdPeriodId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'CLOSED' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('CLOSED');
      });
    });

    // ─── GET /registration-periods/:id/stats ──────────────────────────────────

    describe('GET /registration-periods/:id/stats', () => {
      it('200 - thống kê đợt đăng ký', async () => {
        const res = await request(app.getHttpServer())
          .get(`/registration-periods/${createdPeriodId}/stats`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
      });
    });

    // ─── DELETE /registration-periods/:id ────────────────────────────────────

    describe('DELETE /registration-periods/:id (chỉ xóa được DRAFT/CANCELLED)', () => {
      let draftPeriodId: number;

      beforeAll(async () => {
        const res = await request(app.getHttpServer())
          .post('/registration-periods')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            code: 'KTX-DELETE-TEST',
            name: 'Đợt để xóa',
            academicYear: '2026-2027',
            semester: 2,
            startDate: '2026-12-01',
            endDate: '2026-12-31',
            status: 'DRAFT',
          });
        draftPeriodId = res.body.id;
      });

      it('200 - admin xóa đợt DRAFT thành công', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/registration-periods/${draftPeriodId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 204]).toContain(res.status);
      });

      it('403 - student không xóa được', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/registration-periods/${createdPeriodId}`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(403);
      });
    });
  });
});

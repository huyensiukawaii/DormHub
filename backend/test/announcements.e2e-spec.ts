import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { cleanup, disconnectDb, seedBase, TestSeeds, TEST_PASSWORD } from './helpers/db';

describe('Announcements (integration)', () => {
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

  // ─── GET /announcements/channels ────────────────────────────────────────────

  describe('GET /announcements/channels', () => {
    it('200 - admin lấy danh sách kênh thông báo', async () => {
      const res = await request(app.getHttpServer())
        .get('/announcements/channels')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('401 - không có token', async () => {
      const res = await request(app.getHttpServer()).get('/announcements/channels');
      expect(res.status).toBe(401);
    });
  });

  // ─── POST /announcements ─────────────────────────────────────────────────────

  describe('POST /announcements', () => {
    let createdAnnouncementId: number;

    it('201 - admin tạo thông báo toàn KTX thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Thông báo kiểm tra định kỳ tháng 4',
          content: 'Ban quản lý KTX thông báo sẽ kiểm tra phòng vào ngày 20/4/2026.',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Thông báo kiểm tra định kỳ tháng 4');
      createdAnnouncementId = res.body.id;
    });

    it('201 - staff tạo thông báo cho tòa cụ thể', async () => {
      const res = await request(app.getHttpServer())
        .post('/announcements')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'Thông báo cúp điện tòa TST',
          content: 'Tòa TST sẽ cúp điện vào 14h-16h ngày 25/4/2026.',
          buildingId: seeds.building.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.buildingId).toBe(seeds.building.id);
    });

    it('400 - thiếu title', async () => {
      const res = await request(app.getHttpServer())
        .post('/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: 'Nội dung không có tiêu đề' });

      expect(res.status).toBe(400);
    });

    it('403 - student không tạo được thông báo', async () => {
      const res = await request(app.getHttpServer())
        .post('/announcements')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Test', content: 'Bị cấm' });

      expect(res.status).toBe(403);
    });

    // ─── GET /announcements ───────────────────────────────────────────────────

    describe('GET /announcements', () => {
      it('200 - admin lấy danh sách thông báo', async () => {
        const res = await request(app.getHttpServer())
          .get('/announcements')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('200 - staff lấy được thông báo', async () => {
        const res = await request(app.getHttpServer())
          .get('/announcements')
          .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(200);
      });
    });

    // ─── PUT /announcements/:id ───────────────────────────────────────────────

    describe('PUT /announcements/:id', () => {
      it('200 - admin sửa thông báo thành công', async () => {
        const res = await request(app.getHttpServer())
          .put(`/announcements/${createdAnnouncementId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Thông báo kiểm tra đã cập nhật',
            content: 'Nội dung đã được cập nhật.',
          });

        expect(res.status).toBe(200);
        expect(res.body.title).toBe('Thông báo kiểm tra đã cập nhật');
      });

      it('404 - thông báo không tồn tại', async () => {
        const res = await request(app.getHttpServer())
          .put('/announcements/999999')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: 'Test' });

        expect(res.status).toBe(404);
      });
    });

    // ─── PATCH /announcements/:id/pin ─────────────────────────────────────────

    describe('PATCH /announcements/:id/pin', () => {
      it('200 - admin ghim thông báo', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/announcements/${createdAnnouncementId}/pin`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ isPinned: true });

        expect(res.status).toBe(200);
        expect(res.body.isPinned).toBe(true);
      });

      it('200 - admin bỏ ghim thông báo', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/announcements/${createdAnnouncementId}/pin`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ isPinned: false });

        expect(res.status).toBe(200);
        expect(res.body.isPinned).toBe(false);
      });
    });

    // ─── POST /announcements/:id/react ────────────────────────────────────────

    describe('POST /announcements/:id/react', () => {
      it('200 hoặc 201 - admin react vào thông báo', async () => {
        const res = await request(app.getHttpServer())
          .post(`/announcements/${createdAnnouncementId}/react`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ emoji: 'LIKE' });

        expect([200, 201]).toContain(res.status);
      });

      it('400 - emoji không hợp lệ', async () => {
        const res = await request(app.getHttpServer())
          .post(`/announcements/${createdAnnouncementId}/react`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ emoji: 'INVALID_EMOJI' });

        expect(res.status).toBe(400);
      });
    });

    // ─── GET /student/announcements ───────────────────────────────────────────

    describe('GET /student/announcements', () => {
      it('200 - student xem danh sách thông báo', async () => {
        const res = await request(app.getHttpServer())
          .get('/student/announcements')
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('200 - student lấy kênh thông báo', async () => {
        const res = await request(app.getHttpServer())
          .get('/student/announcements/channels')
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });

      it('403 - admin không vào route student', async () => {
        const res = await request(app.getHttpServer())
          .get('/student/announcements')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(403);
      });
    });

    // ─── POST /student/announcements/:id/react ────────────────────────────────

    describe('POST /student/announcements/:id/react', () => {
      it('200 hoặc 201 - student react vào thông báo', async () => {
        const res = await request(app.getHttpServer())
          .post(`/student/announcements/${createdAnnouncementId}/react`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ emoji: 'LOVE' });

        expect([200, 201]).toContain(res.status);
      });
    });

    // ─── DELETE /announcements/:id ────────────────────────────────────────────

    describe('DELETE /announcements/:id', () => {
      it('200 - admin xóa thông báo', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/announcements/${createdAnnouncementId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 204]).toContain(res.status);
      });

      it('403 - student không xóa được thông báo', async () => {
        const res = await request(app.getHttpServer())
          .delete('/announcements/999999')
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(403);
      });
    });
  });
});

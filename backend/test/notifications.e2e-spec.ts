import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { cleanup, disconnectDb, seedBase, TestSeeds, TEST_PASSWORD, testPrisma } from './helpers/db';

describe('Notifications (integration)', () => {
  let app: INestApplication;
  let seeds: TestSeeds;
  let adminToken: string;
  let studentToken: string;
  let notificationId: number;

  beforeAll(async () => {
    seeds = await seedBase();
    app = await createTestApp();

    const [adminRes, studentRes] = await Promise.all([
      request(app.getHttpServer()).post('/auth/login').send({ email: seeds.adminUser.email, password: TEST_PASSWORD }),
      request(app.getHttpServer()).post('/auth/login').send({ email: seeds.studentUser.email, password: TEST_PASSWORD }),
    ]);

    adminToken = adminRes.body.accessToken;
    studentToken = studentRes.body.accessToken;

    // Tạo notification trực tiếp qua DB để test
    const notification = await testPrisma.notification.create({
      data: {
        userId: seeds.studentUser.id,
        title: 'Thông báo test',
        content: 'Nội dung thông báo integration test',
        type: 'SYSTEM',
        isRead: false,
      },
    });
    notificationId = notification.id;
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
    await disconnectDb();
  });

  // ─── GET /notifications ──────────────────────────────────────────────────────

  describe('GET /notifications', () => {
    it('200 - student lấy danh sách thông báo của mình', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('200 - admin lấy thông báo của mình', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('200 - lọc chỉ lấy chưa đọc', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((n: any) => !n.isRead)).toBe(true);
    });

    it('401 - không có token', async () => {
      const res = await request(app.getHttpServer()).get('/notifications');
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /notifications/unread-count ────────────────────────────────────────

  describe('GET /notifications/unread-count', () => {
    it('200 - đếm số thông báo chưa đọc', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('count');
      expect(typeof res.body.count).toBe('number');
      expect(res.body.count).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── PATCH /notifications/:id/read ──────────────────────────────────────────

  describe('PATCH /notifications/:id/read', () => {
    it('200 - đánh dấu thông báo đã đọc', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isRead).toBe(true);
    });

    it('404 - thông báo không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .patch('/notifications/999999/read')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /notifications/read-all ──────────────────────────────────────────

  describe('PATCH /notifications/read-all', () => {
    beforeAll(async () => {
      // Tạo thêm notification chưa đọc
      await testPrisma.notification.createMany({
        data: [
          { userId: seeds.studentUser.id, title: 'TB chưa đọc 1', type: 'SYSTEM', isRead: false },
          { userId: seeds.studentUser.id, title: 'TB chưa đọc 2', type: 'SYSTEM', isRead: false },
        ],
      });
    });

    it('200 - đánh dấu tất cả thông báo đã đọc', async () => {
      const res = await request(app.getHttpServer())
        .patch('/notifications/read-all')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);

      // Verify unread count là 0
      const countRes = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(countRes.body.count).toBe(0);
    });
  });

  // ─── DELETE /notifications/:id ───────────────────────────────────────────────

  describe('DELETE /notifications/:id', () => {
    let newNotificationId: number;

    beforeAll(async () => {
      const n = await testPrisma.notification.create({
        data: {
          userId: seeds.studentUser.id,
          title: 'TB cần xóa',
          type: 'SYSTEM',
          isRead: false,
        },
      });
      newNotificationId = n.id;
    });

    it('200 - xóa thông báo thành công', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/notifications/${newNotificationId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect([200, 204]).toContain(res.status);
    });

    it('404 - xóa thông báo không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .delete('/notifications/999999')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
    });
  });
});

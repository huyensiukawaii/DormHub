import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { cleanup, disconnectDb, seedBase, TestSeeds, TEST_PASSWORD } from './helpers/db';

describe('Users (integration)', () => {
  let app: INestApplication;
  let seeds: TestSeeds;
  let adminToken: string;
  let studentToken: string;

  beforeAll(async () => {
    seeds = await seedBase();
    app = await createTestApp();

    const [adminRes, studentRes] = await Promise.all([
      request(app.getHttpServer()).post('/auth/login').send({ email: seeds.adminUser.email, password: TEST_PASSWORD }),
      request(app.getHttpServer()).post('/auth/login').send({ email: seeds.studentUser.email, password: TEST_PASSWORD }),
    ]);

    adminToken = adminRes.body.accessToken;
    studentToken = studentRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
    await disconnectDb();
  });

  // ─── GET /users ──────────────────────────────────────────────────────────────

  describe('GET /users', () => {
    it('200 - admin lấy danh sách người dùng', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(true);
    });

    it('403 - student không truy cập được', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('401 - không có token', async () => {
      const res = await request(app.getHttpServer()).get('/users');
      expect(res.status).toBe(401);
    });

    it('200 - lọc theo role STAFF', async () => {
      const res = await request(app.getHttpServer())
        .get('/users?role=STAFF')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  // ─── GET /users/:id ──────────────────────────────────────────────────────────

  describe('GET /users/:id', () => {
    it('200 - lấy chi tiết staff user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/${seeds.staffUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(seeds.staffUser.id);
    });

    it('404 - người dùng không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /users ─────────────────────────────────────────────────────────────

  describe('POST /users', () => {
    let createdUserId: number;

    it('201 - admin tạo tài khoản staff mới', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'staff.new.test@dormhub.test',
          fullName: 'Staff Mới Test',
          password: 'Staff@123456',
        });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe('staff.new.test@dormhub.test');
      expect(res.body.role).toBe('STAFF');
      createdUserId = res.body.id;
    });

    it('409 - email đã tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: seeds.staffUser.email,
          fullName: 'Trùng email',
          password: 'Test@123456',
        });

      expect(res.status).toBe(409);
    });

    it('400 - thiếu email', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fullName: 'Staff Test', password: 'Test@123456' });

      expect(res.status).toBe(400);
    });

    it('403 - student không tạo được user', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          email: 'staff.forbidden@dormhub.test',
          fullName: 'Forbidden',
          password: 'Test@123456',
        });

      expect(res.status).toBe(403);
    });

    // ─── PUT /users/:id ───────────────────────────────────────────────────────

    describe('PUT /users/:id', () => {
      it('200 - admin cập nhật thông tin staff', async () => {
        const res = await request(app.getHttpServer())
          .put(`/users/${createdUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ fullName: 'Staff Đã Sửa', isActive: true });

        expect(res.status).toBe(200);
        expect(res.body.fullName).toBe('Staff Đã Sửa');
      });

      it('404 - người dùng không tồn tại', async () => {
        const res = await request(app.getHttpServer())
          .put('/users/999999')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ fullName: 'Test' });

        expect(res.status).toBe(404);
      });
    });

    // ─── POST /users/:id/buildings/:buildingId ────────────────────────────────

    describe('POST /users/:id/buildings/:buildingId (giao tòa)', () => {
      it('200 hoặc 201 - giao tòa nhà cho staff', async () => {
        const res = await request(app.getHttpServer())
          .post(`/users/${createdUserId}/buildings/${seeds.building.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 201]).toContain(res.status);
      });

      it('200 hoặc 201 - giao tòa lần 2 (idempotent)', async () => {
        const res = await request(app.getHttpServer())
          .post(`/users/${createdUserId}/buildings/${seeds.building.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 201, 409]).toContain(res.status);
      });
    });

    // ─── DELETE /users/:id/buildings/:buildingId ──────────────────────────────

    describe('DELETE /users/:id/buildings/:buildingId (thu hồi tòa)', () => {
      it('200 hoặc 204 - thu hồi phân công tòa', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/users/${createdUserId}/buildings/${seeds.building.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 204]).toContain(res.status);
      });
    });

    // ─── DELETE /users/:id ────────────────────────────────────────────────────

    describe('DELETE /users/:id (vô hiệu hóa)', () => {
      it('200 hoặc 204 - admin vô hiệu hóa tài khoản', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/users/${createdUserId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 204]).toContain(res.status);
      });

      it('403 - student không xóa được user', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/users/${seeds.staffUser.id}`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(403);
      });
    });
  });
});

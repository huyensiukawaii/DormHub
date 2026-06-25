import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { cleanup, disconnectDb, seedBase, TestSeeds, TEST_PASSWORD } from './helpers/db';

describe('Buildings (integration)', () => {
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

  // ─── GET /buildings ──────────────────────────────────────────────────────────

  describe('GET /buildings', () => {
    it('200 - admin lấy danh sách tòa nhà', async () => {
      const res = await request(app.getHttpServer())
        .get('/buildings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(true);
    });

    it('200 - staff lấy được danh sách', async () => {
      const res = await request(app.getHttpServer())
        .get('/buildings')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
    });

    it('200 - student lấy được danh sách (phân quyền)', async () => {
      const res = await request(app.getHttpServer())
        .get('/buildings')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
    });

    it('401 - không có token', async () => {
      const res = await request(app.getHttpServer()).get('/buildings');
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /buildings/:id ──────────────────────────────────────────────────────

  describe('GET /buildings/:id', () => {
    it('200 - lấy chi tiết tòa nhà đã seed', async () => {
      const res = await request(app.getHttpServer())
        .get(`/buildings/${seeds.building.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(seeds.building.id);
      expect(res.body.code).toBe(seeds.building.code);
    });

    it('404 - tòa nhà không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .get('/buildings/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /buildings ─────────────────────────────────────────────────────────

  describe('POST /buildings', () => {
    let createdBuildingId: number;

    it('201 - admin tạo tòa nhà mới thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/buildings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'B01', name: 'Tòa B1 Test', totalFloors: 8 });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('B01');
      expect(res.body.status).toBe('ACTIVE');
      createdBuildingId = res.body.id;
    });

    it('409 - mã tòa nhà đã tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .post('/buildings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'B01', name: 'Tòa trùng mã', totalFloors: 5 });

      expect(res.status).toBe(409);
    });

    it('400 - thiếu code', async () => {
      const res = await request(app.getHttpServer())
        .post('/buildings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Tòa thiếu mã', totalFloors: 5 });

      expect(res.status).toBe(400);
    });

    it('403 - staff không tạo được tòa nhà', async () => {
      const res = await request(app.getHttpServer())
        .post('/buildings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: 'B99', name: 'Tòa bị cấm', totalFloors: 5 });

      expect(res.status).toBe(403);
    });

    it('403 - student không tạo được tòa nhà', async () => {
      const res = await request(app.getHttpServer())
        .post('/buildings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ code: 'B99', name: 'Tòa bị cấm', totalFloors: 5 });

      expect(res.status).toBe(403);
    });

    // ─── PUT /buildings/:id ────────────────────────────────────────────────────

    describe('PUT /buildings/:id', () => {
      it('200 - admin cập nhật tòa nhà thành công', async () => {
        const res = await request(app.getHttpServer())
          .put(`/buildings/${createdBuildingId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Tòa B1 Đã Cập Nhật', totalFloors: 10 });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Tòa B1 Đã Cập Nhật');
      });

      it('404 - tòa nhà không tồn tại', async () => {
        const res = await request(app.getHttpServer())
          .put('/buildings/999999')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Test' });

        expect(res.status).toBe(404);
      });
    });

    // ─── DELETE /buildings/:id ────────────────────────────────────────────────

    describe('DELETE /buildings/:id', () => {
      it('200 - admin xóa tòa nhà không có phòng thành công', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/buildings/${createdBuildingId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 204]).toContain(res.status);
      });

      it('403 - staff không xóa được tòa nhà', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/buildings/${seeds.building.id}`)
          .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(403);
      });
    });
  });
});

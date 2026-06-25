import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { cleanup, disconnectDb, seedBase, TestSeeds, TEST_PASSWORD } from './helpers/db';

describe('Settings (integration)', () => {
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

    // Seed default settings
    await request(app.getHttpServer())
      .post('/settings/seed')
      .set('Authorization', `Bearer ${adminToken}`);
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
    await disconnectDb();
  });

  // ─── POST /settings/seed ────────────────────────────────────────────────────

  describe('POST /settings/seed', () => {
    it('200 - admin seed cài đặt mặc định thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/settings/seed')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 201]).toContain(res.status);
    });

    it('403 - student không seed được', async () => {
      const res = await request(app.getHttpServer())
        .post('/settings/seed')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── GET /settings ──────────────────────────────────────────────────────────

  describe('GET /settings', () => {
    it('200 - admin lấy tất cả settings (grouped by tab)', async () => {
      const res = await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(typeof res.body).toBe('object');
    });

    it('200 - staff lấy được settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
    });

    it('403 - student không truy cập được', async () => {
      const res = await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('401 - không có token', async () => {
      const res = await request(app.getHttpServer()).get('/settings');
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /settings/key/:key ─────────────────────────────────────────────────

  describe('GET /settings/key/:key', () => {
    it('200 - lấy setting theo key hợp lệ', async () => {
      const res = await request(app.getHttpServer())
        .get('/settings/key/electricity_tier_1_price')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.key).toBe('electricity_tier_1_price');
      expect(res.body.value).toBeDefined();
    });

    it('404 - key không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .get('/settings/key/key_khong_ton_tai_abc123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── PUT /settings ──────────────────────────────────────────────────────────

  describe('PUT /settings', () => {
    it('200 - admin cập nhật setting thành công', async () => {
      const res = await request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ key: 'electricity_tier_1_price', value: '1800' });

      expect(res.status).toBe(200);
      expect(res.body.value).toBe('1800');
    });

    it('400 - thiếu key', async () => {
      const res = await request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: '1800' });

      expect(res.status).toBe(400);
    });

    it('403 - staff không cập nhật được', async () => {
      const res = await request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ key: 'electricity_tier_1_price', value: '1900' });

      expect(res.status).toBe(403);
    });
  });

  // ─── PUT /settings/bulk ─────────────────────────────────────────────────────

  describe('PUT /settings/bulk', () => {
    it('200 - admin cập nhật nhiều settings cùng lúc', async () => {
      const res = await request(app.getHttpServer())
        .put('/settings/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          settings: [
            { key: 'electricity_tier_1_price', value: '1728' },
            { key: 'water_per_person_monthly', value: '30000' },
          ],
        });

      expect(res.status).toBe(200);
    });

    it('400 - thiếu settings array', async () => {
      const res = await request(app.getHttpServer())
        .put('/settings/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /settings/calculate ────────────────────────────────────────────────

  describe('GET /settings/calculate/electricity', () => {
    it('200 - tính tiền điện theo consumption', async () => {
      const res = await request(app.getHttpServer())
        .get('/settings/calculate/electricity?consumption=90')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalCost');
      expect(Number(res.body.totalCost)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /settings/calculate/water', () => {
    it('200 - tính tiền nước theo consumption', async () => {
      const res = await request(app.getHttpServer())
        .get('/settings/calculate/water?consumption=8&occupants=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalCost');
    });
  });
});

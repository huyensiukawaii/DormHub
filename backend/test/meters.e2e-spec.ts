import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { cleanup, disconnectDb, seedBase, TestSeeds, TEST_PASSWORD } from './helpers/db';

describe('Meters (integration)', () => {
  let app: INestApplication;
  let seeds: TestSeeds;
  let adminToken: string;
  let staffToken: string;
  let studentToken: string;

  const READING_MONTH = '2026-04-01';

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

  // ─── GET /meters/rooms ───────────────────────────────────────────────────────

  describe('GET /meters/rooms', () => {
    it('200 - lấy danh sách phòng cần ghi chỉ số điện', async () => {
      const res = await request(app.getHttpServer())
        .get(`/meters/rooms?meterType=ELECTRICITY&readingMonth=${READING_MONTH}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(true);
    });

    it('400 - thiếu meterType', async () => {
      const res = await request(app.getHttpServer())
        .get(`/meters/rooms?readingMonth=${READING_MONTH}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('403 - student không truy cập được', async () => {
      const res = await request(app.getHttpServer())
        .get(`/meters/rooms?meterType=ELECTRICITY&readingMonth=${READING_MONTH}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('401 - không có token', async () => {
      const res = await request(app.getHttpServer())
        .get(`/meters/rooms?meterType=ELECTRICITY&readingMonth=${READING_MONTH}`);

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /meters ─────────────────────────────────────────────────────────────

  describe('GET /meters', () => {
    it('200 - admin lấy danh sách chỉ số (paginated)', async () => {
      const res = await request(app.getHttpServer())
        .get('/meters')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
    });

    it('200 - staff lấy được', async () => {
      const res = await request(app.getHttpServer())
        .get('/meters')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
    });

    it('403 - student không truy cập được', async () => {
      const res = await request(app.getHttpServer())
        .get('/meters')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── POST /meters ────────────────────────────────────────────────────────────

  describe('POST /meters', () => {
    let createdMeterId: number;

    it('201 - ghi chỉ số điện cho phòng', async () => {
      const res = await request(app.getHttpServer())
        .post('/meters')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roomId: seeds.maleRoom.id,
          meterType: 'ELECTRICITY',
          readingMonth: READING_MONTH,
          previousReading: 200,
          currentReading: 290,
        });

      expect(res.status).toBe(201);
      expect(res.body.roomId).toBe(seeds.maleRoom.id);
      expect(res.body.meterType).toBe('ELECTRICITY');
      expect(Number(res.body.consumption)).toBe(90);
      createdMeterId = res.body.id;
    });

    it('409 - ghi lại chỉ số điện cùng phòng cùng tháng', async () => {
      const res = await request(app.getHttpServer())
        .post('/meters')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roomId: seeds.maleRoom.id,
          meterType: 'ELECTRICITY',
          readingMonth: READING_MONTH,
          previousReading: 200,
          currentReading: 300,
        });

      expect(res.status).toBe(409);
    });

    it('400 - thiếu roomId', async () => {
      const res = await request(app.getHttpServer())
        .post('/meters')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          meterType: 'ELECTRICITY',
          readingMonth: READING_MONTH,
          currentReading: 290,
        });

      expect(res.status).toBe(400);
    });

    it('400 - chỉ số hiện tại âm', async () => {
      const res = await request(app.getHttpServer())
        .post('/meters')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roomId: seeds.femaleRoom.id,
          meterType: 'ELECTRICITY',
          readingMonth: READING_MONTH,
          currentReading: -5,
        });

      expect(res.status).toBe(400);
    });

    it('403 - student không ghi chỉ số được', async () => {
      const res = await request(app.getHttpServer())
        .post('/meters')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          roomId: seeds.femaleRoom.id,
          meterType: 'WATER',
          readingMonth: READING_MONTH,
          currentReading: 50,
        });

      expect(res.status).toBe(403);
    });

    // ─── GET /meters/room/:roomId/history ─────────────────────────────────────

    describe('GET /meters/room/:roomId/history', () => {
      it('200 - lịch sử chỉ số của phòng', async () => {
        const res = await request(app.getHttpServer())
          .get(`/meters/room/${seeds.maleRoom.id}/history`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        // Response: { room: { id, code, buildingId, ... }, readings: [...] }
        expect(res.body).toHaveProperty('room');
        expect(res.body).toHaveProperty('readings');
        expect(Array.isArray(res.body.readings)).toBe(true);
      });
    });

    // ─── PUT /meters/:id ──────────────────────────────────────────────────────

    describe('PUT /meters/:id', () => {
      it('200 - cập nhật chỉ số đã ghi', async () => {
        const res = await request(app.getHttpServer())
          .put(`/meters/${createdMeterId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ currentReading: 295 });

        expect(res.status).toBe(200);
        expect(Number(res.body.currentReading)).toBe(295);
      });

      it('404 - bản ghi không tồn tại', async () => {
        const res = await request(app.getHttpServer())
          .put('/meters/999999')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ currentReading: 300 });

        expect(res.status).toBe(404);
      });
    });

    // ─── DELETE /meters/:id ───────────────────────────────────────────────────

    describe('DELETE /meters/:id', () => {
      it('200 - admin xóa bản ghi chỉ số', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/meters/${createdMeterId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 204]).toContain(res.status);
      });

      it('403 - staff không xóa được chỉ số', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/meters/${createdMeterId}`)
          .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(403);
      });
    });
  });
});

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { cleanup, disconnectDb, seedBase, TestSeeds, TEST_PASSWORD } from './helpers/db';

describe('Rooms (integration)', () => {
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

  // ─── GET /rooms ──────────────────────────────────────────────────────────────

  describe('GET /rooms', () => {
    it('200 - admin lấy danh sách phòng', async () => {
      const res = await request(app.getHttpServer())
        .get('/rooms')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(true);
    });

    it('200 - staff lấy được danh sách phòng', async () => {
      const res = await request(app.getHttpServer())
        .get('/rooms')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
    });

    it('200 - lọc phòng theo buildingId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/rooms?buildingId=${seeds.building.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('200 - lọc phòng theo gender MALE', async () => {
      const res = await request(app.getHttpServer())
        .get('/rooms?gender=MALE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('401 - không có token', async () => {
      const res = await request(app.getHttpServer()).get('/rooms');
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /rooms/:id ──────────────────────────────────────────────────────────

  describe('GET /rooms/:id', () => {
    it('200 - lấy chi tiết phòng đã seed', async () => {
      const res = await request(app.getHttpServer())
        .get(`/rooms/${seeds.maleRoom.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(seeds.maleRoom.id);
      expect(res.body.code).toBe(seeds.maleRoom.code);
    });

    it('404 - phòng không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .get('/rooms/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /rooms ─────────────────────────────────────────────────────────────

  describe('POST /rooms', () => {
    let createdRoomId: number;

    it('201 - admin tạo phòng mới thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TST301',
          buildingId: seeds.building.id,
          floor: 3,
          gender: 'MALE',
          roomType: 'STANDARD',
          capacity: 4,
          pricePerMonth: 400000,
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('TST301');
      expect(res.body.status).toBe('ACTIVE');
      createdRoomId = res.body.id;
    });

    it('409 - mã phòng đã tồn tại trong tòa', async () => {
      const res = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TST301',
          buildingId: seeds.building.id,
          floor: 3,
          gender: 'MALE',
          roomType: 'STANDARD',
          capacity: 4,
          pricePerMonth: 400000,
        });

      expect(res.status).toBe(409);
    });

    it('400 - thiếu buildingId', async () => {
      const res = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TST302',
          floor: 3,
          gender: 'MALE',
          roomType: 'STANDARD',
          capacity: 4,
          pricePerMonth: 400000,
        });

      expect(res.status).toBe(400);
    });

    it('403 - student không tạo được phòng', async () => {
      const res = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          code: 'TST999',
          buildingId: seeds.building.id,
          floor: 9,
          gender: 'MALE',
          roomType: 'STANDARD',
          capacity: 4,
          pricePerMonth: 400000,
        });

      expect(res.status).toBe(403);
    });

    // ─── PUT /rooms/:id ───────────────────────────────────────────────────────

    describe('PUT /rooms/:id', () => {
      it('200 - admin cập nhật thông tin phòng', async () => {
        const res = await request(app.getHttpServer())
          .put(`/rooms/${createdRoomId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ pricePerMonth: 450000, capacity: 6 });

        expect(res.status).toBe(200);
        expect(Number(res.body.pricePerMonth)).toBe(450000);
      });

      it('404 - phòng không tồn tại', async () => {
        const res = await request(app.getHttpServer())
          .put('/rooms/999999')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ capacity: 4 });

        expect(res.status).toBe(404);
      });

      it('403 - student không cập nhật được phòng', async () => {
        const res = await request(app.getHttpServer())
          .put(`/rooms/${createdRoomId}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ capacity: 4 });

        expect(res.status).toBe(403);
      });
    });

    // ─── DELETE /rooms/:id ────────────────────────────────────────────────────

    describe('DELETE /rooms/:id', () => {
      it('200 - admin xóa phòng không có hợp đồng', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/rooms/${createdRoomId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 204]).toContain(res.status);
      });

      it('403 - student không xóa được phòng', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/rooms/${seeds.maleRoom.id}`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(403);
      });
    });
  });
});

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import {
  cleanup,
  disconnectDb,
  seedBase,
  TestSeeds,
  TEST_PASSWORD,
} from './helpers/db';

describe('Contracts (integration)', () => {
  let app: INestApplication;
  let seeds: TestSeeds;
  let adminToken: string;
  let studentToken: string;

  beforeAll(async () => {
    seeds = await seedBase();
    app = await createTestApp();

    const [adminRes, studentRes] = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seeds.adminUser.email, password: TEST_PASSWORD }),
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seeds.studentUser.email, password: TEST_PASSWORD }),
    ]);

    adminToken = adminRes.body.accessToken;
    studentToken = studentRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
    await disconnectDb();
  });

  // ─── GET /contracts ──────────────────────────────────────────────────────────

  describe('GET /contracts', () => {
    it('200 - admin lấy được danh sách hợp đồng (dạng paginated)', async () => {
      const res = await request(app.getHttpServer())
        .get('/contracts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('401 - không có token bị từ chối', async () => {
      const res = await request(app.getHttpServer()).get('/contracts');
      expect(res.status).toBe(401);
    });

    it('403 - sinh viên không được truy cập route admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/contracts')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it('200 - lọc theo status=ACTIVE', async () => {
      const res = await request(app.getHttpServer())
        .get('/contracts?status=ACTIVE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── POST /contracts ─────────────────────────────────────────────────────────

  describe('POST /contracts (tạo hợp đồng)', () => {
    let createdContractId: number;

    it('201 - admin tạo hợp đồng thành công, mã hợp đồng đúng format', async () => {
      const res = await request(app.getHttpServer())
        .post('/contracts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: seeds.studentUser.studentId,
          roomId: seeds.maleRoom.id,
          startDate: '2026-02-10',
          endDate: '2026-06-30',
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toMatch(/^HD-\d{4}-\d{3}$/);
      expect(res.body.status).toBe('ACTIVE');
      expect(Number(res.body.monthlyRent)).toBe(350000);
      createdContractId = res.body.id;
    });

    it('409 - sinh viên đã có hợp đồng ACTIVE, không tạo được hợp đồng thứ hai', async () => {
      const res = await request(app.getHttpServer())
        .post('/contracts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: seeds.studentUser.studentId,
          roomId: seeds.maleRoom.id,
          startDate: '2026-02-10',
          endDate: '2026-06-30',
        });

      expect(res.status).toBe(409);
    });

    it('400 - ngày kết thúc trước ngày bắt đầu', async () => {
      const res = await request(app.getHttpServer())
        .post('/contracts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: seeds.studentUser.studentId,
          roomId: seeds.maleRoom.id,
          startDate: '2026-06-30',
          endDate: '2026-02-10',
        });

      expect(res.status).toBe(400);
    });

    it('400 - giới tính sinh viên (MALE) không khớp phòng (FEMALE)', async () => {
      const res = await request(app.getHttpServer())
        .post('/contracts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: seeds.studentUser.studentId,
          roomId: seeds.femaleRoom.id,
          startDate: '2026-02-10',
          endDate: '2026-06-30',
        });

      expect(res.status).toBe(400);
    });

    it('400 - thiếu studentId trong body', async () => {
      const res = await request(app.getHttpServer())
        .post('/contracts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roomId: seeds.maleRoom.id,
          startDate: '2026-02-10',
          endDate: '2026-06-30',
        });

      expect(res.status).toBe(400);
    });

    it('403 - sinh viên không có quyền tạo hợp đồng', async () => {
      const res = await request(app.getHttpServer())
        .post('/contracts')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: seeds.studentUser.studentId,
          roomId: seeds.maleRoom.id,
          startDate: '2026-02-10',
          endDate: '2026-06-30',
        });

      expect(res.status).toBe(403);
    });

    // ─── GET /contracts/:id ────────────────────────────────────────────────────

    describe('GET /contracts/:id', () => {
      it('200 - lấy chi tiết hợp đồng vừa tạo, có trường daysRemaining', async () => {
        const res = await request(app.getHttpServer())
          .get(`/contracts/${createdContractId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(createdContractId);
        expect(res.body.daysRemaining).toBeDefined();
        expect(typeof res.body.daysRemaining).toBe('number');
      });

      it('404 - hợp đồng không tồn tại', async () => {
        const res = await request(app.getHttpServer())
          .get('/contracts/999999')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });
    });

    // ─── PATCH /contracts/:id/check-in ────────────────────────────────────────

    describe('PATCH /contracts/:id/check-in', () => {
      it('200 - check-in thành công, checkedInAt không còn null', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/contracts/${createdContractId}/check-in`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect(res.status).toBe(200);
        expect(res.body.checkedInAt).not.toBeNull();
      });

      it('400 - check-in lần 2 bị từ chối (đã check-in)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/contracts/${createdContractId}/check-in`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect(res.status).toBe(400);
      });
    });

    // ─── PATCH /contracts/:id/room-leader ─────────────────────────────────────

    describe('PATCH /contracts/:id/room-leader', () => {
      it('200 - đặt trưởng phòng thành công', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/contracts/${createdContractId}/room-leader`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ isRoomLeader: true });

        expect(res.status).toBe(200);
        expect(res.body.isRoomLeader).toBe(true);
      });

      it('200 - bỏ trưởng phòng thành công', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/contracts/${createdContractId}/room-leader`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ isRoomLeader: false });

        expect(res.status).toBe(200);
        expect(res.body.isRoomLeader).toBe(false);
      });
    });

    // ─── PATCH /contracts/:id/check-out ───────────────────────────────────────

    describe('PATCH /contracts/:id/check-out', () => {
      it('200 - check-out thành công, status chuyển sang EXPIRED', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/contracts/${createdContractId}/check-out`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('EXPIRED');
        expect(res.body.checkedOutAt).not.toBeNull();
      });

      it('400 - check-out lần 2 bị từ chối (hợp đồng không còn ACTIVE)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/contracts/${createdContractId}/check-out`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect(res.status).toBe(400);
      });
    });
  });

  // ─── GET /contracts/stats ────────────────────────────────────────────────────

  describe('GET /contracts/stats', () => {
    it('200 - trả về thống kê hợp đồng', async () => {
      const res = await request(app.getHttpServer())
        .get('/contracts/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('active');
      expect(res.body).toHaveProperty('expired');
      expect(res.body).toHaveProperty('terminated');
    });
  });

  // ─── GET /student/contracts ──────────────────────────────────────────────────

  describe('GET /student/contracts', () => {
    it('200 - sinh viên xem được danh sách hợp đồng của mình', async () => {
      const res = await request(app.getHttpServer())
        .get('/student/contracts')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('403 - admin không truy cập được route của sinh viên', async () => {
      const res = await request(app.getHttpServer())
        .get('/student/contracts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });
  });
});

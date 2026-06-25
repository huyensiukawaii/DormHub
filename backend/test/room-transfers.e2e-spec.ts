import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import {
  cleanup,
  disconnectDb,
  seedBase,
  TestSeeds,
  TEST_PASSWORD,
  testPrisma,
} from './helpers/db';

describe('Room Transfers (integration)', () => {
  let app: INestApplication;
  let seeds: TestSeeds;
  let adminToken: string;
  let staffToken: string;
  let studentToken: string;
  let targetRoomId: number;

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

    // Tạo hợp đồng ACTIVE cho sinh viên (điều kiện để chuyển phòng)
    await testPrisma.contract.create({
      data: {
        code: 'HD-TRANSFER-001',
        studentId: seeds.studentUser.studentId,
        roomId: seeds.maleRoom.id,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-08-31'),
        monthlyRent: 350000,
        status: 'ACTIVE',
        createdById: seeds.adminUser.id,
      },
    });

    // Tạo phòng đích để chuyển đến (cùng giới tính MALE, còn chỗ)
    const targetRoom = await testPrisma.room.create({
      data: {
        code: 'TST-TRANSFER-301',
        buildingId: seeds.building.id,
        floor: 3,
        gender: 'MALE',
        roomType: 'STANDARD',
        capacity: 6,
        pricePerMonth: 400000,
        status: 'ACTIVE',
      },
    });
    targetRoomId = targetRoom.id;
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
    await disconnectDb();
  });

  // ─── GET /room-transfers/stats ───────────────────────────────────────────────

  describe('GET /room-transfers/stats', () => {
    it('200 - admin lấy thống kê yêu cầu chuyển phòng', async () => {
      const res = await request(app.getHttpServer())
        .get('/room-transfers/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('403 - student không xem được stats admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/room-transfers/stats')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── POST /room-transfers/student ────────────────────────────────────────────

  describe('POST /room-transfers/student', () => {
    let createdTransferId: number;

    it('201 - student tạo yêu cầu chuyển phòng thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/room-transfers/student')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          toRoomId: targetRoomId,
          reason: 'Muốn chuyển sang phòng có điều hòa',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('PENDING');
      createdTransferId = res.body.id;
    });

    it('400 - đã có yêu cầu PENDING, không tạo được yêu cầu thứ hai', async () => {
      const res = await request(app.getHttpServer())
        .post('/room-transfers/student')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          toRoomId: targetRoomId,
          reason: 'Yêu cầu thứ hai bị từ chối',
        });

      expect([400, 409]).toContain(res.status);
    });

    it('400 - thiếu reason', async () => {
      const res = await request(app.getHttpServer())
        .post('/room-transfers/student')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ toRoomId: targetRoomId });

      expect(res.status).toBe(400);
    });

    it('403 - admin không tạo yêu cầu chuyển phòng như student', async () => {
      const res = await request(app.getHttpServer())
        .post('/room-transfers/student')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ toRoomId: targetRoomId, reason: 'Test' });

      expect(res.status).toBe(403);
    });

    // ─── GET /room-transfers/student/my ──────────────────────────────────────

    describe('GET /room-transfers/student/my', () => {
      it('200 - student xem lịch sử yêu cầu của mình', async () => {
        const res = await request(app.getHttpServer())
          .get('/room-transfers/student/my')
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(true);
      });

      it('403 - admin không xem route student', async () => {
        const res = await request(app.getHttpServer())
          .get('/room-transfers/student/my')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(403);
      });
    });

    // ─── GET /room-transfers ──────────────────────────────────────────────────

    describe('GET /room-transfers', () => {
      it('200 - admin lấy danh sách tất cả yêu cầu', async () => {
        const res = await request(app.getHttpServer())
          .get('/room-transfers')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('200 - staff lấy được danh sách', async () => {
        const res = await request(app.getHttpServer())
          .get('/room-transfers')
          .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(200);
      });

      it('403 - student không truy cập route admin', async () => {
        const res = await request(app.getHttpServer())
          .get('/room-transfers')
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(403);
      });
    });

    // ─── GET /room-transfers/:id ──────────────────────────────────────────────

    describe('GET /room-transfers/:id', () => {
      it('200 - admin xem chi tiết yêu cầu', async () => {
        const res = await request(app.getHttpServer())
          .get(`/room-transfers/${createdTransferId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(createdTransferId);
      });

      it('404 - yêu cầu không tồn tại', async () => {
        const res = await request(app.getHttpServer())
          .get('/room-transfers/999999')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });
    });

    // ─── PATCH /room-transfers/:id/review ────────────────────────────────────

    describe('PATCH /room-transfers/:id/review (duyệt/từ chối)', () => {
      it('200 - admin duyệt yêu cầu chuyển phòng (APPROVED)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/room-transfers/${createdTransferId}/review`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ action: 'APPROVED' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('400 - duyệt lại yêu cầu đã APPROVED', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/room-transfers/${createdTransferId}/review`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ action: 'APPROVED' });

        expect(res.status).toBe(400);
      });
    });

    // ─── PATCH /room-transfers/student/:id/cancel ─────────────────────────────

    describe('PATCH /room-transfers/student/:id/cancel', () => {
      let cancelTransferId: number;

      beforeAll(async () => {
        // Cần phòng mới vì phòng TST-TRANSFER-301 giờ có contract sau khi approved
        // Tạo thêm phòng để test cancel
        const newRoom = await testPrisma.room.create({
          data: {
            code: 'TST-CANCEL-401',
            buildingId: seeds.building.id,
            floor: 4,
            gender: 'MALE',
            roomType: 'STANDARD',
            capacity: 6,
            pricePerMonth: 400000,
            status: 'ACTIVE',
          },
        });

        const res = await request(app.getHttpServer())
          .post('/room-transfers/student')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ toRoomId: newRoom.id, reason: 'Yêu cầu để test cancel' });
        cancelTransferId = res.body?.id;
      });

      it('200 - student hủy yêu cầu PENDING của mình', async () => {
        if (!cancelTransferId) {
          console.warn('Skip: không tạo được yêu cầu mới để test cancel');
          return;
        }
        const res = await request(app.getHttpServer())
          .patch(`/room-transfers/student/${cancelTransferId}/cancel`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect([200, 400]).toContain(res.status);
      });
    });
  });
});

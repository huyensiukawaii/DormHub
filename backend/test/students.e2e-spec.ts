import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { cleanup, disconnectDb, seedBase, TestSeeds, TEST_PASSWORD, STUDENT_CODE } from './helpers/db';

describe('Students (integration)', () => {
  let app: INestApplication;
  let seeds: TestSeeds;
  let adminToken: string;
  let staffToken: string;
  let studentToken: string;

  const NEW_STUDENT_CODE = '20240001';
  const NEW_STUDENT_EMAIL = 'sv20240001@sis.hust.edu.vn';

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

  // ─── GET /students ───────────────────────────────────────────────────────────

  describe('GET /students', () => {
    it('200 - admin lấy danh sách sinh viên (paginated)', async () => {
      const res = await request(app.getHttpServer())
        .get('/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('200 - staff lấy được danh sách', async () => {
      const res = await request(app.getHttpServer())
        .get('/students')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
    });

    it('403 - student không truy cập được', async () => {
      const res = await request(app.getHttpServer())
        .get('/students')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('401 - không có token', async () => {
      const res = await request(app.getHttpServer()).get('/students');
      expect(res.status).toBe(401);
    });

    it('200 - tìm kiếm theo MSSV trả về đúng sinh viên', async () => {
      const res = await request(app.getHttpServer())
        .get(`/students?search=${STUDENT_CODE}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── GET /students/:id ───────────────────────────────────────────────────────

  describe('GET /students/:id', () => {
    it('200 - lấy chi tiết sinh viên theo id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/students/${seeds.studentUser.studentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(seeds.studentUser.studentId);
    });

    it('404 - sinh viên không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .get('/students/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── GET /students/code/:studentCode ─────────────────────────────────────────

  describe('GET /students/code/:studentCode', () => {
    it('200 - tìm sinh viên theo MSSV', async () => {
      const res = await request(app.getHttpServer())
        .get(`/students/code/${STUDENT_CODE}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.studentCode).toBe(STUDENT_CODE);
    });

    it('404 - MSSV không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .get('/students/code/99999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /students ──────────────────────────────────────────────────────────

  describe('POST /students', () => {
    let createdStudentId: number;

    it('201 - admin tạo sinh viên mới thành công (kèm tạo user)', async () => {
      const res = await request(app.getHttpServer())
        .post('/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentCode: NEW_STUDENT_CODE,
          fullName: 'Nguyễn Tạo Mới',
          email: NEW_STUDENT_EMAIL,
          phone: '0912345678',
          gender: 'MALE',
          dateOfBirth: '2003-05-15',
          major: 'IT-E6',
          classCode: 'IT01-K66',
          admissionYear: 2024,
        });

      expect(res.status).toBe(201);
      expect(res.body.studentCode).toBe(NEW_STUDENT_CODE);
      createdStudentId = res.body.id;
    });

    it('409 - MSSV đã tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .post('/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentCode: NEW_STUDENT_CODE,
          fullName: 'Trùng MSSV',
          email: 'trungmssv@sis.hust.edu.vn',
          phone: '0912345679',
          gender: 'MALE',
          dateOfBirth: '2003-05-15',
          major: 'IT-E6',
          classCode: 'IT01-K66',
          admissionYear: 2024,
        });

      expect(res.status).toBe(409);
    });

    it('400 - thiếu fullName', async () => {
      const res = await request(app.getHttpServer())
        .post('/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentCode: '20240099',
          email: 'sv20240099@sis.hust.edu.vn',
          phone: '0912345679',
          gender: 'MALE',
          dateOfBirth: '2003-05-15',
          major: 'IT-E6',
          classCode: 'IT01-K66',
          admissionYear: 2024,
        });

      expect(res.status).toBe(400);
    });

    it('400 - studentCode quá ngắn (dưới 8 ký tự)', async () => {
      const res = await request(app.getHttpServer())
        .post('/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentCode: '2024',
          fullName: 'Test Ngắn',
          email: 'sv2024@sis.hust.edu.vn',
          phone: '0912345679',
          gender: 'MALE',
          dateOfBirth: '2003-05-15',
          major: 'IT-E6',
          classCode: 'IT01-K66',
          admissionYear: 2024,
        });

      expect(res.status).toBe(400);
    });

    it('403 - student không tạo được sinh viên', async () => {
      const res = await request(app.getHttpServer())
        .post('/students')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentCode: '20240050',
          fullName: 'Test',
          email: 'sv20240050@sis.hust.edu.vn',
          phone: '0912345679',
          gender: 'MALE',
          dateOfBirth: '2003-05-15',
          major: 'IT-E6',
          classCode: 'IT01-K66',
          admissionYear: 2024,
        });

      expect(res.status).toBe(403);
    });

    // ─── PUT /students/:id ────────────────────────────────────────────────────

    describe('PUT /students/:id', () => {
      it('200 - admin cập nhật thông tin sinh viên', async () => {
        const res = await request(app.getHttpServer())
          .put(`/students/${createdStudentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ fullName: 'Nguyễn Đã Cập Nhật', phone: '0999888777' });

        expect(res.status).toBe(200);
        expect(res.body.fullName).toBe('Nguyễn Đã Cập Nhật');
      });

      it('404 - sinh viên không tồn tại', async () => {
        const res = await request(app.getHttpServer())
          .put('/students/999999')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ fullName: 'Test' });

        expect(res.status).toBe(404);
      });

      it('403 - student không cập nhật được', async () => {
        const res = await request(app.getHttpServer())
          .put(`/students/${createdStudentId}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ fullName: 'Bị cấm' });

        expect(res.status).toBe(403);
      });
    });

    // ─── DELETE /students/:id ──────────────────────────────────────────────────

    describe('DELETE /students/:id', () => {
      it('200 - admin xóa sinh viên không có contract', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/students/${createdStudentId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 204]).toContain(res.status);
      });

      it('403 - student không xóa được', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/students/${seeds.studentUser.studentId}`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(403);
      });
    });
  });
});

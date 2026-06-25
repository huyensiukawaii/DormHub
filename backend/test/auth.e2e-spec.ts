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

describe('Auth (integration)', () => {
  let app: INestApplication;
  let seeds: TestSeeds;

  beforeAll(async () => {
    seeds = await seedBase();
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
    await disconnectDb();
  });

  // ─── POST /auth/login ────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('201 - admin đăng nhập thành công, nhận được accessToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seeds.adminUser.email, password: TEST_PASSWORD });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.role).toBe('ADMIN');
      expect(res.body.user.email).toBe(seeds.adminUser.email);
    });

    it('201 - sinh viên đăng nhập thành công, role là STUDENT', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seeds.studentUser.email, password: TEST_PASSWORD });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('STUDENT');
    });

    it('401 - mật khẩu sai', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seeds.adminUser.email, password: 'wrong_password' });

      expect(res.status).toBe(401);
    });

    it('401 - email không tồn tại trong hệ thống', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'khongtontai@test.com', password: TEST_PASSWORD });

      expect(res.status).toBe(401);
    });

    it('401 - tài khoản bị vô hiệu hóa (isActive=false)', async () => {
      await testPrisma.user.update({
        where: { id: seeds.adminUser.id },
        data: { isActive: false },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seeds.adminUser.email, password: TEST_PASSWORD });

      expect(res.status).toBe(401);

      // Khôi phục lại để các test sau dùng được
      await testPrisma.user.update({
        where: { id: seeds.adminUser.id },
        data: { isActive: true },
      });
    });

    it('400 - thiếu trường email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: TEST_PASSWORD });

      expect(res.status).toBe(400);
    });

    it('400 - mật khẩu ít hơn 6 ký tự', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seeds.adminUser.email, password: '123' });

      expect(res.status).toBe(400);
    });

    it('400 - email không đúng định dạng', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: TEST_PASSWORD });

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /auth/me ────────────────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    let adminToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seeds.adminUser.email, password: TEST_PASSWORD });
      adminToken = res.body.accessToken;
    });

    it('200 - trả về thông tin đúng của admin đang đăng nhập', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(seeds.adminUser.email);
      expect(res.body.role).toBe('ADMIN');
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('401 - không có Authorization header', async () => {
      const res = await request(app.getHttpServer()).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('401 - token không hợp lệ (chuỗi bất kỳ)', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer this.is.invalid');
      expect(res.status).toBe(401);
    });
  });

  // ─── POST /auth/register ─────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    afterAll(async () => {
      const user = await testPrisma.user.findUnique({
        where: { email: 'sv20230001@sis.hust.edu.vn' },
        include: { student: true },
      });
      if (user?.student) await testPrisma.student.delete({ where: { id: user.student.id } });
      if (user) await testPrisma.user.delete({ where: { id: user.id } });
    });

    it('201 - đăng ký tài khoản sinh viên mới thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'sv20230001@sis.hust.edu.vn',
          password: TEST_PASSWORD,
          fullName: 'Nguyễn Đăng Ký',
          studentCode: '20230001',
          majorCode: 'ET-E10',
          gender: 'MALE',
        });

      expect(res.status).toBe(201);
    });

    it('409 - email đã tồn tại trong hệ thống', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: seeds.studentUser.email,
          password: TEST_PASSWORD,
          fullName: 'Trùng Email',
          studentCode: '20220099',
          majorCode: 'ET-E10',
          gender: 'MALE',
        });

      expect(res.status).toBe(409);
    });

    it('400 - email không đúng đuôi @sis.hust.edu.vn', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'sv@gmail.com',
          password: TEST_PASSWORD,
          fullName: 'Test',
          studentCode: '20230002',
          majorCode: 'ET-E10',
          gender: 'MALE',
        });

      expect(res.status).toBe(400);
    });

    it('400 - thiếu fullName', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'sv20230003@sis.hust.edu.vn',
          password: TEST_PASSWORD,
          studentCode: '20230003',
          majorCode: 'ET-E10',
          gender: 'MALE',
        });

      expect(res.status).toBe(400);
    });

    it('400 - gender không hợp lệ', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'sv20230004@sis.hust.edu.vn',
          password: TEST_PASSWORD,
          fullName: 'Test Gender',
          studentCode: '20230004',
          majorCode: 'ET-E10',
          gender: 'UNKNOWN',
        });

      expect(res.status).toBe(400);
    });
  });
});

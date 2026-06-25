// Chạy trước mỗi test file — đặt biến môi trường cho NestJS/Prisma
process.env.DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5433/dormhub_test';
process.env.JWT_SECRET = 'test-jwt-secret-dormhub-integration';
process.env.JWT_EXPIRES_IN = '1d';
process.env.PORT = '3099';
process.env.DEFAULT_LANGUAGE = 'vi';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.RESET_PASSWORD_TTL_MINUTES = '15';
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
process.env.CLOUDINARY_URL = '';
process.env.GROQ_API_KEY = 'test-key-not-used';

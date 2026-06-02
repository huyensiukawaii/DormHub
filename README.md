# DormHub

Hệ thống quản lý ký túc xá sinh viên — Backend NestJS + Frontend Next.js + PostgreSQL.

---

## Yêu cầu

- [Node.js](https://nodejs.org/) >= 20
- npm

---

## Cài đặt

### 1. Clone dự án

```bash
git clone <repo-url>
cd DormHub
```

### 2. Cài đặt Backend

```bash
cd backend
npm install
```

Tạo file `.env` trong thư mục `backend/`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dormhub_db"

JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

PORT=3001
DEFAULT_LANGUAGE="vi"

FRONTEND_URL="http://localhost:3000"
CORS_ORIGIN="http://localhost:3000,http://localhost:3001"

RESET_PASSWORD_TTL_MINUTES=15

SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

Chạy migration và seed dữ liệu mẫu:

```bash
npx prisma migrate deploy
npx prisma db seed
```

Khởi động backend:

```bash
npm run start:dev
```

Backend chạy tại: `http://localhost:3001`  
Swagger API docs: `http://localhost:3001/api`

---

### 3. Cài đặt Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend chạy tại: `http://localhost:3000`

---

## Tài khoản mặc định sau seed

| Vai trò | Email | Mật khẩu |
|---------|-------|-----------|
| Admin | admin@dormhub.com | `Admin@123` |
| Staff | staff@dormhub.com | `Staff@123` |
| Student | student@dormhub.com | `Student@123` |

> Kiểm tra file `backend/prisma/seed.ts` để xem danh sách đầy đủ.

---

## Cấu trúc dự án

```
DormHub/
├── backend/          # NestJS API
│   ├── prisma/       # Schema & migrations
│   └── src/          # Source code
├── frontend/         # Next.js app
└── docker-compose.dev.yml
```

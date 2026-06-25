import { execSync } from 'child_process';
import { Client } from 'pg';
import * as path from 'path';

const TEST_DB_URL = 'postgresql://postgres:postgres@localhost:5433/dormhub_test';

export default async function globalSetup() {
  const rootDir = path.join(__dirname, '..');

  // Drop và recreate DB qua pg client trực tiếp
  // (tránh dùng prisma migrate reset bị block bởi Prisma AI safety check)
  const adminClient = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
  });

  await adminClient.connect();
  // Terminate existing connections trước khi drop
  await adminClient.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = 'dormhub_test' AND pid <> pg_backend_pid()
  `);
  await adminClient.query('DROP DATABASE IF EXISTS dormhub_test');
  await adminClient.query('CREATE DATABASE dormhub_test');
  await adminClient.end();

  // Push schema trực tiếp vào DB sạch — tránh vấn đề migration 7 có COMMIT;BEGIN;
  // prisma db push đồng bộ schema hiện tại mà không cần migration history
  execSync('npx prisma db push --accept-data-loss', {
    cwd: rootDir,
    env: {
      ...process.env,
      DATABASE_URL: TEST_DB_URL,
    },
    stdio: 'inherit',
  });
}

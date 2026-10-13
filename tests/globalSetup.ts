import { execSync } from 'node:child_process';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://chatuser:chatpass@localhost:5432/chatdb_test?schema=public';

/**
 * Runs before the whole test run: applies migrations to the isolated test
 * database so integration tests start from a known schema.
 */
export default function globalSetup(): void {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}

import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.DATABASE_URL || '';
if (url.includes('neon.tech')) {
  console.log('[SUCCESS] Next.js environment resolves DATABASE_URL to Neon Database.');
} else {
  console.log(`[FAIL] DATABASE_URL resolved to unexpected value (contains: ${url.substring(0, 15)}...)`);
}

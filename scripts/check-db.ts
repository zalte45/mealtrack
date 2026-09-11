import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

async function checkConnection(urlEnvVar: string) {
  const url = process.env[urlEnvVar];
  if (!url) {
    console.error(`[FAIL] ${urlEnvVar} is not defined in .env`);
    return false;
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url,
      },
    },
  });

  try {
    await prisma.$queryRawUnsafe('SELECT 1 as result;');
    console.log(`[SUCCESS] Connected to ${urlEnvVar}`);
    return true;
  } catch (error: any) {
    console.error(`[FAIL] Connection failed for ${urlEnvVar}`);
    console.error(error.message.replace(url, '<REDACTED_URL>'));
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('Testing connectivity...');
  const poolSuccess = await checkConnection('DATABASE_URL');
  const directSuccess = await checkConnection('DIRECT_URL');
  
  if (!poolSuccess || !directSuccess) {
    process.exit(1);
  }
}

main();

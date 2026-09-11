import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    const result: any[] = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '\\_%'
    `);
    
    const tables = result.map((r: any) => r.table_name);
    console.log('[SUCCESS] Found tables:', tables.sort().join(', '));
  } catch (e: any) {
    console.error('[FAIL]', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

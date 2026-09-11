import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      include: {
        provider: true,
      }
    });

    console.log("Users in DB:");
    for (const user of users) {
      console.log(`- ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Status: ${user.status}`);
      console.log(`  Provider ID: ${user.providerId}`);
      console.log(`  Provider Name: ${user.provider.name}`);
      console.log(`  Provider Status: ${user.provider.status}`);
      console.log(`  Has PasswordHash: ${!!user.passwordHash}`);
    }
  } catch (err: any) {
    console.error("Error fetching users:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

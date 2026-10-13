import { prisma } from '../../src/infrastructure/database/prisma.js';

export async function resetDatabase(): Promise<void> {
  await prisma.message.deleteMany();
  await prisma.user.deleteMany();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

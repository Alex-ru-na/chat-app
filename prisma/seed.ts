import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const DEV_PASSWORD = 'password123';

async function upsertUser(name: string, email: string, passwordHash: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash },
  });
}

async function main(): Promise<void> {
  const passwordHash = await argon2.hash(DEV_PASSWORD, {
    type: argon2.argon2id,
  });

  const alice = await upsertUser('Alice', 'alice@example.com', passwordHash);
  const bob = await upsertUser('Bob', 'bob@example.com', passwordHash);

  const existing = await prisma.message.count({
    where: {
      OR: [
        { senderId: alice.id, recipientId: bob.id },
        { senderId: bob.id, recipientId: alice.id },
      ],
    },
  });

  if (existing === 0) {
    await prisma.message.createMany({
      data: [
        { senderId: alice.id, recipientId: bob.id, content: 'Hi Bob!' },
        { senderId: bob.id, recipientId: alice.id, content: 'Hey Alice!' },
        { senderId: alice.id, recipientId: bob.id, content: 'How are you?' },
      ],
    });
  }

  console.log('Seed complete.');
  console.log(`  alice@example.com / ${DEV_PASSWORD} (id: ${alice.id})`);
  console.log(`  bob@example.com   / ${DEV_PASSWORD} (id: ${bob.id})`);
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

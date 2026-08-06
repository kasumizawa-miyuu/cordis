import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Create test users
  const passwordHash = await bcrypt.hash("password123", 12);

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      passwordHash,
      nickname: "Alice",
      isEmailVerified: true,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      passwordHash,
      nickname: "Bob",
      isEmailVerified: true,
    },
  });

  // Create a public room
  const room = await prisma.room.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "General Chat",
      description: "Welcome to the Cordis general chat room!",
      ownerId: alice.id,
      maxMembers: 50,
      isPublic: true,
      requireReady: false,
      tags: ["general", "chat"],
    },
  });

  // Add Bob as a member of the room
  await prisma.roomMember.upsert({
    where: {
      roomId_userId: {
        roomId: room.id,
        userId: bob.id,
      },
    },
    update: {},
    create: {
      roomId: room.id,
      userId: bob.id,
      role: "MEMBER",
    },
  });

  console.log("Seed data created:");
  console.log(`  Alice: ${alice.id}`);
  console.log(`  Bob: ${bob.id}`);
  console.log(`  Room: ${room.id} (${room.name})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import "dotenv/config";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.resource.count();
  if (existing === 0) {
    await prisma.resource.create({
      data: {
        name: "Meeting Room A",
        type: "MEETING_ROOM",
        capacity: 4,
        status: "ACTIVE",
      },
    });
    console.log("Seeded resource: Meeting Room A");
  } else {
    console.log("Resources already seeded, skipping.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
import "dotenv/config";
import { db } from "@/lib/db";
import { resources } from "@/lib/db/schema";

async function main() {
  const existing = db.select().from(resources).get();
  if (!existing) {
    await db.insert(resources).values({
      name: "Meeting Room A",
      type: "MEETING_ROOM",
      capacity: 4,
      status: "ACTIVE",
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
    (db.$client as import("better-sqlite3").Database).close();
  });
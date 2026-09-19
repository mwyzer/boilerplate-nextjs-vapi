import "dotenv/config";
import { createBooking, listBookings } from "./lib/booking";
import { prisma } from "./lib/prisma";

async function main() {
  console.log("DATABASE_URL =", process.env.DATABASE_URL ?? "(unset)");
  const resources = await prisma.resource.findMany();
  console.log("resources:", resources.length);
  const before = await listBookings();
  console.log("bookings before:", before.length);

  const booking = await createBooking({
    name: "DB Check Direct",
    date: "2026-10-05",
    startTime: "14:00",
    duration: 1,
  });
  console.log("created:", booking.bookingId);

  const after = await listBookings();
  console.log("bookings after:", after.length);
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
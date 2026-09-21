import { customType, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { BookingStatus } from "@/lib/types";

const isoDatetime = customType<{ data: Date; driverData: string }>({
  dataType() {
    return "text";
  },
  toDriver(value: Date): string {
    return value.toISOString();
  },
  fromDriver(value: string): Date {
    return new Date(value);
  },
});

export const resources = sqliteTable("Resource", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull().default("MEETING_ROOM"),
  capacity: integer("capacity").notNull().default(4),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: isoDatetime("createdAt").notNull().$defaultFn(() => new Date()),
  updatedAt: isoDatetime("updatedAt").notNull().$defaultFn(() => new Date()),
});

export const bookings = sqliteTable(
  "Booking",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    bookingId: text("bookingId").notNull().unique(),
    name: text("name").notNull(),
    resourceId: integer("resourceId")
      .notNull()
      .references(() => resources.id, { onDelete: "restrict", onUpdate: "cascade" }),
    date: text("date").notNull(),
    startTime: text("startTime").notNull(),
    duration: integer("duration").notNull(),
    start: isoDatetime("start").notNull(),
    end: isoDatetime("end").notNull(),
    status: text("status").$type<BookingStatus>().notNull().default("PENDING"),
    createdAt: isoDatetime("createdAt").notNull().$defaultFn(() => new Date()),
    updatedAt: isoDatetime("updatedAt").notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index("Booking_resourceId_status_idx").on(table.resourceId, table.status),
    index("Booking_resourceId_start_end_idx").on(
      table.resourceId,
      table.start,
      table.end,
    ),
  ],
);

export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
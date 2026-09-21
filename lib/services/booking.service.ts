import { and, count, desc, eq, gt, lt, not } from "drizzle-orm";
import { bookings, resources, type Booking, type Resource } from "@/lib/db/schema";
import type { Db } from "@/lib/db";
import type {
  ApiBooking,
  AvailabilityInput,
  AvailabilityResult,
  BookingInput,
} from "@/lib/types";

export type {
  ApiBooking,
  AvailabilityInput,
  AvailabilityResult,
  BookingInput,
} from "@/lib/types";

export const MIN_DURATION_HOURS = 0.5;
export const MAX_DURATION_HOURS = 8;
export const SLOT_GRANULARITY_MINUTES = 30;

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

type BookingWithResource = Booking & {
  resource?: Resource;
};

// ---------------------------------------------------------------------------
// Parsing & validation
// ---------------------------------------------------------------------------

export function parseDateInput(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError("Tanggal tidak valid.", "INVALID_DATE");
  }
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    throw new ValidationError("Tanggal tidak valid.", "INVALID_DATE");
  }
  return value;
}

export function parseTimeInput(value: unknown): string {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new ValidationError("Waktu tidak valid.", "INVALID_TIME");
  }
  return value;
}

export function parseDurationInput(value: unknown): number {
  const hours = Number(value);
  if (!Number.isFinite(hours)) {
    throw new ValidationError("Durasi tidak valid.", "INVALID_DURATION");
  }
  const minutes = Math.round(hours * 60);
  if (minutes < MIN_DURATION_HOURS * 60 || minutes > MAX_DURATION_HOURS * 60) {
    throw new ValidationError(
      `Durasi harus antara ${MIN_DURATION_HOURS} dan ${MAX_DURATION_HOURS} jam.`,
      "INVALID_DURATION",
    );
  }
  if (minutes % SLOT_GRANULARITY_MINUTES !== 0) {
    throw new ValidationError(
      `Durasi harus kelipatan ${SLOT_GRANULARITY_MINUTES} menit.`,
      "INVALID_DURATION",
    );
  }
  return minutes / 60;
}

export function parseBookingInput(body: unknown): BookingInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Payload tidak valid.", "INVALID_PAYLOAD");
  }
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) {
    throw new ValidationError("Nama wajib diisi.", "MISSING_NAME");
  }

  const date = parseDateInput(b.date);
  const startTime = parseTimeInput(b.startTime);
  const duration = parseDurationInput(b.duration);
  const resourceId = b.resourceId === undefined ? undefined : Number(b.resourceId);

  return { name, date, startTime, duration, resourceId };
}

// ---------------------------------------------------------------------------
// Date / time helpers
// ---------------------------------------------------------------------------

export function schemaToStartEnd(input: {
  date: string;
  startTime: string;
  duration: number;
}): { start: Date; end: Date; durationMinutes: number } {
  const [y, m, d] = input.date.split("-").map(Number);
  const [hh, mm] = input.startTime.split(":").map(Number);
  const start = new Date(y, m - 1, d, hh, mm, 0, 0);
  const durationMinutes = Math.round(input.duration * 60);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return { start, end, durationMinutes };
}

export function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function formatEndTime(startTime: string, durationHours: number): string {
  const [hh, mm] = startTime.split(":").map(Number);
  const start = new Date(2000, 0, 1, hh, mm);
  const end = new Date(start.getTime() + Math.round(durationHours * 60) * 60_000);
  return formatTime(end);
}

export function formatLongDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function toApiBooking(booking: BookingWithResource): ApiBooking {
  return {
    id: booking.id,
    bookingId: booking.bookingId,
    name: booking.name,
    resourceId: booking.resourceId,
    resource: booking.resource
      ? {
          id: booking.resource.id,
          name: booking.resource.name,
          type: booking.resource.type,
          capacity: booking.resource.capacity,
        }
      : undefined,
    date: booking.date,
    startTime: booking.startTime,
    endTime: formatEndTime(booking.startTime, booking.duration / 60),
    duration: booking.duration / 60,
    status: booking.status,
    createdAt: booking.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// BookingService
// ---------------------------------------------------------------------------

export class BookingService {
  constructor(private readonly db: Db) {}

  listResources(): Resource[] {
    return this.db.select().from(resources).orderBy(resources.id).all();
  }

  async getDefaultResource(): Promise<Resource> {
    const resource = this.db
      .select()
      .from(resources)
      .where(eq(resources.status, "ACTIVE"))
      .orderBy(resources.id)
      .limit(1)
      .get();
    if (!resource) {
      throw new ValidationError("Tidak ada resource yang tersedia.", "NO_RESOURCE");
    }
    return resource;
  }

  private findConflictingBookings(
    resourceId: number,
    start: Date,
    end: Date,
    excludeBookingId?: number,
  ): Booking[] {
    return this.db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.resourceId, resourceId),
          eq(bookings.status, "CONFIRMED"),
          lt(bookings.start, end),
          gt(bookings.end, start),
          excludeBookingId ? not(eq(bookings.id, excludeBookingId)) : undefined,
        ),
      )
      .all();
  }

  async checkAvailability(input: AvailabilityInput): Promise<AvailabilityResult> {
    const date = parseDateInput(input.date);
    const startTime = parseTimeInput(input.startTime);
    const duration = parseDurationInput(input.duration);

    const resource = await this.getDefaultResource();
    const { start, end } = schemaToStartEnd({ date, startTime, duration });

    if (start.getTime() <= Date.now()) {
      throw new ValidationError(
        "Booking tidak boleh dibuat pada waktu yang sudah lewat.",
        "PAST_BOOKING",
      );
    }

    const conflicts = this.findConflictingBookings(resource.id, start, end);

    if (conflicts.length === 0) {
      return {
        available: true,
        resourceId: resource.id,
        resourceName: resource.name,
        date,
        startTime,
        endTime: formatEndTime(startTime, duration),
        duration,
      };
    }

    const alternativeTimes: string[] = [];
    for (let offset = 1; offset <= 10 && alternativeTimes.length < 3; offset++) {
      const altStart = new Date(start.getTime() + offset * 60 * 60_000);
      if (altStart.getTime() <= Date.now()) continue;
      const altEnd = new Date(altStart.getTime() + (end.getTime() - start.getTime()));
      const altConflicts = this.findConflictingBookings(resource.id, altStart, altEnd);
      if (altConflicts.length === 0) {
        alternativeTimes.push(formatTime(altStart));
      }
    }

    return { available: false, conflictCount: conflicts.length, alternativeTimes };
  }

  async generateBookingId(): Promise<string> {
    const { value: total } =
      this.db.select({ value: count() }).from(bookings).get() ?? { value: 0 };
    return `BK-${String(total + 1).padStart(6, "0")}`;
  }

  async createBooking(input: BookingInput): Promise<ApiBooking> {
    const { name, date, startTime, duration, resourceId } = parseBookingInput(input);

    let resource: Resource | null;
    if (resourceId !== undefined) {
      resource =
        this.db.select().from(resources).where(eq(resources.id, resourceId)).get() ??
        null;
      if (!resource) {
        throw new ValidationError("Resource tidak ditemukan.", "NO_RESOURCE");
      }
    } else {
      resource = await this.getDefaultResource();
    }
    if (resource.status !== "ACTIVE") {
      throw new ValidationError("Resource sedang tidak aktif.", "NO_RESOURCE");
    }

    const { start, end } = schemaToStartEnd({ date, startTime, duration });

    if (start.getTime() <= Date.now()) {
      throw new ValidationError(
        "Booking tidak boleh dibuat pada waktu yang sudah lewat.",
        "PAST_BOOKING",
      );
    }

    const conflicts = this.findConflictingBookings(resource.id, start, end);
    if (conflicts.length > 0) {
      throw new ValidationError("Slot tersebut sudah dibooking.", "SLOT_BOOKED");
    }

    const bookingId = await this.generateBookingId();

    const booking = this.db
      .insert(bookings)
      .values({
        bookingId,
        name,
        resourceId: resource.id,
        date,
        startTime,
        duration: Math.round(duration * 60),
        start,
        end,
        status: "CONFIRMED",
      })
      .returning()
      .get();

    return toApiBooking({ ...booking, resource });
  }

  listBookings(): ApiBooking[] {
    const rows = this.db
      .select()
      .from(bookings)
      .innerJoin(resources, eq(bookings.resourceId, resources.id))
      .orderBy(desc(bookings.start))
      .all();
    return rows.map((row) =>
      toApiBooking({ ...row.Booking, resource: row.Resource }),
    );
  }

  getBookingById(id: number): ApiBooking | null {
    const row = this.db
      .select()
      .from(bookings)
      .innerJoin(resources, eq(bookings.resourceId, resources.id))
      .where(eq(bookings.id, id))
      .get();
    return row ? toApiBooking({ ...row.Booking, resource: row.Resource }) : null;
  }

  getBookingByBookingId(bookingId: string): ApiBooking | null {
    const row = this.db
      .select()
      .from(bookings)
      .innerJoin(resources, eq(bookings.resourceId, resources.id))
      .where(eq(bookings.bookingId, bookingId))
      .get();
    return row ? toApiBooking({ ...row.Booking, resource: row.Resource }) : null;
  }

  cancelBooking(id: number): ApiBooking | null {
    const existing = this.db.select().from(bookings).where(eq(bookings.id, id)).get();
    if (!existing) return null;
    if (existing.status === "CANCELLED") {
      return toApiBooking(existing);
    }
    const updated = this.db
      .update(bookings)
      .set({
        status: "CANCELLED",
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning()
      .get();
    const resource =
      this.db
        .select()
        .from(resources)
        .where(eq(resources.id, updated.resourceId))
        .get() ?? undefined;
    return toApiBooking({ ...updated, resource });
  }
}
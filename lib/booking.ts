import {
  BookingStatus,
  type Booking as BookingRecord,
  type Resource as ResourceRecord,
} from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
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

type BookingWithResource = BookingRecord & {
  resource?: ResourceRecord;
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

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export async function getDefaultResource(): Promise<ResourceRecord> {
  const resource = await prisma.resource.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { id: "asc" },
  });
  if (!resource) {
    throw new ValidationError("Tidak ada resource yang tersedia.", "NO_RESOURCE");
  }
  return resource;
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

async function findConflictingBookings(
  resourceId: number,
  start: Date,
  end: Date,
  excludeBookingId?: number,
): Promise<BookingRecord[]> {
  return prisma.booking.findMany({
    where: {
      resourceId,
      status: BookingStatus.CONFIRMED,
      ...(excludeBookingId ? { NOT: { id: excludeBookingId } } : {}),
      start: { lt: end },
      end: { gt: start },
    },
  });
}

export async function checkAvailability(input: AvailabilityInput): Promise<AvailabilityResult> {
  const date = parseDateInput(input.date);
  const startTime = parseTimeInput(input.startTime);
  const duration = parseDurationInput(input.duration);

  const resource = await getDefaultResource();
  const { start, end } = schemaToStartEnd({ date, startTime, duration });

  if (start.getTime() <= Date.now()) {
    throw new ValidationError(
      "Booking tidak boleh dibuat pada waktu yang sudah lewat.",
      "PAST_BOOKING",
    );
  }

  const conflicts = await findConflictingBookings(resource.id, start, end);

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
    const altConflicts = await findConflictingBookings(resource.id, altStart, altEnd);
    if (altConflicts.length === 0) {
      alternativeTimes.push(formatTime(altStart));
    }
  }

  return { available: false, conflictCount: conflicts.length, alternativeTimes };
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export async function generateBookingId(): Promise<string> {
  const count = await prisma.booking.count();
  return `BK-${String(count + 1).padStart(6, "0")}`;
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

export async function createBooking(input: BookingInput): Promise<ApiBooking> {
  const { name, date, startTime, duration, resourceId } = parseBookingInput(input);

  let resource: ResourceRecord | null;
  if (resourceId !== undefined) {
    resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) {
      throw new ValidationError("Resource tidak ditemukan.", "NO_RESOURCE");
    }
  } else {
    resource = await getDefaultResource();
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

  const conflicts = await findConflictingBookings(resource.id, start, end);
  if (conflicts.length > 0) {
    throw new ValidationError("Slot tersebut sudah dibooking.", "SLOT_BOOKED");
  }

  const bookingId = await generateBookingId();

  const booking = await prisma.booking.create({
    data: {
      bookingId,
      name,
      resourceId: resource.id,
      date,
      startTime,
      duration: Math.round(duration * 60),
      start,
      end,
      status: BookingStatus.CONFIRMED,
    },
    include: { resource: true },
  });

  return toApiBooking(booking);
}

export async function listBookings(): Promise<ApiBooking[]> {
  const bookings = await prisma.booking.findMany({
    include: { resource: true },
    orderBy: { start: "desc" },
  });
  return bookings.map(toApiBooking);
}

export async function getBookingById(id: number): Promise<ApiBooking | null> {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { resource: true },
  });
  return booking ? toApiBooking(booking) : null;
}

export async function getBookingByBookingId(
  bookingId: string,
): Promise<ApiBooking | null> {
  const booking = await prisma.booking.findUnique({
    where: { bookingId },
    include: { resource: true },
  });
  return booking ? toApiBooking(booking) : null;
}

export async function cancelBooking(id: number): Promise<ApiBooking | null> {
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) return null;
  if (existing.status === BookingStatus.CANCELLED) {
    return toApiBooking(existing);
  }
  const booking = await prisma.booking.update({
    where: { id },
    data: {
      status: BookingStatus.CANCELLED,
      updatedAt: new Date(),
    },
    include: { resource: true },
  });
  return toApiBooking(booking);
}
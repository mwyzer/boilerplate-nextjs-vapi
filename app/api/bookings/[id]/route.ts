import { NextResponse } from "next/server";
import { BookingStatus } from "@/app/generated/prisma/client";
import {
  cancelBooking,
  getBookingByBookingId,
  getBookingById,
  ValidationError,
} from "@/lib/booking";
import { errorResponse } from "@/lib/http";

async function resolveBookingId(identifier: string): Promise<number | null> {
  if (/^\d+$/.test(identifier)) {
    return Number(identifier);
  }
  const booking = await getBookingByBookingId(identifier);
  return booking ? booking.id : null;
}

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/bookings/[id]">,
): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const bookingId = await resolveBookingId(id);
    if (bookingId === null) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan." } }, { status: 404 });
    }
    const booking = await getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan." } }, { status: 404 });
    }
    return NextResponse.json({ booking });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/bookings/[id]">,
): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const status = (body as { status?: string } | null)?.status;

    if (status !== BookingStatus.CANCELLED) {
      throw new ValidationError("Status yang diizinkan hanya CANCELLED.", "INVALID_STATUS");
    }

    const bookingId = await resolveBookingId(id);
    if (bookingId === null) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan." } }, { status: 404 });
    }

    const booking = await cancelBooking(bookingId);
    if (!booking) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan." } }, { status: 404 });
    }
    return NextResponse.json({ booking });
  } catch (error) {
    return errorResponse(error);
  }
}
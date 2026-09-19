import { NextResponse } from "next/server";
import { createBooking, listBookings } from "@/lib/booking";
import { errorResponse } from "@/lib/http";

export async function GET(): Promise<NextResponse> {
  try {
    const bookings = await listBookings();
    return NextResponse.json({ bookings });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => null);
    const booking = await createBooking(body);
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
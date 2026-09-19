import { NextResponse } from "next/server";
import { checkAvailability, type AvailabilityInput } from "@/lib/booking";
import { errorResponse } from "@/lib/http";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => null);
    const result = await checkAvailability((body ?? {}) as AvailabilityInput);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
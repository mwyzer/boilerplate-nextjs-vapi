import { NextResponse } from "next/server";
import type {
  ClientMessageToolCalls,
  FunctionToolWithToolCall,
} from "@vapi-ai/web/dist/api";
import {
  cancelBooking,
  checkAvailability,
  createBooking,
  getBookingByBookingId,
} from "@/lib/booking";

type ToolCallArgs = Record<string, unknown>;

function parseToolCallArgs(
  toolWithToolCall: FunctionToolWithToolCall,
): { name: string; args: ToolCallArgs } {
  const name =
    toolWithToolCall.function?.name ?? toolWithToolCall.toolCall.function.name;
  const rawArgs = toolWithToolCall.toolCall.function.arguments;
  const args: ToolCallArgs = rawArgs
    ? (JSON.parse(rawArgs) as ToolCallArgs)
    : {};
  return { name, args };
}

async function dispatchTool(name: string, args: ToolCallArgs): Promise<string> {
  switch (name) {
    case "check_availability":
      return JSON.stringify(
        await checkAvailability({
          date: String(args.date ?? ""),
          startTime: String(args.startTime ?? ""),
          duration: Number(args.duration),
        }),
      );
    case "create_booking":
      return JSON.stringify(
        await createBooking({
          name: String(args.name ?? "").trim(),
          date: String(args.date ?? ""),
          startTime: String(args.startTime ?? ""),
          duration: Number(args.duration),
        }),
      );
    case "cancel_booking": {
      const bookingId = String(args.bookingId ?? "").trim();
      const existing = /^\d+$/.test(bookingId)
        ? { id: Number(bookingId) }
        : await getBookingByBookingId(bookingId);
      if (!existing) {
        throw new Error("Booking tidak ditemukan.");
      }
      const booking = await cancelBooking(existing.id);
      return JSON.stringify({ booking });
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.VAPI_TOOL_SECRET;
  if (secret && request.headers.get("x-vapi-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      message?: ClientMessageToolCalls;
    } | null;
    const message = body?.message;
    const toolCalls = message?.toolWithToolCallList ?? message?.toolCallList ?? [];

    const results: { toolCallId: string; name: string; result?: string; error?: string }[] = [];
    for (const toolWithToolCall of toolCalls) {
      const functionCall = toolWithToolCall as FunctionToolWithToolCall;
      const { name, args } = parseToolCallArgs(functionCall);
      try {
        const result = await dispatchTool(name, args);
        results.push({
          toolCallId: functionCall.toolCall.id,
          name,
          result,
        });
      } catch (error) {
        results.push({
          toolCallId: functionCall.toolCall.id,
          name,
          error: error instanceof Error ? error.message : "Terjadi kesalahan.",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Vapi tools error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
import { NextResponse } from "next/server";
import type {
  ClientMessageToolCalls,
  FunctionToolWithToolCall,
  ToolCall,
  ToolCallFunction,
} from "@vapi-ai/web/dist/api";
import { bookingService } from "@/lib/booking";

type ToolCallArgs = Record<string, unknown>;

function parseToolCallArgs(
  toolWithToolCall: FunctionToolWithToolCall,
): { id: string; name: string; args: ToolCallArgs } {
  const tc = (toolWithToolCall.toolCall ??
    toolWithToolCall) as Partial<ToolCall>;
  const fn = (tc.function ??
    toolWithToolCall.function) as Partial<ToolCallFunction> | undefined;
  const rawArgs = fn?.arguments;
  const args: ToolCallArgs = rawArgs
    ? (JSON.parse(rawArgs) as ToolCallArgs)
    : {};
  return { id: tc.id ?? "", name: fn?.name ?? "", args };
}

async function dispatchTool(name: string, args: ToolCallArgs): Promise<string> {
  switch (name) {
    case "check_availability":
      return JSON.stringify(
        await bookingService.checkAvailability({
          date: String(args.date ?? ""),
          startTime: String(args.startTime ?? ""),
          duration: Number(args.duration),
        }),
      );
    case "create_booking":
      return JSON.stringify(
        await bookingService.createBooking({
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
        : await bookingService.getBookingByBookingId(bookingId);
      if (!existing) {
        throw new Error("Booking tidak ditemukan.");
      }
      const booking = await bookingService.cancelBooking(existing.id);
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
      try {
        const { id, name, args } = parseToolCallArgs(
          toolWithToolCall as FunctionToolWithToolCall,
        );
        const result = await dispatchTool(name, args);
        results.push({ toolCallId: id, name, result });
      } catch (error) {
        const id = (toolWithToolCall as { id?: string }).id ?? "";
        const name =
          (toolWithToolCall as { function?: { name?: string } }).function?.name ??
          "";
        results.push({
          toolCallId: id,
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
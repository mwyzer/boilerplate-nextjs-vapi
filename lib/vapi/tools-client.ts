import type { BookingInput } from "@/lib/types";

type ToolArgs = Record<string, unknown>;

function parseArgs(raw: unknown): ToolArgs {
  if (typeof raw === "object" && raw !== null) {
    return raw as ToolArgs;
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ToolArgs;
    } catch {
      // ignore, treated as empty
    }
  }
  return {};
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { error?: { message?: string } }).error?.message ??
      "Terjadi kesalahan. Silakan coba lagi.";
    throw new Error(message);
  }
  return data as T;
}

export async function executeBookingTool(
  toolName: string,
  rawArgs: unknown,
): Promise<string> {
  const args = parseArgs(rawArgs);

  switch (toolName) {
    case "check_availability": {
      const data = await request<Record<string, unknown>>(
        "/api/bookings/availability",
        {
          method: "POST",
          body: JSON.stringify({
            date: args.date,
            startTime: args.startTime,
            duration: Number(args.duration),
          }),
        },
      );
      return JSON.stringify(data);
    }
    case "create_booking": {
      const input: BookingInput = {
        name: String(args.name ?? "").trim(),
        date: String(args.date ?? ""),
        startTime: String(args.startTime ?? ""),
        duration: Number(args.duration),
      };
      const data = await request<{ booking: unknown }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return JSON.stringify(data);
    }
    case "cancel_booking": {
      const bookingId = String(args.bookingId ?? "").trim();
      if (!bookingId) {
        throw new Error("Kode booking tidak valid.");
      }
      const data = await request<{ booking: unknown }>(
        `/api/bookings/${encodeURIComponent(bookingId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "CANCELLED" }),
        },
      );
      return JSON.stringify(data);
    }
    default:
      throw new Error(`Tool tidak dikenal: ${toolName}`);
  }
}
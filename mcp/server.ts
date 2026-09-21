import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { bookingService } from "@/lib/booking";

const server = new McpServer({
  name: "booking-db",
  version: "0.1.0",
});

function resultText(data: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function errorText(error: unknown): CallToolResult {
  const message =
    error instanceof Error ? error.message : `Terjadi kesalahan: ${String(error)}`;
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

async function handle(
  run: () => Promise<unknown> | unknown,
): Promise<CallToolResult> {
  try {
    return resultText(await run());
  } catch (error) {
    return errorText(error);
  }
}

async function resolveBooking(bookingId: string) {
  return /^\d+$/.test(bookingId)
    ? await bookingService.getBookingById(Number(bookingId))
    : await bookingService.getBookingByBookingId(bookingId);
}

server.registerTool(
  "list_resources",
  {
    title: "List resources",
    description: "Menampilkan semua resource (ruangan) beserta statusnya.",
  },
  () => handle(() => bookingService.listResources()),
);

server.registerTool(
  "check_availability",
  {
    title: "Check availability",
    description:
      "Cek ketersediaan slot booking pada tanggal, waktu mulai (HH:mm), dan durasi (jam) tertentu.",
    inputSchema: {
      date: z.string().describe("Tanggal booking, format YYYY-MM-DD"),
      startTime: z.string().describe("Jam mulai, format HH:mm"),
      duration: z
        .number()
        .describe("Durasi dalam jam (0.5 - 8, kelipatan 0.5)"),
    },
  },
  (args) =>
    handle(() =>
      bookingService.checkAvailability({
        date: args.date,
        startTime: args.startTime,
        duration: args.duration,
      }),
    ),
);

server.registerTool(
  "list_bookings",
  {
    title: "List bookings",
    description:
      "Menampilkan daftar booking. Bisa difilter berdasarkan status dan/atau tanggal.",
    inputSchema: {
      status: z
        .enum(["PENDING", "CONFIRMED", "CANCELLED"])
        .optional()
        .describe("Filter berdasarkan status booking"),
      date: z.string().optional().describe("Filter berdasarkan tanggal, format YYYY-MM-DD"),
    },
  },
  (args) =>
    handle(async () => {
      const bookings = bookingService.listBookings();
      return bookings.filter(
        (b) =>
          (args.status === undefined || b.status === args.status) &&
          (args.date === undefined || b.date === args.date),
      );
    }),
);

server.registerTool(
  "get_booking",
  {
    title: "Get booking",
    description:
      "Mengambil detail booking berdasarkan bookingId (angka id atau kode seperti BK-000001).",
    inputSchema: {
      bookingId: z
        .string()
        .describe("Id booking (angka) atau bookingId (misal BK-000001)"),
    },
  },
  (args) =>
    handle(async () => {
      const booking = await resolveBooking(args.bookingId);
      if (!booking) return { error: "Booking tidak ditemukan." };
      return booking;
    }),
);

server.registerTool(
  "create_booking",
  {
    title: "Create booking",
    description:
      "Membuat booking baru. Memvalidasi slot (tidak boleh bentrok atau waktu lewat).",
    inputSchema: {
      name: z.string().describe("Nama pemesan / keperluan booking"),
      date: z.string().describe("Tanggal booking, format YYYY-MM-DD"),
      startTime: z.string().describe("Jam mulai, format HH:mm"),
      duration: z
        .number()
        .describe("Durasi dalam jam (0.5 - 8, kelipatan 0.5)"),
      resourceId: z
        .number()
        .optional()
        .describe("Id resource; default resource aktif pertama"),
    },
  },
  (args) =>
    handle(() =>
      bookingService.createBooking({
        name: args.name.trim(),
        date: args.date,
        startTime: args.startTime,
        duration: args.duration,
        resourceId: args.resourceId,
      }),
    ),
);

server.registerTool(
  "cancel_booking",
  {
    title: "Cancel booking",
    description:
      "Membatalkan booking berdasarkan bookingId (angka id atau kode seperti BK-000001).",
    inputSchema: {
      bookingId: z
        .string()
        .describe("Id booking (angka) atau bookingId (misal BK-000001)"),
    },
  },
  (args) =>
    handle(async () => {
      const booking = await resolveBooking(args.bookingId);
      if (!booking) return { error: "Booking tidak ditemukan." };
      return bookingService.cancelBooking(booking.id);
    }),
);

main().catch((error: unknown) => {
  console.error("MCP server error:", error);
  process.exit(1);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
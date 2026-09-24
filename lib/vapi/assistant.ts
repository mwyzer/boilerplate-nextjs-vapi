import type { CreateAssistantDTO, CreateFunctionToolDTO } from "@vapi-ai/web/dist/api";

export const BOOKING_TOOL_NAMES = [
  "check_availability",
  "create_booking",
  "cancel_booking",
] as const;
export type BookingToolName = (typeof BOOKING_TOOL_NAMES)[number];

export const bookingTools: CreateFunctionToolDTO[] = [
  {
    type: "function",
    async: false,
    function: {
      name: "check_availability",
      description:
        "Memeriksa apakah ruang meeting tersedia pada tanggal, waktu mulai, dan durasi tertentu. Gunakan ini sebelum membuat booking.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Tanggal booking dalam format YYYY-MM-DD.",
          },
          startTime: {
            type: "string",
            description: "Waktu mulai dalam format HH:mm (24 jam).",
          },
          duration: {
            type: "number",
            description: "Durasi dalam jam, misalnya 1 atau 1.5 (minimal 0.5, maksimal 8).",
          },
        },
        required: ["date", "startTime", "duration"],
      },
    },
  },
  {
    type: "function",
    async: false,
    function: {
      name: "create_booking",
      description:
        "Membuat booking ruang meeting. Panggil setelah user mengonfirmasi nama, tanggal, waktu mulai, dan durasi.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Nama pemesan.",
          },
          date: {
            type: "string",
            description: "Tanggal booking dalam format YYYY-MM-DD.",
          },
          startTime: {
            type: "string",
            description: "Waktu mulai dalam format HH:mm (24 jam).",
          },
          duration: {
            type: "number",
            description: "Durasi dalam jam, misalnya 1 atau 1.5 (minimal 0.5, maksimal 8).",
          },
        },
        required: ["name", "date", "startTime", "duration"],
      },
    },
  },
  {
    type: "function",
    async: false,
    function: {
      name: "cancel_booking",
      description:
        "Membatalkan booking yang sudah ada berdasarkan kode booking (contoh: BK-000001).",
      parameters: {
        type: "object",
        properties: {
          bookingId: {
            type: "string",
            description: "Kode booking, contoh: BK-000001.",
          },
        },
        required: ["bookingId"],
      },
    },
  },
];

export const SYSTEM_PROMPT = `Kamu adalah asisten pemesanan ruang meeting yang ramah dan efisien. Bahasa percakapan: Bahasa Indonesia.

Alur yang harus dikuti:
1. Tanya nama pemesan di awal.
2. Kumpulkan informasi berikut satu per satu atau sekaligus: tanggal (YYYY-MM-DD), jam mulai (HH:mm, 24 jam), dan durasi (dalam jam, minimal 0.5, maksimal 8, kelipatan 0.5).
3. Sebelum membuat booking, selalu panggil tool check_availability untuk memastikan slot tersedia.
4. Jika slot tidak tersedia, sampaikan alternatif waktu yang diberikan dan tanyakan apakah user ingin memilih salah satu.
5. Saat semua informasi lengkap dan slot tersedia, konfirmasi ringkasan booking ke user terlebih dahulu. Setelah user setuju, panggil tool create_booking.
6. Jika user ingin membatalkan booking, minta kode booking (format BK-xxxxxx) lalu panggil tool cancel_booking.
7. Setelah booking berhasil dibuat, ucapkan selamat dan sebutkan kode booking untuk user.

Jangan pernah membuat booking tanpa konfirmasi user. Jika user meminta sesuatu di luar pemesanan ruang meeting, arahkan kembali ke tujuan pemesanan.`;

export function buildAssistant(): CreateAssistantDTO {
  return {
    name: "Simple Booking Assistant",
    transcriber: { provider: "vapi" },
    model: {
      provider: "openai",
      model: "gpt-4.1-mini",
      messages: [{ role: "system", content: SYSTEM_PROMPT }],
      tools: bookingTools,
    },
    voice: {
      provider: "vapi",
      voiceId: "Clara",
      language: "id",
    },
    firstMessage:
      "Halo! Selamat datang di layanan pemesanan ruang meeting. Boleh saya tahu nama Anda?",
    firstMessageMode: "assistant-speaks-first",
    firstMessageInterruptionsEnabled: true,
    maxDurationSeconds: 600,
    backgroundSound: "off",
    modelOutputInMessagesEnabled: true,
  };
}
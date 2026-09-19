import type { BookingStatus } from "@/lib/types";

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

export function formatDuration(duration: number): string {
  const minutes = Math.round(duration * 60);
  if (minutes % 60 === 0) {
    return `${minutes / 60} jam`;
  }
  return `${minutes} menit`;
}

export function statusLabel(status: BookingStatus): string {
  switch (status) {
    case "CONFIRMED":
      return "CONFIRMED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

export function statusBadgeClass(status: BookingStatus): string {
  switch (status) {
    case "CONFIRMED":
      return "bg-emerald-100 text-emerald-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}
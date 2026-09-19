import Link from "next/link";
import { statusBadgeClass, statusLabel } from "@/lib/format";
import { formatLongDate } from "@/lib/format";
import type { ApiBooking } from "@/lib/types";

export default function BookingCard({
  booking,
  onCancel,
}: {
  booking: ApiBooking;
  onCancel?: (booking: ApiBooking) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-mono text-sm font-semibold text-zinc-900">
          {booking.bookingId}
        </p>
        <p className="mt-1 text-sm font-medium text-zinc-700">{booking.name}</p>
        <p className="mt-1 text-sm text-zinc-500">
          {formatLongDate(booking.date)} · {booking.startTime} -{" "}
          {booking.endTime}
        </p>
        <p className="mt-0.5 text-xs text-zinc-400">
          {booking.resource?.name ?? "Meeting Room"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
            booking.status,
          )}`}
        >
          {statusLabel(booking.status)}
        </span>
        <Link
          href={`/bookings/${booking.bookingId}`}
          className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          View
        </Link>
        {booking.status !== "CANCELLED" && (
          <button
            type="button"
            onClick={() => onCancel?.(booking)}
            className="rounded-full border border-red-200 px-4 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
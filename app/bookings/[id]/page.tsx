import Link from "next/link";
import CancelBookingButton from "@/components/CancelBookingButton";
import { getBookingByBookingId, getBookingById } from "@/lib/booking";
import {
  formatDuration,
  formatLongDate,
  statusBadgeClass,
  statusLabel,
} from "@/lib/format";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = /^\d+$/.test(id)
    ? await getBookingById(Number(id))
    : await getBookingByBookingId(id);

  if (!booking) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 rounded-3xl border border-zinc-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">
          Booking tidak ditemukan
        </h1>
        <Link
          href="/bookings"
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <Link href="/bookings" className="text-sm font-medium text-zinc-600 underline">
        Kembali ke daftar
      </Link>

      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-2xl font-bold text-zinc-900">
            {booking.bookingId}
          </h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(
              booking.status,
            )}`}
          >
            {statusLabel(booking.status)}
          </span>
        </div>

        <dl className="mt-6 space-y-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Nama</dt>
            <dd className="font-medium text-zinc-900">{booking.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Tanggal</dt>
            <dd className="font-medium text-zinc-900">
              {formatLongDate(booking.date)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Waktu</dt>
            <dd className="font-medium text-zinc-900">
              {booking.startTime} - {booking.endTime}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Durasi</dt>
            <dd className="font-medium text-zinc-900">
              {formatDuration(booking.duration)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Ruangan</dt>
            <dd className="font-medium text-zinc-900">
              {booking.resource?.name ?? "Meeting Room"}
            </dd>
          </div>
        </dl>

        {booking.status !== "CANCELLED" && (
          <div className="mt-8 border-t border-zinc-100 pt-6">
            <CancelBookingButton bookingId={booking.bookingId} />
          </div>
        )}
      </div>
    </div>
  );
}
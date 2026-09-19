"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import BookingCard from "@/components/BookingCard";
import type { ApiBooking } from "@/lib/types";

export default function BookingList() {
  const [bookings, setBookings] = useState<ApiBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bookings")
      .then((res) => res.json())
      .then((data: { bookings?: ApiBooking[]; error?: { message?: string } }) => {
        if (cancelled) return;
        if (!data.bookings) {
          setError(data.error?.message ?? "Gagal memuat daftar booking.");
          return;
        }
        setBookings(data.bookings);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function load() {
    const res = await fetch("/api/bookings");
    const data: { bookings?: ApiBooking[]; error?: { message?: string } } =
      await res.json();
    if (!res.ok || !data.bookings) {
      throw new Error(data.error?.message ?? "Gagal memuat daftar booking.");
    }
    setBookings(data.bookings);
  }

  const handleCancel = useCallback(
    async (booking: ApiBooking) => {
      if (!window.confirm(`Batalkan booking ${booking.bookingId}?`)) return;
      try {
        const res = await fetch(`/api/bookings/${booking.bookingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CANCELLED" }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message ?? "Gagal membatalkan booking.");
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      }
    },
    [],
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">My Bookings</h2>
        <Link
          href="/booking"
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Book with AI
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {bookings === null && !error && (
        <p className="py-8 text-center text-sm text-zinc-500">Memuat...</p>
      )}

      {bookings !== null && bookings.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-500">
          Belum ada booking.
        </p>
      )}

      {bookings?.map((booking) => (
        <BookingCard key={booking.id} booking={booking} onCancel={handleCancel} />
      ))}
    </div>
  );
}
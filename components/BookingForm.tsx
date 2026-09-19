"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDuration, formatLongDate } from "@/lib/format";
import type { ApiBooking } from "@/lib/types";

type FieldProps = {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  step?: string;
};

function Field({ label, type, value, onChange, placeholder, min, max, step }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        required
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-normal text-zinc-900 outline-none transition-colors focus:border-zinc-900"
      />
    </label>
  );
}

export default function BookingForm() {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("1");
  const [availability, setAvailability] = useState<
    | {
        available: true;
        resourceName: string;
        startTime: string;
        endTime: string;
      }
    | {
        available: false;
        alternativeTimes: string[];
      }
    | null
  >(null);
  const [booking, setBooking] = useState<ApiBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const durationHours = Number(duration);

  async function handleCheckAvailability() {
    setError(null);
    setAvailability(null);
    setChecking(true);
    try {
      const res = await fetch("/api/bookings/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, startTime, duration: durationHours }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message ?? "Gagal memeriksa ketersediaan.");
      }
      setAvailability(
        data.available
          ? {
              available: true,
              resourceName: data.resourceName,
              startTime: data.startTime,
              endTime: data.endTime,
            }
          : { available: false, alternativeTimes: data.alternativeTimes },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, date, startTime, duration: durationHours }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message ?? "Gagal membuat booking.");
      }
      setBooking(data.booking as ApiBooking);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  if (booking) {
    return (
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="text-lg font-semibold text-emerald-800">
          Booking berhasil!
        </p>
        <p className="mt-2 text-emerald-700">
          {booking.bookingId} · {booking.name}
        </p>
        <p className="mt-1 text-sm text-emerald-700">
          {formatLongDate(booking.date)} · {booking.startTime} -{" "}
          {booking.endTime} · {formatDuration(booking.duration)}
        </p>
        <Link
          href={`/bookings/${booking.bookingId}`}
          className="mt-4 inline-block rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-600"
        >
          Lihat detail booking
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-lg flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm"
    >
      <h2 className="text-xl font-semibold text-zinc-900">
        Booking Manual
      </h2>

      <Field label="Name" type="text" value={name} onChange={setName} placeholder="Nama Anda" />
      <Field label="Date" type="date" value={date} onChange={setDate} />
      <Field label="Start Time" type="time" value={startTime} onChange={setStartTime} />
      <Field
        label="Duration (jam)"
        type="number"
        value={duration}
        onChange={setDuration}
        min="0.5"
        max="8"
        step="0.5"
      />

      {availability?.available && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          Tersedia: {availability.resourceName} ·{" "}
          {formatLongDate(date)} · {availability.startTime} -{" "}
          {availability.endTime}
        </div>
      )}

      {availability && !availability.available && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Slot sudah dibooking. Waktu alternatif yang tersedia:{" "}
          {availability.alternativeTimes.length > 0
            ? availability.alternativeTimes.join(", ")
            : "-"}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleCheckAvailability}
          disabled={checking || !date || !startTime}
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {checking ? "Memeriksa..." : "Check Availability"}
        </button>
        <button
          type="submit"
          disabled={submitting || !name || !date || !startTime}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Menyimpan..." : "Confirm Booking"}
        </button>
      </div>
    </form>
  );
}
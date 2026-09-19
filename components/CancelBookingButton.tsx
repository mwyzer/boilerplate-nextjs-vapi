"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CancelBookingButton({
  bookingId,
  disabled,
  onCancelled,
}: {
  bookingId: string;
  disabled?: boolean;
  onCancelled?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (!window.confirm(`Batalkan booking ${bookingId}?`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message ?? "Gagal membatalkan booking.");
      }
      onCancelled?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleCancel}
        disabled={disabled || loading}
        className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Membatalkan..." : "Cancel Booking"}
      </button>
    </div>
  );
}
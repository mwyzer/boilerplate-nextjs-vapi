import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
          SIMPLE BOOKING
        </h1>
        <p className="mt-3 text-lg text-zinc-600">
          Book your meeting room using AI voice.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/booking"
          className="rounded-full bg-zinc-900 px-8 py-3.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Book with AI
        </Link>
        <Link
          href="/bookings"
          className="rounded-full border border-zinc-300 px-8 py-3.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          View Bookings
        </Link>
      </div>
    </main>
  );
}
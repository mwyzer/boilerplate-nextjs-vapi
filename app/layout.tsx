import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Simple Booking",
  description: "Book your meeting room using AI voice.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="flex items-center justify-between px-6 py-5">
          <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900">
            SIMPLE BOOKING
          </Link>
          <Link href="/bookings" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
            My Bookings
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}

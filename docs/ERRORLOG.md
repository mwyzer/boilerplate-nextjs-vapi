# ERROR LOG (ERRORLOG)

## Simple Voice Booking with Vapi & Next.js

**Last updated:** 2026-09-19 (Sesi 3 — re-verifikasi status)

**Format:** Tambahkan entri baru di bagian paling bawah saat error terjadi. Deskripsi singkat, root cause,
solusi, status. Jangan menghapus entri lama.

**Status:** `FIXED` = sudah diperbaiki & diverifikasi · `OPEN` = belum diperbaiki · `INFO` = temuan/perhatian ·
`MONITOR` = berpotensi muncul, pantau.

---

# 1. Kontrak Error API (referensi)

Response error dipusatkan di `lib/http.ts` -> `errorResponse()`:

```json
{ "error": { "code": "ERROR_CODE", "message": "Deskripsi" } }
```

Kontrak lengkap (daftar kode error per endpoint) dipelihara di **SRS section 4 (FR-05) & section 6 — API Specification**.
Jangan menduplikasi tabel kode error di file ini agar tidak ada drift.

---

# 2. Entri Log (seed dari review kode 2026-09-19)

## INFO — Known behavior (bukan error)

### E-LOG-001 — Body JSON invalid ditangani sebagai 400

- **Tanggal:** 2026-09-19
- **Lokasi:** `app/api/bookings/route.ts`, `app/api/bookings/availability/route.ts`, `app/api/bookings/[id]/route.ts`
- **Temuan:** `request.json().catch(() => null)` mengubah body invalid menjadi `null` -> `parseBookingInput`
  melempar `INVALID_PAYLOAD` (400). Tidak pernah melesat ke 500.
- **Status:** INFO — perilaku benar, dipertahankan.

### E-LOG-004 — Environment secrets aman secara default

- **Tanggal:** 2026-09-19
- **Lokasi:** `.gitignore`
- **Temuan:** `.env*`, `*.db`, `/app/generated/prisma` sudah dikecualikan dari Git. Public key aman di client
  (`NEXT_PUBLIC_VAPI_PUBLIC_KEY`), `VAPI_PRIVATE_KEY` hanya server; tidak ada import private key di komponen klien
  (Sesi 2 — `lib/vapi/tools-client.ts` hanya memanggil API endpoint internal).
- **Status:** INFO — pastikan tidak commit `.env.local` pada sesi berikutnya.

## OPEN — Isu terbuka (belum diperbaiki)

### E-LOG-002 — Booking ID berpotensi duplikat saat create bersamaan

- **Tanggal:** 2026-09-19
- **Lokasi:** `lib/booking.ts` -> `generateBookingId()`
- **Root cause (potensial):** `bookingId` dibuat dari `count() + 1`. Dua request create bersamaan bisa
  menghitung count yang sama -> kolom `bookingId` unik -> violasi unique constraint -> `INTERNAL_ERROR` (500).
- **Impact:** Rendah pada MVP single-user, naik jika dipakai produksi.
- **Mitigasi yang disarankan:** retry saat collision, atau gunakan counter/sequence lain.
- **Status:** OPEN — dire-verify Sesi 3 (2026-09-19): `generateBookingId()` masih `count() + 1`
  (`lib/booking.ts`), pola belum berubah. Catat untuk sesi berikutnya.

### E-LOG-003 — Manual fallback belum ada saat Vapi gagal

- **Tanggal:** 2026-09-19 (FIXED 2026-09-19, Sesi 2)
- **Lokasi:** `components/BookingForm.tsx`, `app/booking/page.tsx?mode=manual`, link di `components/VapiBooking.tsx`.
- **Temuan:** PRD section 19 — Error Handling mengharuskan pesan "Voice booking is currently unavailable. You can
  continue with manual booking." Belum ada implementasi UI/fallback.
- **Solusi:** Tombol/link "Booking manual" di `VapiBooking` (tau juga saat public key tidak terisi -> pesan peringatan),
  halaman `/booking?mode=manual` menampilkan form manual (name/date/startTime/duration, Check Availability + Confirm Booking).
- **Status:** FIXED — lead ke `/booking?mode=manual` memberikan HTTP 200 dan form tampil (smoke test Sesi 2).
- **Verifikasi:** `Invoke-WebRequest /booking?mode=manual` -> 200; form render di browser.

### E-LOG-005 — `npm audit` menemukan 6 vulnerabilities (4 high)

- **Tanggal:** 2026-09-19
- **Lokasi:** dependencies (`npm audit` setelah install `@vapi-ai/web` & `vitest`).
- **Temuan:** 6 total (2 moderate, 4 high) pada tree dependency; belum ditriase.
- **Status:** OPEN — Sesi 3 (2026-09-19): re-run `npm audit` gagal karena registry npm sedang maintenance
  (HTTP 503, "We are currently performing maintenance"), hasil audit terbaru belum bisa diverifikasi.
  Audit mendetail (`npm audit` / `npm audit fix --force` butuh keputusan) dijadwalkan sesi berikutnya.

---

# 3. Log Error Masa Depan (template entri baru)

Tambahkan entri baru pada bagian paling bawah.

Tanggal: `YYYY-MM-DD`

- **Nomor:** E-LOG-0xx
- **Lokasi:** file/route
- **Aksi & behavior:** deskripsi error yang terlihat
- **Root cause:** ...
- **Solusi:** ...
- **Status:** FIXED / OPEN / MONITOR
- **Verifikasi:** command / langkah yang membuktikan fix
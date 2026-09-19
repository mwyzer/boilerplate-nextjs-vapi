# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

## Simple Voice Booking with Vapi & Next.js

**Version:** 1.0
**Status:** MVP / Prototype
**Last updated:** 2026-09-19 (Sesi 3 — snapshot status diperbarui sesuai verifikasi terkini)
**Related document:** [PRD.md](./PRD.md)
**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Prisma, SQLite, Vapi

---

# 1. Introduction

## 1.1 Purpose

Dokumen ini adalah Software Requirements Specification (SRS) untuk Simple Voice Booking — aplikasi
booking meeting room berbasis Voice AI. Dokumen ini menjabarkan persyaratan teknis sistem yang
diturunkan dari PRD, meliputi arsitektur, data model, API, validasi, dan non-functional requirements.

## 1.2 Scope

SRS mencakup MVP dengan domain **Meeting Room Booking**. Sistem terdiri dari:

- Backend API (Next.js Route Handlers) untuk CRUD dan availability booking.
- Persistence layer menggunakan Prisma ORM + SQLite.
- Voice AI integration menggunakan Vapi (Web SDK + Tool Calling).
- UI web (landing, voice booking, booking list/detail, manual fallback).

## 1.3 Definitions & Abbreviations

| Term      | Definition                                                      |
| --------- | --------------------------------------------------------------- |
| Booking   | Reservasi penggunaan resource pada tanggal, waktu, dan durasi.  |
| Resource  | Aset yang dapat dibooking (MVP: Meeting Room A).                |
| Slots     | Periode waktu berdurasi tetap yang dapat dibooking.             |
| Vapi      | Platform AI voice yang digunakan untuk percakapan suara.        |
| Tool Call | Function calling yang dilakukan Vapi ke backend API.            |
| Prisma    | ORM yang digunakan untuk mengakses database.                    |
| NFR       | Non-Functional Requirements.                                    |

---

# 2. Overall Description

## 2.1 System Architecture

```text
┌────────────────────────────────────────────────────────────┐
│                      Browser (Client)                       │
│                                                             │
│   Landing Page → Voice Booking → Booking List/Detail        │
│   Vapi Web SDK (microphone, session, status)                │
│   Manual Booking Form (fallback)                            │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS (JSON)
                            ▼
┌────────────────────────────────────────────────────────────┐
│               Next.js Server (Route Handlers)               │
│                                                             │
│   /api/bookings             POST    create booking          │
│   /api/bookings             GET     list bookings           │
│   /api/bookings/:id         GET     booking detail          │
│   /api/bookings/:id         PATCH   cancel booking          │
│   /api/bookings/availability POST   check availability      │
│                                                             │
│   service layer: lib/booking.ts (validasi & logika)         │
└───────────────────────────┬─────────────────────────────────┘
                            │ Prisma Client
                            ▼
                    ┌──────────────────┐
                    │   SQLite (MVP)   │
                    │   Resource       │
                    │   Booking        │
                    └──────────────────┘
```

Dua jalur setara untuk membuat booking:

1. **Voice path** — percakapan Vapi → AI memanggil tool → backend API.
2. **Manual path** — user mengisi form → backend API.

Kedua jalur menggunakan backend API dan validasi yang sama.

## 2.2 Assumptions & Dependencies

- Microphone permission tersedia di browser untuk voice flow.
- Vapi account (public/private key) tersedia.
- Database SQLite lokal untuk development.
- Satu resource aktif default: **Meeting Room A**.

---

# 3. Data Model

## 3.1 Entity Relationship

```text
Resource (1) ──< (N) Booking
```

## 3.2 Resource

| Field     | Type     | Constraint     | Default        |
| --------- | -------- | -------------- | -------------- |
| id        | Int      | PK, autoinc    | —              |
| name      | String   | required       | —              |
| type      | String   | —              | `MEETING_ROOM` |
| capacity  | Int      | —              | `4`            |
| status    | String   | —              | `ACTIVE`       |
| createdAt | DateTime | —              | `now()`        |
| updatedAt | DateTime | auto           | —              |

Initial seed: `Meeting Room A` (MEETING_ROOM, capacity 4, ACTIVE).

Arsitektur mendukung penambahan resource di masa depan; logic availability scoped per `resourceId`.

## 3.3 Booking

| Field     | Type         | Constraint             | Default      |
| --------- | ------------ | ---------------------- | ------------ |
| id        | Int          | PK, autoinc            | —            |
| bookingId | String       | unique                 | `BK-000001`  |
| name      | String       | required               | —            |
| resourceId| Int          | FK → Resource          | —            |
| date      | String       | `YYYY-MM-DD`           | —            |
| startTime | String       | `HH:mm`                | —            |
| duration  | Int          | minutes (DB); API menerima jam | —            |
| start     | DateTime     | computed               | —            |
| end       | DateTime     | computed               | —            |
| status    | BookingStatus| enum                   | `PENDING`    |
| createdAt | DateTime     | —                      | `now()`      |
| updatedAt | DateTime     | auto                   | —            |

### 3.3.1 BookingStatus

```text
PENDING
CONFIRMED
CANCELLED
```

### 3.3.2 Indexes

```text
@@index([resourceId, status])
@@index([resourceId, start, end])
```

---

# 4. Functional Requirements

## FR-01 — Landing Page

| Field       | Detail                                                        |
| ----------- | ------------------------------------------------------------- |
| Description | Product name, deskripsi singkat, tombol "Book with AI" dan "View Bookings". |
| Priority    | High                                                          |
| Status      | **Implemented** (landing sesuai PRD 14.1; smoke test 200)     |

## FR-02 — Start Voice Session

| Field       | Detail                                                        |
| ----------- | ------------------------------------------------------------- |
| Description | "Book with AI" → minta microphone permission → inisialisasi Vapi → mulai session → tampilkan status. |
| Transitions | `Connecting → Listening → Thinking → Speaking → Call ended`  |
| Priority    | High                                                          |
| Status      | **Implemented** (UI siap; verifikasi live Vapi call pending)  |

## FR-03 — Collect Booking Information

| Field       | Detail                                                        |
| ----------- | ------------------------------------------------------------- |
| Description | AI mengumpulkan: name, date, startTime, duration. Menanyakan kembali informasi yang belum diberikan. |
| Priority    | High                                                          |
| Status      | **Implemented** (system prompt di `lib/vapi/assistant.ts`)     |

## FR-04 — Natural Language Date & Time

| Field       | Detail                                                        |
| ----------- | ------------------------------------------------------------- |
| Description | AI memahami `tomorrow`, `next Monday`, `this Friday`, `10 AM`, `half past two`, `two hours`. Backend menerima format terstruktur `YYYY-MM-DD` + `HH:mm` + `duration (jam)`. |
| Priority    | High                                                          |
| Status      | **Implemented** — NLP di sisi Vapi prompt (`lib/vapi/assistant.ts`); `lib/booking.ts` menerima format terstruktur `YYYY-MM-DD` + `HH:mm` + `duration (jam)`. |

## FR-05 — Validate Booking

| Field          | Detail                                                   |
| -------------- | -------------------------------------------------------- |
| Description    | Validasi: date valid, time valid, duration 0.5-8 jam (input API dalam satuan jam, kelipatan 30 menit), bukan waktu lampau, slot belum digunakan. |
| Implementation | `parseDateInput`, `parseTimeInput`, `parseDurationInput`, `parseBookingInput` di `lib/booking.ts`. |
| Priority       | High                                                     |
| Status         | **Implemented**                                          |

Error codes:

| Code               | Kondisi                                        |
| ------------------ | ---------------------------------------------- |
| `INVALID_PAYLOAD`  | Body bukan object valid.                       |
| `MISSING_NAME`     | Name kosong.                                   |
| `INVALID_DATE`     | Format/angka tanggal tidak valid.              |
| `INVALID_TIME`     | Format waktu tidak valid.                      |
| `INVALID_DURATION` | Durasi di luar 0.5–8 jam atau bukan kelipatan 30 menit. |
| `PAST_BOOKING`     | Waktu mulai sudah lewat.                       |
| `SLOT_BOOKED`      | Overlap dengan booking CONFIRMED lain.         |
| `NO_RESOURCE`      | Resource tidak ada / tidak aktif.              |
| `INVALID_STATUS`   | Status selain `CANCELLED` pada cancel.         |
| `INTERNAL_ERROR`   | Error tak terduga (500).                       |

## FR-06 — Check Availability

| Field          | Detail                                                        |
| -------------- | ------------------------------------------------------------- |
| Description    | `POST /api/bookings/availability` payload `{date, startTime, duration}`. |
| Success output | `{ "available": true, resourceId, resourceName, date, startTime, endTime, duration }` |
| Failure output | `{ "available": false, conflictCount, alternativeTimes }`     |
| Alternative    | Hingga 3 alternatif, offset 1–10 jam dari slot diminta, skip slot lewat/konflik. |
| Priority       | High                                                          |
| Status         | **Implemented**                                               |

## FR-07 — Booking Confirmation

| Field       | Detail                                                        |
| ----------- | ------------------------------------------------------------- |
| Description | AI menyajikan ringkasan (summary) sebelum booking. Booking hanya dibuat setelah konfirmasi user. |
| Priority    | High                                                          |
| Status      | **Implemented** (kontrak pada system prompt Vapi; verifikasi live pending) |

## FR-08 — Create Booking

| Field          | Detail                                                        |
| -------------- | ------------------------------------------------------------- |
| Description    | `POST /api/bookings` dengan `{name, date, startTime, duration (jam), resourceId?}`. Berstatus `CONFIRMED` dan menghasilkan `bookingId`. |
| Implementation | `createBooking` di `lib/booking.ts`.                          |
| Priority       | High                                                          |
| Status         | **Implemented**                                               |

## FR-09 — Booking Confirmation Result

| Field       | Detail                                                        |
| ----------- | ------------------------------------------------------------- |
| Description | Menampilkan bookingId, name, date, time range, resource, status. |
| Priority    | High                                                          |
| Status      | **Implemented** (kartu sukses di `VapiBooking` + halaman detail) |

## FR-10 — Booking List

| Field          | Detail                                                        |
| -------------- | ------------------------------------------------------------- |
| Description    | Halaman "My Bookings" berisi daftar booking dengan tombol View dan Cancel. |
| Implementation | `GET /api/bookings` → `{ bookings: ApiBooking[] }` urut `start` desc. |
| Priority       | High                                                          |
| Status         | **Implemented** (UI + smoke test)                             |

## FR-11 — Booking Detail

| Field          | Detail                                                        |
| -------------- | ------------------------------------------------------------- |
| Description    | Detail: bookingId, name, resource, date, start/end time, duration, status, createdAt. |
| Implementation | `GET /api/bookings/:id` (resolve numeric id atau `bookingId` `BK-xxxxxx`). |
| Priority       | High                                                          |
| Status         | **Implemented** (page + smoke 200)                            |

## FR-12 — Cancel Booking

| Field          | Detail                                                        |
| -------------- | ------------------------------------------------------------- |
| Description    | `PATCH /api/bookings/:id` body `{status: "CANCELLED"}`. Booking cancelled tidak dianggap aktif. |
| Implementation | `cancelBooking` di `lib/booking.ts`; idempotent (cancel berulang tidak error). |
| Priority       | High                                                          |
| Status         | **Implemented**                                               |

---

# 5. Vapi AI Tools

Kontrak tool yang harus didaftarkan pada Vapi Assistant. Setiap tool memanggil backend API.

## 5.1 check_availability

```json
{
  "name": "check_availability",
  "description": "Memeriksa apakah resource tersedia pada tanggal, waktu mulai, dan durasi tertentu.",
  "parameters": {
    "type": "object",
    "properties": {
      "date": { "type": "string", "description": "YYYY-MM-DD" },
      "startTime": { "type": "string", "description": "HH:mm" },
      "duration": { "type": "number", "description": "Durasi dalam jam (0.5-8)" }
    },
    "required": ["date", "startTime", "duration"]
  }
}
```

Endpoint: `POST /api/bookings/availability`

## 5.2 create_booking

```json
{
  "name": "create_booking",
  "description": "Membuat booking setelah user memberikan konfirmasi.",
  "parameters": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "date": { "type": "string", "description": "YYYY-MM-DD" },
      "startTime": { "type": "string", "description": "HH:mm" },
      "duration": { "type": "number", "description": "Jam" }
    },
    "required": ["name", "date", "startTime", "duration"]
  }
}
```

Endpoint: `POST /api/bookings`

## 5.3 cancel_booking

```json
{
  "name": "cancel_booking",
  "description": "Membatalkan booking berdasarkan bookingId.",
  "parameters": {
    "type": "object",
    "properties": {
      "bookingId": { "type": "string", "description": "Contoh: BK-000001" }
    },
    "required": ["bookingId"]
  }
}
```

Endpoint: `PATCH /api/bookings/{bookingId}` body `{ "status": "CANCELLED" }`

Seluruh tool dipanggil oleh backend Vapi (server-side); private key tidak boleh diakses client.

---

# 6. API Specification

Semua response error berbentuk:

```json
{ "error": { "code": "ERROR_CODE", "message": "Deskripsi" } }
```

## 6.1 POST /api/bookings

**Request:**

```json
{
  "name": "Muhammad",
  "date": "2026-09-20",
  "startTime": "10:00",
  "duration": 2
}
```

**Response 201:**

```json
{
  "booking": {
    "id": 1,
    "bookingId": "BK-000001",
    "name": "Muhammad",
    "resourceId": 1,
    "resource": { "id": 1, "name": "Meeting Room A", "type": "MEETING_ROOM", "capacity": 4 },
    "date": "2026-09-20",
    "startTime": "10:00",
    "endTime": "12:00",
    "duration": 2,
    "status": "CONFIRMED",
    "createdAt": "2026-09-19T..."
  }
}
```

**Errors:** `INVALID_PAYLOAD`, `MISSING_NAME`, `INVALID_DATE`, `INVALID_TIME`, `INVALID_DURATION`,
`PAST_BOOKING`, `SLOT_BOOKED`, `NO_RESOURCE` (400); `INTERNAL_ERROR` (500).

## 6.2 GET /api/bookings

**Response 200:** `{ "bookings": [ApiBooking, ...] }` — urut descending by `start`.

## 6.3 GET /api/bookings/:id

`:id` dapat berupa numeric id atau `bookingId` (mis. `BK-000001`).

**Response 200:** `{ "booking": ApiBooking }`
**Errors:** `NOT_FOUND` (404).

## 6.4 POST /api/bookings/availability

**Request:**

```json
{ "date": "2026-09-20", "startTime": "10:00", "duration": 2 }
```

**Response 200 (tersedia):**

```json
{
  "available": true,
  "resourceId": 1,
  "resourceName": "Meeting Room A",
  "date": "2026-09-20",
  "startTime": "10:00",
  "endTime": "12:00",
  "duration": 2
}
```

**Response 200 (tidak tersedia):**

```json
{
  "available": false,
  "conflictCount": 1,
  "alternativeTimes": ["13:00", "15:00"]
}
```

**Errors:** `INVALID_DATE`, `INVALID_TIME`, `INVALID_DURATION`, `PAST_BOOKING`, `NO_RESOURCE`.

## 6.5 PATCH /api/bookings/:id

**Request:**

```json
{ "status": "CANCELLED" }
```

**Response 200:** `{ "booking": { ...ApiBooking, status: "CANCELLED" } }`
**Errors:** `INVALID_STATUS` (400), `NOT_FOUND` (404).

---

# 7. Business Rules (Derived from PRD section 18)

| Rule | Description                                   | Enforced at                |
| ---- | --------------------------------------------- | -------------------------- |
| R1   | Booking tidak boleh pada waktu lewat.         | `lib/booking.ts`           |
| R2   | Booking tidak boleh overlap dengan booking CONFIRMED lain. | `findConflictingBookings` |
| R3   | Booking wajib memiliki name, date, startTime, duration. | `parseBookingInput`     |
| R4   | Duration minimum 30 menit.                    | `parseDurationInput`       |
| R5   | Duration maksimum 8 jam.                      | `parseDurationInput`       |
| R6   | Duration harus kelipatan 30 menit.            | `parseDurationInput`       |
| R7   | Booking hanya dibuat setelah konfirmasi user. | UI + system prompt Vapi    |
| R8   | Booking CANCELLED tidak dianggap aktif (excluded dari konflik). | `findConflictingBookings` |

---

# 8. Non-Functional Requirements (NFR)

## NFR-01 Performance

- API response normal < 500 ms (target, tergantung latensi SQLite lokal).
- UI responsive.
- Voice UI menampilkan status feedback real-time.

## NFR-02 Availability

- Jika voice gagal (Vapi unavailable / microphone error), aplikasi tetap dapat digunakan lewat manual form.

## NFR-03 Security

- Vapi private key hanya di server (environment variable).
- Tidak ada secret yang dikirim ke browser.
- Validasi dilakukan server-side; client tidak dipercaya.
- Sanitasi input (trim name, validasi format/range).
- Pencegahan duplicate booking via conflict check.

## NFR-04 Reliability

- Idempotent cancel (PATCH berulang tidak error).
- Conflict check dijalankan dalam satu operasi create.

## NFR-05 Maintainability

- TypeScript.
- Service layer terpusat (`lib/booking.ts`) digunakan bersama API routes.
- Prisma schema sebagai source of truth data model.
- Environment configuration via `.env`.

## NFR-06 Portability

- Migration ke PostgreSQL untuk production (Prisma mendukung multi-provider).
- Arsitektur mendukung penambahan resource di masa depan.

---

# 9. Environment Configuration

```env
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key
VAPI_PRIVATE_KEY=your_vapi_private_key
DATABASE_URL="file:./dev.db"
```

- `NEXT_PUBLIC_*` aman untuk client.
- `VAPI_PRIVATE_KEY` hanya server. Jangan commit secret.

---

# 10. Acceptance Traceability

> Snapshot untuk versi 1.0, diperbarui pada Sesi 3 (2026-09-19) sesuai hasil verifikasi ulang.
> Status live/lanjutan dipantau di **CHECKLOG.md**.

| PRD AC | Requirement                           | Status                                     |
| ------ | ------------------------------------- | ------------------------------------------ |
| AC-01  | Landing page dapat dibuka             | Implemented (PRD 14.1, smoke 200)          |
| AC-02  | Start voice session                   | WIP (UI siap; live Vapi call pending)      |
| AC-03  | AI paham permintaan sederhana         | WIP (system prompt; live pending)          |
| AC-04  | AI minta info yang kurang             | WIP (system prompt; live pending)          |
| AC-05  | AI cek availability via tool          | Implemented (tool client+server, webhook smoke-tested) |
| AC-06  | AI tidak booking sebelum konfirmasi   | WIP (prompt instruksi; live pending)       |
| AC-07  | Booking tersimpan ke DB               | Implemented                                |
| AC-08  | Booking ID dihasilkan                 | Implemented (`BK-xxxxxx`)                  |
| AC-09  | Booking muncul di list                | Implemented (UI + smoke)                   |
| AC-10  | Lihat detail booking                  | Implemented (page + smoke 200)             |
| AC-11  | User dapat membatalkan booking        | Implemented (UI + webhook cancel smoke-tested) |
| AC-12  | System menolak overlapping booking    | Implemented (`SLOT_BOOKED`)                |
| AC-13  | Private Vapi key tidak ke browser     | Implemented (public key hanya via `NEXT_PUBLIC_`) |
| AC-14  | Manual booking bila voice gagal       | Implemented (form manual di `/booking?mode=manual`) |
# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Simple Voice Booking with Vapi & Next.js

**Version:** 1.0
**Status:** MVP / Prototype
**Platform:** Web Application
**Frontend & Backend:** Next.js
**AI Voice Platform:** Vapi
**ORM:** Prisma
**Database:** SQLite (MVP)

---

# 1. Product Overview

Simple Voice Booking adalah aplikasi web untuk melakukan booking menggunakan percakapan suara dengan AI.

Pengguna dapat berbicara dengan AI Agent untuk:

* meminta jadwal booking,
* memberikan nama,
* menentukan tanggal,
* menentukan waktu,
* menentukan durasi,
* mengecek ketersediaan,
* melakukan konfirmasi booking,
* melihat booking,
* membatalkan booking.

Contoh penggunaan:

> "Saya ingin booking meeting room besok jam 10 pagi selama 2 jam."

AI akan memahami permintaan tersebut, menanyakan informasi yang belum tersedia, mengecek ketersediaan, kemudian membuat booking setelah pengguna memberikan konfirmasi.

---

# 2. Problem Statement

Sistem booking konvensional mengharuskan pengguna mengisi beberapa field secara manual seperti:

* nama,
* tanggal,
* waktu,
* durasi,
* resource yang ingin digunakan.

Proses tersebut dapat dibuat lebih natural dengan menggunakan Voice AI.

Simple Voice Booking memungkinkan pengguna melakukan booking melalui percakapan sehingga proses booking menjadi lebih sederhana dan conversational.

---

# 3. Product Goals

## Primary Goal

Membangun MVP booking berbasis Voice AI yang memungkinkan pengguna menyelesaikan proses booking melalui percakapan suara.

## Secondary Goals

* Membuktikan integrasi Vapi dengan Next.js.
* Mengimplementasikan AI tool/function calling.
* Menghubungkan Voice AI dengan backend API.
* Menyimpan booking ke database.
* Menyediakan fallback booking melalui web form.

---

# 4. Target Users

## 4.1 Customer / Guest

Pengguna yang ingin melakukan booking dengan cepat tanpa mengisi banyak form.

## 4.2 Business / Service Provider

Pemilik atau pengelola resource yang dapat digunakan untuk booking.

Contoh resource:

* Meeting Room
* Consultation
* Studio
* Coworking Space
* Service Appointment
* Training Room

Untuk MVP, domain yang digunakan adalah **Meeting Room Booking**.

---

# 5. User Stories

### US-01 — Start Voice Booking

Sebagai pengguna, saya ingin berbicara dengan AI agar dapat melakukan booking tanpa mengisi form secara manual.

### US-02 — Provide Booking Information

Sebagai pengguna, saya ingin memberikan informasi booking melalui percakapan natural language.

### US-03 — Check Availability

Sebagai pengguna, saya ingin AI mengecek apakah jadwal yang saya inginkan tersedia.

### US-04 — Confirm Booking

Sebagai pengguna, saya ingin mendapatkan ringkasan booking sebelum booking dibuat.

### US-05 — View Booking

Sebagai pengguna, saya ingin melihat booking yang telah saya buat.

### US-06 — Cancel Booking

Sebagai pengguna, saya ingin membatalkan booking yang sudah dibuat.

---

# 6. MVP Scope

## Included

### Voice AI

* Start voice conversation
* Stop voice conversation
* Natural language interaction
* Collect booking information
* Ask follow-up questions
* Check availability
* Create booking
* Cancel booking
* Confirm booking

### Booking

* Create booking
* Read booking
* List bookings
* Cancel booking
* Availability checking

### Web Application

* Landing page
* Voice booking page
* Booking list
* Booking detail
* Manual booking fallback

### Backend

* REST API / Route Handler
* Validation
* Availability logic
* Booking persistence

---

# 7. Out of Scope

Fitur berikut tidak termasuk dalam MVP:

* Payment
* User authentication
* Social login
* Multi-tenant architecture
* Subscription
* Google Calendar integration
* Microsoft Calendar integration
* WhatsApp notification
* Email notification
* SMS notification
* Multiple branches
* Advanced analytics
* Complex admin dashboard
* AI recommendation engine
* Multi-language voice agent

Fitur tersebut dapat dikembangkan pada versi berikutnya.

---

# 8. Main User Flow

```text
User opens application
        |
        v
Landing Page
        |
        v
Click "Book with AI"
        |
        v
Microphone Permission
        |
        v
Start Vapi Voice Session
        |
        v
User explains booking request
        |
        v
AI extracts booking information
        |
        v
Missing information?
     /       \
   YES        NO
    |          |
    v          v
Ask user    Check availability
               |
               v
          Available?
          /       \
        NO         YES
        |           |
        v           v
Suggest       Show booking
alternative    summary
                    |
                    v
              User confirms
                    |
                    v
              Create booking
                    |
                    v
             Booking confirmed
```

---

# 9. Example Voice Conversation

### Scenario: Successful Booking

**User:**

> I want to book a meeting room tomorrow at 10 AM.

**AI:**

> Sure. What is your name?

**User:**

> Muhammad.

**AI:**

> How long would you like to book the meeting room?

**User:**

> Two hours.

**AI:**

> Let me check the availability.

AI menjalankan:

```text
check_availability()
```

Jika tersedia:

**AI:**

> The meeting room is available tomorrow from 10 AM to 12 PM. Would you like me to confirm the booking?

**User:**

> Yes.

AI menjalankan:

```text
create_booking()
```

**AI:**

> Your booking has been confirmed. Your booking ID is BK-000001.

---

# 10. Functional Requirements

## FR-01 — Landing Page

System harus menyediakan landing page dengan:

* Product name
* Short description
* "Book with AI" button
* "View Bookings" button

Example:

```text
Simple Booking

Book your meeting room using AI voice.

[ Book with AI ]

[ View Bookings ]
```

---

## FR-02 — Start Voice Session

Ketika user menekan "Book with AI":

1. System meminta microphone permission.
2. System menginisialisasi Vapi.
3. System memulai voice session.
4. System menampilkan status conversation.

Status dapat berupa:

```text
Connecting...
Listening...
Thinking...
Speaking...
Call ended
```

---

## FR-03 — Collect Booking Information

AI harus dapat mengumpulkan:

* customer name
* booking date
* start time
* duration

AI harus meminta informasi yang belum diberikan.

Contoh:

```text
User:
I want to book a room tomorrow.

AI:
What time would you like to book it?
```

---

## FR-04 — Natural Language Date & Time

AI harus dapat memahami format natural language seperti:

```text
tomorrow
next Monday
this Friday
at 10 AM
at half past two
for two hours
```

Backend harus mengubah informasi tersebut menjadi format terstruktur sebelum melakukan proses booking.

---

## FR-05 — Validate Booking

Backend harus melakukan validasi:

* date valid
* time valid
* duration valid
* booking tidak berada di masa lalu
* duration tidak melebihi batas maksimum
* slot belum digunakan

---

## FR-06 — Check Availability

AI harus dapat memanggil tool:

```text
check_availability
```

Input:

```json
{
  "date": "2026-09-20",
  "startTime": "10:00",
  "duration": 2
}
```

Output ketika tersedia:

```json
{
  "available": true
}
```

Output ketika tidak tersedia:

```json
{
  "available": false,
  "alternativeTimes": [
    "13:00",
    "15:00"
  ]
}
```

Jika jadwal tidak tersedia, AI harus menawarkan alternatif kepada user.

---

## FR-07 — Booking Confirmation

Sebelum membuat booking, AI harus memberikan ringkasan:

```text
Booking Summary

Name: Muhammad
Date: 20 September 2026
Time: 10:00 - 12:00
Resource: Meeting Room A

Would you like me to confirm this booking?
```

Booking hanya boleh dibuat setelah user memberikan konfirmasi.

---

## FR-08 — Create Booking

AI memanggil:

```text
create_booking
```

Input:

```json
{
  "name": "Muhammad",
  "date": "2026-09-20",
  "startTime": "10:00",
  "duration": 2
}
```

Output:

```json
{
  "success": true,
  "bookingId": "BK-000001",
  "status": "CONFIRMED"
}
```

---

## FR-09 — Booking Confirmation Result

Setelah booking berhasil, system harus menampilkan:

```text
Booking Confirmed

Booking ID: BK-000001

Name:
Muhammad

Date:
20 September 2026

Time:
10:00 - 12:00

Resource:
Meeting Room A

Status:
Confirmed
```

---

## FR-10 — Booking List

System harus menyediakan halaman:

```text
My Bookings
```

Contoh:

```text
BK-000001
Muhammad
20 September 2026
10:00 - 12:00
Confirmed

[ View ] [ Cancel ]
```

---

## FR-11 — Booking Detail

User dapat melihat detail:

* Booking ID
* Name
* Resource
* Date
* Start time
* End time
* Duration
* Status
* Created date

---

## FR-12 — Cancel Booking

User dapat membatalkan booking.

API:

```http
PATCH /api/bookings/:id
```

Request:

```json
{
  "status": "CANCELLED"
}
```

System harus mengubah status booking menjadi:

```text
CANCELLED
```

Booking yang sudah cancelled tidak boleh digunakan kembali sebagai booking aktif.

---

# 11. Vapi AI Tools

MVP menggunakan tiga tools utama.

## Tool 1 — check_availability

### Purpose

Memeriksa apakah resource tersedia pada waktu tertentu.

### Input

```json
{
  "date": "YYYY-MM-DD",
  "startTime": "HH:mm",
  "duration": 2
}
```

### Output

```json
{
  "available": true
}
```

---

## Tool 2 — create_booking

### Purpose

Membuat booking baru.

### Input

```json
{
  "name": "Muhammad",
  "date": "YYYY-MM-DD",
  "startTime": "HH:mm",
  "duration": 2
}
```

### Output

```json
{
  "success": true,
  "bookingId": "BK-000001",
  "status": "CONFIRMED"
}
```

---

## Tool 3 — cancel_booking

### Purpose

Membatalkan booking.

### Input

```json
{
  "bookingId": "BK-000001"
}
```

### Output

```json
{
  "success": true,
  "status": "CANCELLED"
}
```

---

# 12. Database Design

## Booking

```text
Booking
----------------
id
bookingId
name
resourceId
date
startTime
duration
status
createdAt
updatedAt
```

### Status

```text
PENDING
CONFIRMED
CANCELLED
```

---

## Resource

MVP hanya membutuhkan satu resource.

```text
Resource
----------------
id
name
type
capacity
status
createdAt
updatedAt
```

Initial data:

```text
Meeting Room A
```

Architecture harus tetap memungkinkan penambahan resource di masa depan.

---

# 13. API Specification

## Create Booking

```http
POST /api/bookings
```

Request:

```json
{
  "name": "Muhammad",
  "date": "2026-09-20",
  "startTime": "10:00",
  "duration": 2
}
```

---

## Get Bookings

```http
GET /api/bookings
```

---

## Get Booking

```http
GET /api/bookings/:id
```

---

## Check Availability

```http
POST /api/bookings/availability
```

Request:

```json
{
  "date": "2026-09-20",
  "startTime": "10:00",
  "duration": 2
}
```

---

## Cancel Booking

```http
PATCH /api/bookings/:id
```

Request:

```json
{
  "status": "CANCELLED"
}
```

---

# 14. UI Requirements

## 14.1 Landing Page

```text
-------------------------------------

         SIMPLE BOOKING

   Book your meeting room
        using AI voice.

       [ Book with AI ]

       [ View Bookings ]

-------------------------------------
```

---

# 15. Voice Booking UI

```text
-------------------------------------

          AI Booking Agent

               🎙️

          Listening...

     "What would you like
          to book?"

           [ End Call ]

-------------------------------------
```

UI harus memberikan visual feedback ketika:

* AI sedang listening
* AI sedang processing
* AI sedang speaking
* call sedang berlangsung
* call selesai

---

# 16. Booking List UI

```text
My Bookings

-------------------------------------
BK-000001

Muhammad

20 September 2026
10:00 - 12:00

Meeting Room A

CONFIRMED

[ View ] [ Cancel ]
-------------------------------------
```

---

# 17. Manual Booking Fallback

Jika Voice AI tidak tersedia, user harus tetap dapat melakukan booking melalui form.

Form:

```text
Name
[________________]

Date
[________________]

Start Time
[________________]

Duration
[________________]

[ Check Availability ]

[ Confirm Booking ]
```

Fallback ini memastikan aplikasi tetap dapat digunakan ketika microphone atau Vapi mengalami masalah.

---

# 18. Technology Stack

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

## Backend

* Next.js Route Handlers
* TypeScript

## AI

* Vapi
* Vapi Web SDK
* Vapi Tool Calling

## Database

* Prisma ORM
* SQLite untuk development/MVP

## Deployment

* Vercel

---

# 19. Environment Variables

```env
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key

VAPI_PRIVATE_KEY=your_vapi_private_key

DATABASE_URL="file:./dev.db"
```

Public key dapat digunakan pada client.

Private key hanya boleh digunakan pada server.

Jangan commit secret ke Git repository.

---

# 20. Security Requirements

System harus:

1. Tidak mengekspos Vapi private key.
2. Menggunakan environment variables.
3. Melakukan server-side validation.
4. Melakukan sanitasi input.
5. Tidak mempercayai data booking yang dikirim langsung dari client.
6. Melakukan pengecekan availability di backend.
7. Mencegah duplicate booking.
8. Tidak membuat booking tanpa confirmation dari user.

---

# 21. Booking Rules

MVP menggunakan rules berikut:

### Rule 1

Booking tidak boleh dibuat pada waktu yang sudah lewat.

### Rule 2

Booking tidak boleh overlap dengan booking CONFIRMED lain.

### Rule 3

Booking harus mempunyai:

* name
* date
* startTime
* duration

### Rule 4

Duration minimum:

```text
30 minutes
```

### Rule 5

Duration maksimum:

```text
8 hours
```

### Rule 6

Booking hanya dapat dibuat setelah user memberikan confirmation.

---

# 22. Error Handling

## Vapi unavailable

Tampilkan:

```text
Voice booking is currently unavailable.

You can continue with manual booking.

[ Book Manually ]
```

## Slot unavailable

AI mengatakan:

```text
Sorry, that time is already booked.

I can offer:
1 PM
3 PM
```

## Invalid date

AI meminta user memberikan tanggal yang valid.

## Database error

UI:

```text
Something went wrong.

Please try again.
```

---

# 23. Non-Functional Requirements

## Performance

* Normal API response target < 500 ms.
* UI harus responsive.
* Voice UI harus memberikan status feedback.

## Availability

Aplikasi harus tetap dapat digunakan secara manual apabila voice feature gagal.

## Maintainability

Kode harus menggunakan:

* TypeScript
* reusable components
* modular API handlers
* Prisma schema
* environment configuration

---

# 24. Project Structure

```text
simple-booking/
│
├── app/
│   ├── api/
│   │   └── bookings/
│   │       ├── route.ts
│   │       ├── availability/
│   │       │   └── route.ts
│   │       └── [id]/
│   │           └── route.ts
│   │
│   ├── booking/
│   │   └── page.tsx
│   │
│   ├── bookings/
│   │   └── page.tsx
│   │
│   ├── page.tsx
│   └── layout.tsx
│
├── components/
│   ├── VapiBooking.tsx
│   ├── BookingForm.tsx
│   ├── BookingList.tsx
│   └── BookingCard.tsx
│
├── lib/
│   ├── prisma.ts
│   └── booking.ts
│
├── prisma/
│   └── schema.prisma
│
├── public/
│
├── .env.local
├── .gitignore
├── package.json
└── README.md
```

---

# 25. Development Phases

## Phase 1 — Project Setup

* Initialize Next.js
* Configure TypeScript
* Configure Tailwind
* Install Prisma
* Configure SQLite
* Create database schema

## Phase 2 — Booking API

* Create booking API
* Get booking API
* Availability API
* Cancel booking API
* Validation
* Conflict detection

## Phase 3 — Vapi Integration

* Install Vapi SDK
* Configure public key
* Create Vapi assistant
* Configure system prompt
* Configure tools
* Connect tools to Next.js API

## Phase 4 — Voice UI

* Voice button
* Microphone permission
* Conversation state
* Listening state
* Speaking state
* Error state
* End call

## Phase 5 — Booking UI

* Booking list
* Booking detail
* Cancel booking
* Manual booking form
* Confirmation screen

## Phase 6 — Testing

Test scenarios:

* Successful booking
* Missing name
* Missing date
* Missing time
* Missing duration
* Invalid date
* Past date
* Unavailable slot
* Duplicate booking
* Booking cancellation
* Vapi failure
* Database failure

## Phase 7 — Deployment

```text
GitHub
   |
   v
Vercel
   |
   v
Next.js
```

Untuk production, database SQLite diganti dengan PostgreSQL.

---

# 26. Acceptance Criteria

### AC-01

User dapat membuka aplikasi dan melihat landing page.

### AC-02

User dapat memulai voice session.

### AC-03

AI dapat memahami permintaan booking sederhana.

### AC-04

AI dapat meminta informasi yang belum tersedia.

### AC-05

AI dapat mengecek availability melalui tool.

### AC-06

AI tidak membuat booking sebelum user memberikan confirmation.

### AC-07

Booking berhasil disimpan ke database.

### AC-08

System menghasilkan Booking ID.

### AC-09

Booking muncul pada booking list.

### AC-10

User dapat melihat detail booking.

### AC-11

User dapat membatalkan booking.

### AC-12

System menolak overlapping booking.

### AC-13

Private Vapi key tidak dikirim ke browser.

### AC-14

User dapat menggunakan manual booking apabila voice booking gagal.

---

# 27. MVP Definition of Done

MVP dinyatakan selesai apabila seluruh flow berikut berhasil:

```text
Open Website
     ↓
Book with AI
     ↓
Start Voice
     ↓
User speaks
     ↓
AI understands
     ↓
AI collects information
     ↓
Check Availability
     ↓
Booking Summary
     ↓
User Confirmation
     ↓
Create Booking
     ↓
Booking ID
     ↓
Booking List
```

Selain itu:

* [ ] No critical errors
* [ ] API validation implemented
* [ ] Availability checking implemented
* [ ] Duplicate booking prevented
* [ ] Cancellation implemented
* [ ] Manual fallback implemented
* [ ] Environment secrets secured
* [ ] README completed
* [ ] Production deployment tested

---

# 28. Future Roadmap

## Version 2

* Authentication
* PostgreSQL
* User profile
* Admin dashboard
* Multiple rooms
* Resource management
* Email confirmation
* Calendar view

## Version 3

* Google Calendar
* Microsoft Calendar
* WhatsApp notification
* Payment
* QR booking
* Reminder system

## Version 4 — SaaS

Multi-tenant architecture:

```text
Organization
│
├── Users
├── Resources
├── Bookings
├── AI Agents
├── Availability
├── Notifications
└── Settings
```

Subscription:

```text
Free
Pro
Business
Enterprise
```

Setiap organization dapat memiliki AI Agent sendiri untuk menangani booking.

---

# 29. Product Vision

Simple Voice Booking menjadi platform booking berbasis AI yang memungkinkan customer melakukan booking melalui percakapan natural language.

Konsep utama:

```text
Traditional Booking

Click
→ Select
→ Fill Form
→ Submit
→ Confirm


AI Booking

Talk
→ AI Understands
→ AI Checks
→ Confirm
→ Book
```

**Core principle:**

> Talk to book.

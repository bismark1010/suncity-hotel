# Sun City Hotel — Backend

A small Express + SQLite API for real room availability, booking storage,
and owner email notifications. This is the backend that replaces the
front-end-only storage in `sun-city-hotel.html` with an actual database.

Tested locally end-to-end: health check, room listing, availability
checks, booking creation, double-booking prevention, admin auth, and
cancellation all verified working before packaging.

## What it does

- Stores rooms and bookings in a real SQLite database (`data.sqlite`)
- Checks real availability per room/date range and blocks double-booking
  once a room's unit count is full (each room type starts with a set
  number of units — edit these in `db.js`)
- Emails you (via SMTP) the moment a booking is created — or just logs it
  to the console if you haven't set up SMTP yet
- Protects admin endpoints (viewing all bookings) behind a secret key

## 1. Run it locally

```bash
npm install
cp .env.example .env
# edit .env — at minimum set a real ADMIN_API_KEY
npm start
```

Server starts on `http://localhost:4000` (or `$PORT`). Try:

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/rooms
```

## 2. API reference

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | none | Uptime check |
| GET | `/api/rooms` | none | List room types + nightly rates |
| GET | `/api/availability?roomId=&checkin=&checkout=` | none | Check real availability + live price |
| POST | `/api/bookings` | none | Create a booking (body below) |
| GET | `/api/bookings/lookup?id=&email=` | none | Guest retrieves their own booking |
| GET | `/api/bookings` | `x-admin-key` header | List every booking |
| DELETE | `/api/bookings/:id?email=` | `x-admin-key` header **or** matching `?email=` | Cancel a booking |

**POST /api/bookings body:**
```json
{
  "roomId": "dune-suite",
  "guestName": "Jamie Rivera",
  "guestEmail": "jamie@example.com",
  "checkin": "2026-09-01",
  "checkout": "2026-09-04",
  "guests": 2
}
```
`roomId` is one of `first-light`, `dune-suite`, `last-light` (see `db.js`
to rename/add rooms). Returns `409` if the room is fully booked for those
dates, `400` for invalid input.

## 3. Turn on real email notifications

Leave `SMTP_*` blank in `.env` and bookings just get logged to the server
console — good enough for testing. For real emails, fill in:

```
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=you@yourdomain.com
SMTP_PASS=your-smtp-password-or-app-password
FROM_EMAIL=bookings@sunicityhotel.com
OWNER_EMAIL=owner@sunicityhotel.com
```

Any SMTP provider works — Gmail (with an App Password), SendGrid,
Mailgun, Postmark, Resend, etc.

## 4. Deploy it somewhere

This is a normal Node app — deploy it anywhere that runs Node 18+:

- **Render / Railway / Fly.io**: connect the repo, set the env vars from
  `.env.example` in their dashboard, they'll run `npm install && npm start`
  automatically.
- SQLite means one thing to watch: on platforms with ephemeral/rebuilt
  filesystems (like some free tiers), the database can reset on redeploy.
  Render and Railway both offer persistent disks/volumes — mount one and
  point `DATABASE_PATH` at it. If you outgrow SQLite entirely, swapping
  `better-sqlite3` for Postgres (e.g. `pg`) is a contained change limited
  to `db.js` and `utils/pricing.js`.

Once deployed, set `CORS_ORIGIN` to your real site's origin (not `*`) so
only your landing page can call the API.

## 5. Connect it to the landing page

`sun-city-hotel.html` currently saves bookings to browser-local storage.
To have it call this real API instead, replace the `fetch`-free booking
logic in its `<script>` with something like:

```js
const API_BASE = 'https://your-backend.onrender.com'; // your deployed URL

async function submitBooking(booking) {
  const res = await fetch(`${API_BASE}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId: ROOM_ID_MAP[booking.room], // e.g. { 'Dune Suite': 'dune-suite', ... }
      guestName: booking.name,
      guestEmail: booking.email,
      checkin: booking.checkin,
      checkout: booking.checkout,
      guests: Number(booking.guests)
    })
  });
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error || 'Booking failed');
  }
  return (await res.json()).booking;
}
```

Happy to wire this into the actual HTML file once it's deployed and you
have a live URL to point at.

const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const adminAuth = require('../middleware/adminAuth');
const { checkAvailability } = require('../utils/pricing');
const { notifyOwnerOfBooking } = require('../utils/notify');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/bookings
// body: { roomId, guestName, guestEmail, checkin, checkout, guests }
router.post('/', async (req, res) => {
  const { roomId, guestName, guestEmail, checkin, checkout } = req.body || {};
  const guests = Number(req.body?.guests) || 1;

  if (!roomId || !guestName || !guestEmail || !checkin || !checkout) {
    return res.status(400).json({ error: 'roomId, guestName, guestEmail, checkin, and checkout are required' });
  }
  if (!EMAIL_RE.test(guestEmail)) {
    return res.status(400).json({ error: 'guestEmail is not a valid email address' });
  }
  if (guestName.trim().length < 2) {
    return res.status(400).json({ error: 'guestName is too short' });
  }

  const result = checkAvailability({ roomId, checkin, checkout });
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  if (!result.available) {
    return res.status(409).json({ error: 'No units available for that room and date range' });
  }

  const booking = {
    id: crypto.randomUUID(),
    room_id: roomId,
    guest_name: guestName.trim(),
    guest_email: guestEmail.trim(),
    checkin,
    checkout,
    guests,
    nights: result.nights,
    subtotal: result.subtotal,
    fee: result.fee,
    total: result.total,
    status: 'confirmed',
    created_at: Date.now()
  };

  db.prepare(`
    INSERT INTO bookings
      (id, room_id, guest_name, guest_email, checkin, checkout, guests, nights, subtotal, fee, total, status, created_at)
    VALUES
      (@id, @room_id, @guest_name, @guest_email, @checkin, @checkout, @guests, @nights, @subtotal, @fee, @total, @status, @created_at)
  `).run(booking);

  // Fire-and-forget: don't make the guest wait on the owner's email send.
  notifyOwnerOfBooking(booking, result.room).catch((e) => console.error(e));

  res.status(201).json({ booking });
});

// GET /api/bookings  (admin only)
router.get('/', adminAuth, (req, res) => {
  const bookings = db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all();
  res.json({ bookings });
});

// GET /api/bookings/lookup?id=...&email=...  (guest can retrieve their own booking)
router.get('/lookup', (req, res) => {
  const { id, email } = req.query;
  if (!id || !email) {
    return res.status(400).json({ error: 'id and email are required' });
  }
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND guest_email = ?').get(id, email);
  if (!booking) return res.status(404).json({ error: 'No matching booking found' });
  res.json({ booking });
});

// DELETE /api/bookings/:id  (admin, or the guest if they pass their own email)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const adminKey = req.header('x-admin-key');
  const guestEmail = req.query.email;

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const isAdmin = adminKey && adminKey === process.env.ADMIN_API_KEY;
  const isOwnerOfBooking = guestEmail && guestEmail === booking.guest_email;
  if (!isAdmin && !isOwnerOfBooking) {
    return res.status(401).json({ error: 'Provide x-admin-key header or matching ?email= to cancel' });
  }

  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(id);
  res.json({ cancelled: true, id });
});

module.exports = router;

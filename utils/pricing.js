const db = require('../db');

const RESORT_FEE_RATE = 0.10;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(str) {
  if (!DATE_RE.test(str)) return false;
  const d = new Date(str + 'T00:00:00Z');
  return !Number.isNaN(d.getTime());
}

function nightsBetween(checkin, checkout) {
  const inD = new Date(checkin + 'T00:00:00Z');
  const outD = new Date(checkout + 'T00:00:00Z');
  return Math.round((outD - inD) / 86400000);
}

function getRoom(roomId) {
  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
}

function listRooms() {
  return db.prepare('SELECT * FROM rooms ORDER BY rate ASC').all();
}

// Counts confirmed bookings for a room whose date range overlaps the
// requested range. Two ranges overlap when existing.checkin < newCheckout
// AND existing.checkout > newCheckin.
function overlappingBookingsCount(roomId, checkin, checkout, excludeBookingId) {
  const row = db.prepare(`
    SELECT COUNT(*) AS n FROM bookings
    WHERE room_id = ?
      AND status = 'confirmed'
      AND checkin < ?
      AND checkout > ?
      AND id != COALESCE(?, '')
  `).get(roomId, checkout, checkin, excludeBookingId || null);
  return row.n;
}

function checkAvailability({ roomId, checkin, checkout }) {
  const room = getRoom(roomId);
  if (!room) return { error: 'Unknown room', status: 404 };
  if (!isValidDate(checkin) || !isValidDate(checkout)) {
    return { error: 'Dates must be in YYYY-MM-DD format', status: 400 };
  }
  const nights = nightsBetween(checkin, checkout);
  if (nights <= 0) {
    return { error: 'Check-out must be after check-in', status: 400 };
  }
  const todayStr = new Date().toISOString().split('T')[0];
  if (checkin < todayStr) {
    return { error: 'Check-in cannot be in the past', status: 400 };
  }

  const booked = overlappingBookingsCount(roomId, checkin, checkout);
  const remainingUnits = room.total_units - booked;
  const subtotal = nights * room.rate;
  const fee = Math.round(subtotal * RESORT_FEE_RATE);
  const total = subtotal + fee;

  return {
    room,
    nights,
    remainingUnits,
    available: remainingUnits > 0,
    rate: room.rate,
    subtotal,
    fee,
    total
  };
}

module.exports = {
  RESORT_FEE_RATE,
  isValidDate,
  nightsBetween,
  getRoom,
  listRooms,
  overlappingBookingsCount,
  checkAvailability
};

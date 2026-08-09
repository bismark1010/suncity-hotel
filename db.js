const Database = require('better-sqlite3');
const path = require('path');

const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'data.sqlite');
const db = new Database(DATABASE_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rate INTEGER NOT NULL,
    total_units INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id),
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    checkin TEXT NOT NULL,
    checkout TEXT NOT NULL,
    guests INTEGER NOT NULL,
    nights INTEGER NOT NULL,
    subtotal INTEGER NOT NULL,
    fee INTEGER NOT NULL,
    total INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings(room_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(checkin, checkout);
`);

// Seed the three room types from the landing page, only if the table is empty.
const roomCount = db.prepare('SELECT COUNT(*) AS n FROM rooms').get().n;
if (roomCount === 0) {
  const insertRoom = db.prepare(
    'INSERT INTO rooms (id, name, rate, total_units) VALUES (?, ?, ?, ?)'
  );
  const seed = db.transaction((rooms) => {
    for (const r of rooms) insertRoom.run(r.id, r.name, r.rate, r.total_units);
  });
  seed([
    { id: 'first-light', name: 'First Light Room', rate: 310, total_units: 20 },
    { id: 'dune-suite', name: 'Dune Suite', rate: 640, total_units: 12 },
    { id: 'last-light', name: 'Last Light Room', rate: 385, total_units: 20 }
  ]);
}

module.exports = db;

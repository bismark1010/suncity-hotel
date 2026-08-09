require('dotenv').config();
const express = require('express');
const cors = require('cors');

require('./db'); // ensures tables exist / rooms are seeded on boot

const roomsRouter = require('./routes/rooms');
const availabilityRouter = require('./routes/availability');
const bookingsRouter = require('./routes/bookings');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api/rooms', roomsRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/bookings', bookingsRouter);

// Optional: serve the static landing page from /public if you drop it in
// (e.g. copy sun-city-hotel.html to public/index.html).
app.use(express.static('public'));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Sun City backend listening on port ${PORT}`);
});

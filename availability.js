const express = require('express');
const { checkAvailability } = require('../utils/pricing');

const router = express.Router();

// GET /api/availability?roomId=dune-suite&checkin=2026-08-10&checkout=2026-08-13
router.get('/', (req, res) => {
  const { roomId, checkin, checkout } = req.query;
  if (!roomId || !checkin || !checkout) {
    return res.status(400).json({ error: 'roomId, checkin, and checkout are required query params' });
  }

  const result = checkAvailability({ roomId, checkin, checkout });
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }

  res.json({
    roomId,
    roomName: result.room.name,
    available: result.available,
    remainingUnits: result.remainingUnits,
    nights: result.nights,
    rate: result.rate,
    subtotal: result.subtotal,
    fee: result.fee,
    total: result.total
  });
});

module.exports = router;

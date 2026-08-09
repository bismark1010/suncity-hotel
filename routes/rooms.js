const express = require('express');
const { listRooms } = require('../utils/pricing');

const router = express.Router();

// GET /api/rooms
router.get('/', (req, res) => {
  res.json({ rooms: listRooms() });
});

module.exports = router;

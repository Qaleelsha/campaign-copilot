const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/segments — all saved segments
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM segments ORDER BY created_at DESC'
    );
    res.json({ success: true, segments: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
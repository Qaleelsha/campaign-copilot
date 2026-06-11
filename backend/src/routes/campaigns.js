const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/campaigns — all campaigns with stats
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.*,
        s.name AS segment_name,
        s.customer_count AS segment_size
      FROM campaigns c
      JOIN segments s ON s.id = c.segment_id
      ORDER BY c.created_at DESC
    `);
    res.json({ success: true, campaigns: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/campaigns/:id — single campaign with communication breakdown
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const campRes = await pool.query(
      `SELECT c.*, s.name AS segment_name
       FROM campaigns c
       JOIN segments s ON s.id = c.segment_id
       WHERE c.id = $1`,
      [id]
    );

    if (campRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    // get per-status breakdown from communications table
    const statsRes = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM communications
       WHERE campaign_id = $1
       GROUP BY status`,
      [id]
    );

    // get sample of individual communications
    const commsRes = await pool.query(
      `SELECT comm.*, cust.name AS customer_name, cust.city
       FROM communications comm
       JOIN customers cust ON cust.id = comm.customer_id
       WHERE comm.campaign_id = $1
       ORDER BY comm.created_at DESC
       LIMIT 50`,
      [id]
    );

    res.json({
      success: true,
      campaign: campRes.rows[0],
      status_breakdown: statsRes.rows,
      communications: commsRes.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
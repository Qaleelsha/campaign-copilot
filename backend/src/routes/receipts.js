const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// POST /api/receipts
// Called by the channel stub service with delivery status updates
// This is the async callback that closes the delivery loop
router.post('/', async (req, res) => {
  try {
    const { communication_id, status, reason } = req.body;

    if (!communication_id || !status) {
      return res.status(400).json({
        success: false,
        error: 'communication_id and status are required'
      });
    }

    const validStatuses = ['sent', 'delivered', 'opened', 'clicked', 'failed', 'converted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    // Build the timestamp field name dynamically based on status
    // e.g. status 'delivered' → sets delivered_at = NOW()
    const timestampField = `${status}_at`;
    const hasTimestamp = ['sent', 'delivered', 'opened', 'clicked'].includes(status);

    let query, values;

    if (status === 'failed') {
      query = `
        UPDATE communications
        SET status = $1, failed_reason = $2
        WHERE id = $3
        RETURNING campaign_id
      `;
      values = [status, reason || 'Unknown error', communication_id];
    } else if (hasTimestamp) {
      query = `
        UPDATE communications
        SET status = $1, ${timestampField} = NOW()
        WHERE id = $2
        RETURNING campaign_id
      `;
      values = [status, communication_id];
    } else {
      query = `
        UPDATE communications
        SET status = $1
        WHERE id = $2
        RETURNING campaign_id
      `;
      values = [status, communication_id];
    }

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Communication not found' });
    }

    const campaign_id = result.rows[0].campaign_id;

    // Update campaign-level aggregate counters
    // This keeps the analytics dashboard fast — no need to COUNT() every time
    const counterField = `total_${status}`;
    const validCounters = ['total_sent', 'total_delivered', 'total_opened', 'total_clicked', 'total_failed'];

    if (validCounters.includes(counterField)) {
      await pool.query(
        `UPDATE campaigns SET ${counterField} = ${counterField} + 1 WHERE id = $1`,
        [campaign_id]
      );
    }

    res.json({ success: true, message: `Communication updated to ${status}` });
  } catch (err) {
    console.error('POST /receipts error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
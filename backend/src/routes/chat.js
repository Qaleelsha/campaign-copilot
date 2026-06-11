const express = require('express');
const router = express.Router();
const { runAgent } = require('../services/agent');
const { runCampaign } = require('../services/campaignRunner');
const pool = require('../config/db');

// POST /api/chat
// Main conversation endpoint — takes message history, returns agent response
router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'messages array is required' });
    }

    const result = await runAgent(messages);
    res.json({ success: true, result });

  } catch (err) {
    console.error('POST /chat error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/chat/confirm
// Marketer approved the campaign plan — save segment + campaign and fire it
router.post('/confirm', async (req, res) => {
  try {
    const { plan } = req.body;

    if (!plan || !plan.rules || !plan.message_template) {
      return res.status(400).json({ success: false, error: 'Invalid campaign plan' });
    }

    const { resolveSegment } = require('../services/segmentEngine');
    const customers = await resolveSegment(plan.rules);

    if (customers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No customers match this segment'
      });
    }

    // save segment
    const segRes = await pool.query(
      `INSERT INTO segments (name, description, rules_json, source, customer_count)
       VALUES ($1, $2, $3, 'ai', $4)
       RETURNING id`,
      [
        plan.segment_name,
        plan.segment_description,
        JSON.stringify(plan.rules),
        customers.length
      ]
    );

    const segmentId = segRes.rows[0].id;

    // save campaign
    const campRes = await pool.query(
      `INSERT INTO campaigns (name, segment_id, channel, message_template, status)
       VALUES ($1, $2, $3, $4, 'draft')
       RETURNING id`,
      [plan.campaign_name, segmentId, plan.channel, plan.message_template]
    );

    const campaignId = campRes.rows[0].id;

    // fire campaign — runs async in background
    runCampaign(campaignId).catch(err => {
      console.error('Campaign run error:', err.message);
    });

    res.json({
      success: true,
      message: `Campaign launched to ${customers.length} customers`,
      campaign_id: campaignId,
      segment_id: segmentId,
      customer_count: customers.length
    });

  } catch (err) {
    console.error('POST /chat/confirm error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
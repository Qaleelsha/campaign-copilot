const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const CRM_RECEIPT_URL = process.env.CRM_RECEIPT_URL;

// Simulate realistic delivery outcomes
// These probabilities mirror real-world channel performance
const OUTCOME_PROFILES = {
  whatsapp: { delivered: 0.92, opened: 0.75, clicked: 0.30, failed: 0.08 },
  sms:      { delivered: 0.88, opened: 0.65, clicked: 0.15, failed: 0.12 },
  email:    { delivered: 0.85, opened: 0.40, clicked: 0.12, failed: 0.15 },
  rcs:      { delivered: 0.90, opened: 0.70, clicked: 0.25, failed: 0.10 },
};

const FAIL_REASONS = [
  'Invalid phone number',
  'User opted out',
  'Rate limit exceeded',
  'Network timeout',
  'Recipient unreachable',
];

// Simulate the full delivery lifecycle for one communication
// Each stage fires a callback to the CRM with a realistic delay
async function simulateDelivery(communicationId, channel) {
  const profile = OUTCOME_PROFILES[channel] || OUTCOME_PROFILES.whatsapp;
  const roll = Math.random();

  // helper — fire callback to CRM
  async function sendReceipt(status, reason = null) {
    try {
      await axios.post(CRM_RECEIPT_URL, {
        communication_id: communicationId,
        status,
        reason
      });
      console.log(`Receipt sent → ${communicationId} : ${status}`);
    } catch (err) {
      console.error(`Receipt failed for ${communicationId}:`, err.message);
    }
  }

  // Stage 1 — always mark as sent immediately
  await sendReceipt('sent');

  // Stage 2 — delivery outcome after short delay (simulates network round-trip)
  await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

  if (roll < profile.failed) {
    // message failed to deliver
    const reason = FAIL_REASONS[Math.floor(Math.random() * FAIL_REASONS.length)];
    await sendReceipt('failed', reason);
    return; // stop here — no further events for failed messages
  }

  await sendReceipt('delivered');

  // Stage 3 — opened? (only if delivered)
  await new Promise(r => setTimeout(r, 2000 + Math.random() * 4000));

  if (Math.random() < profile.opened) {
    await sendReceipt('opened');

    // Stage 4 — clicked? (only if opened)
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 3000));

    if (Math.random() < profile.clicked) {
      await sendReceipt('clicked');
    }
  }
}

// POST /send
// CRM calls this for each communication it wants to dispatch
app.post('/send', async (req, res) => {
  const { communication_id, channel, recipient, message } = req.body;

  if (!communication_id || !channel || !recipient) {
    return res.status(400).json({
      success: false,
      error: 'communication_id, channel, and recipient are required'
    });
  }

  // Respond immediately — delivery happens asynchronously
  // This is the key design: CRM doesn't wait for delivery, it just receives callbacks
  res.json({
    success: true,
    message: 'Message queued for delivery',
    communication_id
  });

  // Fire and forget — simulate async delivery in background
  simulateDelivery(communication_id, channel).catch(err => {
    console.error('Simulation error:', err.message);
  });
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Channel stub running', port: process.env.PORT || 3002 });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Channel stub running on http://localhost:${PORT}`);
});
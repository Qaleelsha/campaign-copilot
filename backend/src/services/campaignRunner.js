const pool = require('../config/db');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const CHANNEL_STUB_URL = process.env.CHANNEL_STUB_URL || 'http://localhost:3002/send';

// Personalise message template for each customer
// Replaces {name}, {city}, {discount} etc. with real values
function personalise(template, customer) {
  return template
    .replace(/{name}/gi, customer.name.split(' ')[0])
    .replace(/{city}/gi, customer.city || '')
    .replace(/{email}/gi, customer.email || '')
    .replace(/{total_spend}/gi, Math.round(customer.total_spend || 0));
}

// Fire a campaign to all customers in a segment
async function runCampaign(campaignId) {
  const client = await pool.connect();

  try {
    // fetch campaign details
    const campRes = await client.query(
      'SELECT * FROM campaigns WHERE id = $1',
      [campaignId]
    );

    if (campRes.rows.length === 0) {
      throw new Error('Campaign not found');
    }

    const campaign = campRes.rows[0];

    // fetch segment rules
    const segRes = await client.query(
      'SELECT * FROM segments WHERE id = $1',
      [campaign.segment_id]
    );

    if (segRes.rows.length === 0) {
      throw new Error('Segment not found');
    }

    const segment = segRes.rows[0];

    // resolve segment to actual customers
    const { resolveSegment } = require('./segmentEngine');
    const customers = await resolveSegment(segment.rules_json);

    if (customers.length === 0) {
      await client.query(
        "UPDATE campaigns SET status = 'completed' WHERE id = $1",
        [campaignId]
      );
      return { sent: 0, message: 'No customers matched the segment' };
    }

    // mark campaign as running
    await client.query(
      "UPDATE campaigns SET status = 'running', launched_at = NOW() WHERE id = $1",
      [campaignId]
    );

    let sentCount = 0;

    // create one communication record per customer and fire to channel stub
    for (const customer of customers) {
      const commId = uuidv4();
      const personalMessage = personalise(campaign.message_template, customer);
      const channel = campaign.channel;
      const recipient = channel === 'email' ? customer.email : customer.phone;

      // insert communication record
      await client.query(
        `INSERT INTO communications
           (id, campaign_id, customer_id, channel, message, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
        [commId, campaignId, customer.id, channel, personalMessage]
      );

      // fire to channel stub — non-blocking
      // if one fails we log and continue, don't stop the whole campaign
      axios.post(CHANNEL_STUB_URL, {
        communication_id: commId,
        channel,
        recipient,
        message: personalMessage
      }).catch(err => {
        console.error(`Failed to send to channel stub for ${commId}:`, err.message);
      });

      sentCount++;
    }

    // update campaign total_sent counter
    await client.query(
      'UPDATE campaigns SET total_sent = $1 WHERE id = $2',
      [sentCount, campaignId]
    );

    // mark completed after firing all
    await client.query(
      "UPDATE campaigns SET status = 'completed' WHERE id = $1",
      [campaignId]
    );

    return { sent: sentCount, customers: customers.length };

  } finally {
    client.release();
  }
}

module.exports = { runCampaign };
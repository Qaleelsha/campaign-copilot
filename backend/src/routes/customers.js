const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/customers
// Returns all customers with their total spend and last order date
// This powers the customer table in the frontend dashboard
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.email,
        c.phone,
        c.city,
        c.channel_preference,
        c.tags,
        c.created_at,
        COUNT(o.id)            AS total_orders,
        COALESCE(SUM(o.amount), 0)  AS total_spend,
        MAX(o.purchased_at)    AS last_purchase_at
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json({ success: true, customers: result.rows });
  } catch (err) {
    console.error('GET /customers error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/customers/:id
// Single customer with full order history
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const customerRes = await pool.query(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    );

    if (customerRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const ordersRes = await pool.query(
      'SELECT * FROM orders WHERE customer_id = $1 ORDER BY purchased_at DESC',
      [id]
    );

    res.json({
      success: true,
      customer: customerRes.rows[0],
      orders: ordersRes.rows
    });
  } catch (err) {
    console.error('GET /customers/:id error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/customers
// Add a single customer manually
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, city, channel_preference, tags } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'name and email are required' });
    }

    const result = await pool.query(
      `INSERT INTO customers (name, email, phone, city, channel_preference, tags)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, email, phone, city, channel_preference || 'whatsapp', tags || []]
    );

    res.status(201).json({ success: true, customer: result.rows[0] });
  } catch (err) {
    // unique violation — email already exists
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Email already exists' });
    }
    console.error('POST /customers error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
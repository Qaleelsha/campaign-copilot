const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/orders/:customerId
// All orders for a specific customer
router.get('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const result = await pool.query(
      `SELECT * FROM orders
       WHERE customer_id = $1
       ORDER BY purchased_at DESC`,
      [customerId]
    );

    res.json({ success: true, orders: result.rows });
  } catch (err) {
    console.error('GET /orders/:customerId error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orders
// All orders with customer name joined — used for analytics
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        o.*,
        c.name AS customer_name,
        c.email AS customer_email
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      ORDER BY o.purchased_at DESC
      LIMIT 200
    `);

    res.json({ success: true, orders: result.rows });
  } catch (err) {
    console.error('GET /orders error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
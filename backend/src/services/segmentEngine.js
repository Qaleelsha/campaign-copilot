const pool = require('../config/db');

// Takes rules_json produced by the AI agent and returns matching customers
// This is the bridge between AI intent and actual database query
async function resolveSegment(rules) {
  const conditions = [];
  const values = [];
  let idx = 1;

  // days since last purchase
  // e.g. { last_purchase_days: 30 } → customers who bought within last 30 days
  if (rules.last_purchase_days !== undefined) {
    conditions.push(`
      c.id IN (
        SELECT customer_id FROM orders
        WHERE purchased_at >= NOW() - INTERVAL '${parseInt(rules.last_purchase_days)} days'
      )
    `);
  }

  // customers who have NOT purchased in N days (lapsed customers)
  if (rules.lapsed_days !== undefined) {
    conditions.push(`
      c.id NOT IN (
        SELECT customer_id FROM orders
        WHERE purchased_at >= NOW() - INTERVAL '${parseInt(rules.lapsed_days)} days'
      )
    `);
  }

  // minimum total spend
  if (rules.min_spend !== undefined) {
    conditions.push(`
      c.id IN (
        SELECT customer_id FROM orders
        GROUP BY customer_id
        HAVING SUM(amount) >= $${idx}
      )
    `);
    values.push(parseFloat(rules.min_spend));
    idx++;
  }

  // product category filter
  // e.g. { category: "coffee" } → customers who bought coffee
  if (rules.category) {
    conditions.push(`
      c.id IN (
        SELECT customer_id FROM orders
        WHERE LOWER(category) = LOWER($${idx})
      )
    `);
    values.push(rules.category);
    idx++;
  }

  // city filter
  if (rules.city) {
    conditions.push(`LOWER(c.city) = LOWER($${idx})`);
    values.push(rules.city);
    idx++;
  }

  // tag filter — e.g. { tag: "vip" }
  if (rules.tag) {
    conditions.push(`$${idx} = ANY(c.tags)`);
    values.push(rules.tag);
    idx++;
  }

  // channel preference filter
  if (rules.channel_preference) {
    conditions.push(`c.channel_preference = $${idx}`);
    values.push(rules.channel_preference);
    idx++;
  }

  // minimum number of orders
  if (rules.min_orders !== undefined) {
    conditions.push(`
      c.id IN (
        SELECT customer_id FROM orders
        GROUP BY customer_id
        HAVING COUNT(*) >= $${idx}
      )
    `);
    values.push(parseInt(rules.min_orders));
    idx++;
  }

  const whereClause = conditions.length > 0
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  const query = `
    SELECT
      c.id,
      c.name,
      c.email,
      c.phone,
      c.city,
      c.channel_preference,
      c.tags,
      COALESCE(SUM(o.amount), 0) AS total_spend,
      MAX(o.purchased_at)        AS last_purchase_at
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.name
  `;

  const result = await pool.query(query, values);
  return result.rows;
}

module.exports = { resolveSegment };
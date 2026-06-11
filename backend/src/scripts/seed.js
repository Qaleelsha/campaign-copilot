const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

// Realistic data for a coffee chain brand called "Brew & Co."
const customers = [
  { name: 'Aarav Mehta',    email: 'aarav@example.com',   phone: '+919876543201', city: 'Mumbai',    pref: 'whatsapp', tags: ['vip', 'coffee-lover'] },
  { name: 'Priya Sharma',   email: 'priya@example.com',   phone: '+919876543202', city: 'Delhi',     pref: 'email',    tags: ['coffee-lover'] },
  { name: 'Rohan Verma',    email: 'rohan@example.com',   phone: '+919876543203', city: 'Bangalore', pref: 'sms',      tags: ['pastry-fan'] },
  { name: 'Sneha Iyer',     email: 'sneha@example.com',   phone: '+919876543204', city: 'Chennai',   pref: 'whatsapp', tags: ['vip', 'pastry-fan'] },
  { name: 'Karan Singh',    email: 'karan@example.com',   phone: '+919876543205', city: 'Mumbai',    pref: 'rcs',      tags: ['coffee-lover'] },
  { name: 'Meera Nair',     email: 'meera@example.com',   phone: '+919876543206', city: 'Kochi',     pref: 'whatsapp', tags: ['vip'] },
  { name: 'Arjun Patel',    email: 'arjun@example.com',   phone: '+919876543207', city: 'Ahmedabad', pref: 'email',    tags: ['coffee-lover'] },
  { name: 'Divya Rao',      email: 'divya@example.com',   phone: '+919876543208', city: 'Hyderabad', pref: 'sms',      tags: ['pastry-fan'] },
  { name: 'Vikram Das',     email: 'vikram@example.com',  phone: '+919876543209', city: 'Pune',      pref: 'whatsapp', tags: ['coffee-lover', 'vip'] },
  { name: 'Ananya Gupta',   email: 'ananya@example.com',  phone: '+919876543210', city: 'Delhi',     pref: 'email',    tags: [] },
  { name: 'Rahul Joshi',    email: 'rahul@example.com',   phone: '+919876543211', city: 'Mumbai',    pref: 'whatsapp', tags: ['coffee-lover'] },
  { name: 'Pooja Tiwari',   email: 'pooja@example.com',   phone: '+919876543212', city: 'Lucknow',   pref: 'sms',      tags: ['pastry-fan'] },
  { name: 'Nikhil Bose',    email: 'nikhil@example.com',  phone: '+919876543213', city: 'Kolkata',   pref: 'whatsapp', tags: ['vip'] },
  { name: 'Swati Kulkarni', email: 'swati@example.com',   phone: '+919876543214', city: 'Pune',      pref: 'email',    tags: ['coffee-lover'] },
  { name: 'Aditya Kumar',   email: 'aditya@example.com',  phone: '+919876543215', city: 'Bangalore', pref: 'rcs',      tags: ['coffee-lover', 'pastry-fan'] },
  { name: 'Lakshmi Menon',  email: 'lakshmi@example.com', phone: '+919876543216', city: 'Kochi',     pref: 'whatsapp', tags: ['vip', 'coffee-lover'] },
  { name: 'Siddharth Roy',  email: 'siddharth@example.com',phone:'+919876543217', city: 'Kolkata',   pref: 'sms',      tags: [] },
  { name: 'Kavya Reddy',    email: 'kavya@example.com',   phone: '+919876543218', city: 'Hyderabad', pref: 'email',    tags: ['pastry-fan'] },
  { name: 'Manish Shah',    email: 'manish@example.com',  phone: '+919876543219', city: 'Ahmedabad', pref: 'whatsapp', tags: ['coffee-lover'] },
  { name: 'Tanvi Desai',    email: 'tanvi@example.com',   phone: '+919876543220', city: 'Mumbai',    pref: 'rcs',      tags: ['vip', 'pastry-fan'] },
];

// Helper — random date within last N days
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * n));
  return d.toISOString();
}

const products = [
  { name: 'Cappuccino',       category: 'coffee',       min: 180, max: 220 },
  { name: 'Cold Brew',        category: 'coffee',       min: 200, max: 250 },
  { name: 'Espresso',         category: 'coffee',       min: 150, max: 180 },
  { name: 'Croissant',        category: 'pastry',       min: 120, max: 160 },
  { name: 'Blueberry Muffin', category: 'pastry',       min: 100, max: 140 },
  { name: 'Brew & Co. Mug',   category: 'merchandise',  min: 450, max: 650 },
  { name: 'Flat White',       category: 'coffee',       min: 190, max: 230 },
  { name: 'Matcha Latte',     category: 'coffee',       min: 220, max: 270 },
];

async function seed() {
  const client = await pool.connect();

  try {
    console.log('Seeding database...');

    // insert customers and collect their IDs
    const customerIds = [];
    for (const c of customers) {
      const res = await client.query(
        `INSERT INTO customers (name, email, phone, city, channel_preference, tags)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [c.name, c.email, c.phone, c.city, c.pref, c.tags]
      );
      customerIds.push(res.rows[0].id);
    }
    console.log(`Inserted ${customerIds.length} customers`);

    // insert 3-7 orders per customer with varied recency
    let orderCount = 0;
    for (const customerId of customerIds) {
      const numOrders = 3 + Math.floor(Math.random() * 5);
      for (let i = 0; i < numOrders; i++) {
        const p = products[Math.floor(Math.random() * products.length)];
        const amount = p.min + Math.random() * (p.max - p.min);
        // some customers have recent orders, some are lapsed
        const maxDaysAgo = Math.random() > 0.4 ? 30 : 90;
        await client.query(
          `INSERT INTO orders (customer_id, product_name, category, amount, purchased_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [customerId, p.name, p.category, amount.toFixed(2), daysAgo(maxDaysAgo)]
        );
        orderCount++;
      }
    }
    console.log(`Inserted ${orderCount} orders`);
    console.log('Seed complete. Database is ready.');

  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
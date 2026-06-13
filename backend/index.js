const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env'), override: false });
console.log('DEBUG ENV:', {
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
  GROQ_API_KEY: process.env.GROQ_API_KEY ? 'SET' : 'MISSING',
  PORT: process.env.PORT
});

const app = express();

app.use(cors());
app.use(express.json());

// routes
app.use('/api/customers',  require('./src/routes/customers'));
app.use('/api/orders',     require('./src/routes/orders'));
app.use('/api/receipts',   require('./src/routes/receipts'));
app.use('/api/chat',       require('./src/routes/chat'));
app.use('/api/segments',   require('./src/routes/segments'));
app.use('/api/campaigns',  require('./src/routes/campaigns'));

// health check
app.get('/', (req, res) => {
  res.json({ status: 'Campaign Copilot API running', version: '1.0.0' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

module.exports = app;
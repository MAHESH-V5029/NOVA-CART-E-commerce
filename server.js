require('dotenv').config();
const express = require('express');
const path = require('path');
const pool = require('./config/db');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'unavailable', message: 'Check your MySQL service and .env settings.' });
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', (req, res) => res.status(404).json({ message: 'API endpoint not found.' }));
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_DB_ERROR' || error.code === 'ECONNREFUSED') {
    return res.status(503).json({ message: 'Database unavailable. Check that MySQL is running and database/schema.sql has been imported.' });
  }
  return res.status(500).json({ message: 'Unexpected server error. Check the terminal for details.' });
});

async function start() {
  try {
    await pool.query('SELECT 1');
    app.listen(PORT, () => {
      console.log(`NovaCart is running at http://localhost:${PORT}`);
      console.log('Press Ctrl+C to stop the server.');
    });
  } catch (error) {
    console.error('Could not connect to MySQL. Check that MySQL is running, schema.sql was imported, and .env settings are correct.');
    console.error(error.message);
    process.exit(1);
  }
}
start();

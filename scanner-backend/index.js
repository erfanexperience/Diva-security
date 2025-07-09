require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 8080;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors());
app.use(express.json());

// Create table if not exists
pool.query(`
  CREATE TABLE IF NOT EXISTS scan_history (
    id SERIAL PRIMARY KEY,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data JSONB
  )
`);

// Save a scan
app.post('/api/history', async (req, res) => {
  const { data } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO scan_history (data) VALUES ($1) RETURNING *',
      [data]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all scans (with optional sorting/filtering)
app.get('/api/history', async (req, res) => {
  const { sort = 'desc' } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM scan_history ORDER BY scanned_at ${sort === 'asc' ? 'ASC' : 'DESC'}`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function update() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query("UPDATE transactions SET status = 'PENDING';");
    console.log(`Updated ${res.rowCount} transactions to PENDING.`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

update();

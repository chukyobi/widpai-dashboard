require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('Connecting to database...');

  try {
    const tableCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payment_methods';
    `);
    console.log('--- Columns in payment_methods ---');
    console.log(tableCheck.rows);

    const rowsCheck = await pool.query('SELECT * FROM payment_methods;');
    console.log('--- Existing rows in payment_methods ---');
    console.log(rowsCheck.rows);
  } catch (err) {
    console.error('Error checking schema:', err.message);
  } finally {
    await pool.end();
  }
}

check();

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function clean() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('Connecting to database...');

  // 1. Clean chat history and session handover tables
  console.log('Clearing chat_history table...');
  await pool.query('DELETE FROM chat_history;');
  
  console.log('Clearing session_handover table...');
  await pool.query('DELETE FROM session_handover;');

  // 2. Clean users table and recreate default admin user
  console.log('Clearing users table...');
  await pool.query('DELETE FROM users;');

  console.log('Recreating default admin user...');
  const passwordHash = await bcrypt.hash('widpai.alpha1.com', 12);
  await pool.query(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, 'admin')
  `, ['Admin_Jay', 'josephclinton.obi@gmail.com', passwordHash]);

  console.log('✅ Default admin user successfully recreated: josephclinton.obi@gmail.com');
  console.log('🎉 Database cleaned and reset successfully!');
  
  await pool.end();
}

clean().catch(err => {
  console.error('❌ Clean script failed:', err.message);
  process.exit(1);
});

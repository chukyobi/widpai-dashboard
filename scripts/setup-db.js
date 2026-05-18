require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function setup() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('Connecting to database...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Users table ready');

  const passwordHash = await bcrypt.hash('widpai.alpha1.com', 12);
  await pool.query(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, 'admin')
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      password_hash = EXCLUDED.password_hash,
      updated_at = NOW()
  `, ['Admin_Jay', 'josephclinton.obi@gmail.com', passwordHash]);

  console.log('✅ Admin user created: josephclinton.obi@gmail.com');
  await pool.end();
}

setup().catch(err => { console.error('❌ Setup failed:', err.message); process.exit(1); });

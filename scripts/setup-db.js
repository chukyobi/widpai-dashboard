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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(255) UNIQUE NOT NULL,
      whatsapp_number VARCHAR(255),
      full_name VARCHAR(255),
      email VARCHAR(255),
      country VARCHAR(100),
      id_type VARCHAR(50),
      id_number VARCHAR(100),
      id_document_url TEXT,
      selfie_url TEXT,
      kyc_status VARCHAR(50) DEFAULT 'not_started',
      kyc_step VARCHAR(50) DEFAULT 'name',
      rejection_reason TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_customers_session_id ON customers(session_id);
    CREATE INDEX IF NOT EXISTS idx_customers_kyc_status ON customers(kyc_status);
  `);
  console.log('✅ Customers table ready');

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

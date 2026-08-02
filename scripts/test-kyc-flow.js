require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function testKyc() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('Testing KYC database operations...');

  // 1. Insert a test customer
  const testSession = '254712345678';
  console.log(`Creating test customer profile for session: ${testSession}`);

  const insertRes = await pool.query(`
    INSERT INTO customers (
      session_id, whatsapp_number, full_name, email, country, id_type, id_number, id_document_url, kyc_status
    ) VALUES (
      $1, $1, 'John Doe', 'john.doe@example.com', 'Kenya', 'national_id', '12345678', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'submitted'
    )
    ON CONFLICT (session_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      kyc_status = EXCLUDED.kyc_status,
      updated_at = NOW()
    RETURNING *
  `, [testSession]);

  console.log('✅ Customer created:', insertRes.rows[0].full_name, '| Status:', insertRes.rows[0].kyc_status);

  // 2. Query back customer profile
  const selectRes = await pool.query('SELECT * FROM customers WHERE session_id = $1', [testSession]);
  console.log('✅ Customer query successful:', selectRes.rows[0].session_id, '| Country:', selectRes.rows[0].country);

  // 3. Clean up test customer
  await pool.query('DELETE FROM customers WHERE session_id = $1', [testSession]);
  console.log('✅ Test customer cleaned up cleanly');

  await pool.end();
}

testKyc().catch(err => {
  console.error('❌ KYC Test Failed:', err);
  process.exit(1);
});

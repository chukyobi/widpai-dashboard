require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('Connecting to database...');

  // 1. Clear existing rows in payment_methods
  console.log('Clearing existing payment methods...');
  await pool.query('DELETE FROM payment_methods;');

  // 2. Define payment methods to insert
  const methods = [
    // KES Methods
    {
      currency: 'KES',
      method_type: 'mpesa',
      details: {
        number: '[Click Edit to set Number]',
        name: '[Click Edit to set Name]'
      },
      is_active: true
    },
    {
      currency: 'KES',
      method_type: 'airtel',
      details: {
        number: '[Click Edit to set Number]',
        name: '[Click Edit to set Name]'
      },
      is_active: true
    },
    {
      currency: 'KES',
      method_type: 'paybill',
      details: {
        paybill_number: '[Set Pay Bill Number]',
        account_number: '[Set Account Number]',
        bank_name: '[Set Bank Name]',
        name: '[Set Account Name]'
      },
      is_active: true
    },
    {
      currency: 'KES',
      method_type: 'till',
      details: {
        till_number: '[Set Till Number]',
        business_name: '[Set Business Name]'
      },
      is_active: true
    },
    {
      currency: 'KES',
      method_type: 'bank',
      details: {
        account_number: '[Set Account Number]',
        bank_name: '[Set Bank Name]',
        name: '[Set Account Name]'
      },
      is_active: true
    },
    // NGN Methods
    {
      currency: 'NGN',
      method_type: 'bank',
      details: {
        account_number: '[Set Account Number]',
        account_name: '[Set Account Name]',
        bank_name: '[Set Bank Name]'
      },
      is_active: true
    }
  ];

  console.log('Inserting new payment methods...');
  for (const m of methods) {
    await pool.query(
      `INSERT INTO payment_methods (currency, method_type, details, is_active, updated_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [m.currency, m.method_type, JSON.stringify(m.details), m.is_active]
    );
    console.log(`✅ Added ${m.currency} - ${m.method_type}`);
  }

  console.log('🎉 All payment methods successfully added to the database!');
  await pool.end();
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function cleanChats() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('Connecting to database...');

  console.log('Clearing chat_history table...');
  const resChat = await pool.query('DELETE FROM chat_history;');
  console.log(`✅ Deleted rows from chat_history.`);

  console.log('Clearing session_handover table...');
  const resHandover = await pool.query('DELETE FROM session_handover;');
  console.log(`✅ Deleted rows from session_handover.`);

  console.log('🎉 All chats and user chat sessions cleared successfully!');
  await pool.end();
}

cleanChats().catch(err => {
  console.error('❌ Cleanup failed:', err.message);
  process.exit(1);
});

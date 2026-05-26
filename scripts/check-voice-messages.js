require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkVoice() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const result = await pool.query(`
    SELECT 
      session_id,
      message->>'content' AS content,
      message->>'media_url' AS media_url,
      message->>'media_type' AS media_type,
      created_at
    FROM chat_history
    WHERE 
      LOWER(message->>'content') LIKE '%voice%'
      OR LOWER(message->>'content') LIKE '%transcribed%'
      OR LOWER(message->>'content') LIKE '%cdn%'
      OR message->>'media_type' = 'audio'
    ORDER BY created_at DESC
    LIMIT 10;
  `);

  if (result.rows.length === 0) {
    console.log('No voice/audio messages found in the database.');
  } else {
    result.rows.forEach((row, i) => {
      console.log(`\n--- Row ${i + 1} ---`);
      console.log('session_id:', row.session_id);
      console.log('media_type:', row.media_type);
      console.log('media_url:', row.media_url);
      console.log('content:', row.content);
    });
  }

  await pool.end();
}

checkVoice().catch(err => console.error('Error:', err.message));

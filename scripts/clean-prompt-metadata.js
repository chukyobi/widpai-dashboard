require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function cleanPromptMetadata() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('Connecting to database...');

  const queryText = `
    UPDATE chat_history
    SET message = jsonb_set(
      message,
      '{content}',
      to_jsonb(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              message->>'content',
              '\\s*\\|\\s*Special Occasion:.*', '', 'g'
            ),
            '\\s*\\|\\s*Already Greeted Today:.*', '', 'g'
          ),
          '\\[System Context:[^\\]]*\\]', '', 'g'
        )
      )
    )
    WHERE message->>'content' LIKE '%| Special Occasion:%'
       OR message->>'content' LIKE '%| Already Greeted Today:%'
       OR message->>'content' LIKE '%[System Context:%';
  `;

  const res = await pool.query(queryText);
  console.log(`✅ Cleaned up ${res.rowCount} messages in chat_history table.`);
  await pool.end();
}

cleanPromptMetadata().catch(err => {
  console.error('❌ Cleanup failed:', err.message);
  process.exit(1);
});

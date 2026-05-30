require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function wipe() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  console.log('1. Clearing DB tables...');
  try {
    await pool.query('DELETE FROM chat_history;');
    console.log('✅ Cleared chat_history');
    await pool.query('DELETE FROM session_handover;');
    console.log('✅ Cleared session_handover');
    await pool.query('DELETE FROM transactions;');
    console.log('✅ Cleared transactions');
  } catch (err) {
    console.error('Error clearing DB:', err.message);
  } finally {
    await pool.end();
  }

  console.log('2. Wiping Cloudinary assets...');
  try {
    for (const resourceType of ['image', 'video', 'raw']) {
      let nextCursor = null;
      let count = 0;
      do {
        const result = await cloudinary.api.resources({
          resource_type: resourceType,
          max_results: 100,
          next_cursor: nextCursor
        });
        
        const publicIds = result.resources.map(r => r.public_id);
        if (publicIds.length > 0) {
          await cloudinary.api.delete_resources(publicIds, { resource_type: resourceType });
          count += publicIds.length;
        }
        nextCursor = result.next_cursor;
      } while (nextCursor);
      console.log(`✅ Deleted ${count} ${resourceType} files from Cloudinary`);
    }
  } catch(err) {
    console.error('Error clearing Cloudinary:', err);
  }
}

wipe();

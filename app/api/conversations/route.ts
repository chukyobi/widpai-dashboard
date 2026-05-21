import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await query(`
      SELECT
        c.session_id,
        COUNT(*) as message_count,
        MAX(c.created_at) as last_message_at,
        COALESCE(sh.unread_count, 0) as unread_count,
        (
          SELECT 
            CASE 
              WHEN message->>'media_type' = 'audio' OR message->>'content' LIKE '[Voice Message Transcribed]:%' THEN '🎵 Voice Note'
              WHEN message->>'media_type' = 'image' OR message->>'content' LIKE '[File Uploaded] Type: image%' THEN '📷 Image'
              WHEN message->>'media_type' = 'video' OR message->>'content' LIKE '[File Uploaded] Type: video%' THEN '🎥 Video'
              WHEN message->>'media_type' = 'document' OR message->>'content' LIKE '[File Uploaded] Type: document%' THEN '📄 Document'
              ELSE COALESCE(message->>'content', '—')
            END
          FROM chat_history c2
          WHERE c2.session_id = c.session_id
            AND message->>'type' IN ('human', 'ai', 'bot')
            AND NOT (message->>'type' = 'ai' AND (message->>'content' LIKE 'Calling %' OR message->>'content' LIKE 'Called %'))
          ORDER BY created_at DESC LIMIT 1
        ) as last_message
      FROM chat_history c
      LEFT JOIN session_handover sh ON c.session_id = sh.session_id
      GROUP BY c.session_id, sh.unread_count
      ORDER BY last_message_at DESC
    `)
    return NextResponse.json(result.rows)
  } catch (err) {
    console.error('[/api/conversations]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

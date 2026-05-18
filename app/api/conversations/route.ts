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
        session_id,
        COUNT(*) as message_count,
        MAX(created_at) as last_message_at,
        (
          SELECT message->>'content'
          FROM chat_history c2
          WHERE c2.session_id = c.session_id
          ORDER BY created_at DESC LIMIT 1
        ) as last_message
      FROM chat_history c
      GROUP BY session_id
      ORDER BY last_message_at DESC
    `)
    return NextResponse.json(result.rows)
  } catch (err) {
    console.error('[/api/conversations]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

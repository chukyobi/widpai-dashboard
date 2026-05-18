import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params
  const decoded = decodeURIComponent(sessionId)

  try {
    const result = await query(
      `SELECT
         id,
         message->>'type'    AS role,
         message->>'content' AS content,
         created_at
       FROM chat_history
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [decoded]
    )
    return NextResponse.json(result.rows)
  } catch (err) {
    console.error('[/api/messages]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

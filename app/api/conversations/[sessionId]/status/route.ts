import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params
  const decoded = decodeURIComponent(sessionId)

  try {
    const res = await query(
      'SELECT agent_status FROM session_handover WHERE session_id = $1',
      [decoded]
    )
    const status = res.rows[0]?.agent_status || 'ai'
    return NextResponse.json({ status })
  } catch (err) {
    console.error('[/api/conversations/status]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params
  const decoded = decodeURIComponent(sessionId)

  try {
    const body = await request.json()
    const { status } = body // 'ai' or 'manual'

    if (status !== 'ai' && status !== 'manual') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    await query(
      `INSERT INTO session_handover (session_id, agent_status, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (session_id)
       DO UPDATE SET agent_status = $2, updated_at = NOW()`,
      [decoded, status]
    )

    // Broadcast status change to the active WebSocket room and globally
    const wsBroadcast = (global as any).wsBroadcast
    if (wsBroadcast) {
      wsBroadcast(decoded, { type: 'status_change', sessionId: decoded, status })
      wsBroadcast('_global', { type: 'status_change', sessionId: decoded, status })
    }

    return NextResponse.json({ success: true, status })
  } catch (err) {
    console.error('[/api/conversations/status]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

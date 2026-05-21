import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET: Check if there's a global override active
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const res = await query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE agent_status = 'manual') as manual_count
       FROM session_handover`
    )
    const { total, manual_count } = res.rows[0]
    return NextResponse.json({
      total: parseInt(total),
      manualCount: parseInt(manual_count),
      allManual: parseInt(total) > 0 && parseInt(manual_count) === parseInt(total),
    })
  } catch (err) {
    console.error('[global-status GET]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

// POST: Set ALL sessions to 'ai' or 'manual' at once
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { status } = await request.json()
    if (status !== 'ai' && status !== 'manual') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Update every existing session
    await query(
      `UPDATE session_handover SET agent_status = $1, updated_at = NOW()`,
      [status]
    )

    // If switching to manual, also insert rows for any sessions that don't have a handover row yet
    if (status === 'manual') {
      await query(
        `INSERT INTO session_handover (session_id, agent_status, updated_at)
         SELECT DISTINCT session_id, 'manual', NOW()
         FROM chat_history
         WHERE session_id NOT IN (SELECT session_id FROM session_handover)
         ON CONFLICT (session_id) DO NOTHING`
      )
    }

    return NextResponse.json({ success: true, status })
  } catch (err) {
    console.error('[global-status POST]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

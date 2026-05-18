import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await req.json()
  const webhookUrl = process.env.N8N_WEBHOOK_URL

  if (webhookUrl && !webhookUrl.includes('example.com')) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, action: 'trigger_payout', timestamp: new Date().toISOString() }),
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}

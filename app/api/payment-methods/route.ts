import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await query(`
      SELECT id, currency, method_type, details, is_active, updated_at
      FROM payment_methods
      ORDER BY currency ASC, method_type ASC
    `)
    return NextResponse.json(result.rows)
  } catch (err) {
    console.error('[GET /api/payment-methods]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { currency, method_type, details, is_active } = await request.json()
    if (!currency || !method_type || !details) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO payment_methods (currency, method_type, details, is_active)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [currency.toUpperCase(), method_type, JSON.stringify(details), is_active ?? false]
    )
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (err) {
    console.error('[POST /api/payment-methods]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

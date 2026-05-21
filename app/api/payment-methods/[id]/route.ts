import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const { currency, method_type, details, is_active } = await request.json()
    const result = await query(
      `UPDATE payment_methods
       SET currency=$1, method_type=$2, details=$3, is_active=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [currency.toUpperCase(), method_type, JSON.stringify(details), is_active, id]
    )
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(result.rows[0])
  } catch (err) {
    console.error('[PUT /api/payment-methods/:id]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const { is_active } = await request.json()
    const result = await query(
      `UPDATE payment_methods SET is_active=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [is_active, id]
    )
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(result.rows[0])
  } catch (err) {
    console.error('[PATCH /api/payment-methods/:id]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    await query('DELETE FROM payment_methods WHERE id=$1', [id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/payment-methods/:id]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

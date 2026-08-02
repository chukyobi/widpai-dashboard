import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const decoded = decodeURIComponent(sessionId)

  try {
    const result = await query(
      'SELECT * FROM customers WHERE session_id = $1 LIMIT 1',
      [decoded]
    )

    if (result.rows.length === 0) {
      // Return a default empty customer profile with 'not_started' status
      return NextResponse.json({
        session_id: decoded,
        whatsapp_number: decoded,
        full_name: null,
        email: null,
        country: null,
        id_type: null,
        id_number: null,
        id_document_url: null,
        selfie_url: null,
        kyc_status: 'not_started',
        rejection_reason: null,
        notes: null
      })
    }

    return NextResponse.json(result.rows[0])
  } catch (err) {
    console.error('[/api/customers/[sessionId] GET]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params
  const decoded = decodeURIComponent(sessionId)

  try {
    const body = await request.json()
    const {
      kyc_status,
      rejection_reason,
      notes,
      full_name,
      email,
      country,
      id_type,
      id_number,
      id_document_url,
      selfie_url
    } = body

    // Ensure customer row exists first
    const existing = await query(
      'SELECT * FROM customers WHERE session_id = $1 LIMIT 1',
      [decoded]
    )

    if (existing.rows.length === 0) {
      // Create if it doesn't exist
      await query(
        `INSERT INTO customers (session_id, whatsapp_number, kyc_status) VALUES ($1, $1, $2)`,
        [decoded, kyc_status || 'not_started']
      )
    }

    const result = await query(
      `
      UPDATE customers SET
        kyc_status = COALESCE($1, kyc_status),
        rejection_reason = CASE WHEN $1 = 'rejected' THEN $2 ELSE rejection_reason END,
        notes = COALESCE($3, notes),
        full_name = COALESCE($4, full_name),
        email = COALESCE($5, email),
        country = COALESCE($6, country),
        id_type = COALESCE($7, id_type),
        id_number = COALESCE($8, id_number),
        id_document_url = COALESCE($9, id_document_url),
        selfie_url = COALESCE($10, selfie_url),
        updated_at = NOW()
      WHERE session_id = $11
      RETURNING *
      `,
      [
        kyc_status || null,
        rejection_reason || null,
        notes || null,
        full_name || null,
        email || null,
        country || null,
        id_type || null,
        id_number || null,
        id_document_url || null,
        selfie_url || null,
        decoded
      ]
    )

    return NextResponse.json(result.rows[0])
  } catch (err) {
    console.error('[/api/customers/[sessionId] PATCH]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  try {
    // 1. Auto-sync any chat sessions that don't have a customer profile yet
    await query(`
      INSERT INTO customers (session_id, whatsapp_number, kyc_status, created_at, updated_at)
      SELECT DISTINCT session_id, session_id, 'not_started', NOW(), NOW()
      FROM chat_history
      WHERE session_id NOT IN (SELECT session_id FROM customers)
        AND session_id IS NOT NULL
        AND session_id != 'undefined'
        AND session_id NOT LIKE 'wamid.%'
      ON CONFLICT (session_id) DO NOTHING
    `)

    // 2. Fetch customer records
    let sql = `SELECT * FROM customers WHERE session_id != 'undefined' AND session_id NOT LIKE 'wamid.%'`
    const params: any[] = []

    if (status && status !== 'all') {
      params.push(status)
      sql += ` AND kyc_status = $${params.length}`
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`)
      const paramIdx = params.length
      sql += ` AND (
        session_id ILIKE $${paramIdx} OR
        whatsapp_number ILIKE $${paramIdx} OR
        full_name ILIKE $${paramIdx} OR
        email ILIKE $${paramIdx} OR
        id_number ILIKE $${paramIdx}
      )`
    }

    sql += ` ORDER BY updated_at DESC`

    const result = await query(sql, params)
    return NextResponse.json(result.rows)
  } catch (err) {
    console.error('[/api/customers GET]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      session_id,
      whatsapp_number,
      full_name,
      email,
      country,
      id_type,
      id_number,
      id_document_url,
      selfie_url,
      kyc_status
    } = body

    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
    }

    const calculatedStatus = kyc_status || (full_name && id_number ? 'submitted' : 'not_started')

    const result = await query(
      `
      INSERT INTO customers (
        session_id,
        whatsapp_number,
        full_name,
        email,
        country,
        id_type,
        id_number,
        id_document_url,
        selfie_url,
        kyc_status,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (session_id) DO UPDATE SET
        whatsapp_number = COALESCE(EXCLUDED.whatsapp_number, customers.whatsapp_number),
        full_name = COALESCE(EXCLUDED.full_name, customers.full_name),
        email = COALESCE(EXCLUDED.email, customers.email),
        country = COALESCE(EXCLUDED.country, customers.country),
        id_type = COALESCE(EXCLUDED.id_type, customers.id_type),
        id_number = COALESCE(EXCLUDED.id_number, customers.id_number),
        id_document_url = COALESCE(EXCLUDED.id_document_url, customers.id_document_url),
        selfie_url = COALESCE(EXCLUDED.selfie_url, customers.selfie_url),
        kyc_status = EXCLUDED.kyc_status,
        updated_at = NOW()
      RETURNING *
      `,
      [
        session_id,
        whatsapp_number || session_id,
        full_name || null,
        email || null,
        country || null,
        id_type || null,
        id_number || null,
        id_document_url || null,
        selfie_url || null,
        calculatedStatus
      ]
    )

    return NextResponse.json(result.rows[0])
  } catch (err) {
    console.error('[/api/customers POST]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

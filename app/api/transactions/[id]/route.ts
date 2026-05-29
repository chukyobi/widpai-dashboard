import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json()
    const { id } = await params
    
    // Only allow valid statuses
    if (!['PENDING', 'COMPLETED', 'DISPUTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status provided' },
        { status: 400 }
      )
    }

    const result = await query(
      'UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    const transaction = result.rows[0]

    // Optional: Add logic to trigger n8n webhook here if needed
    // e.g. 
    // if (process.env.N8N_WEBHOOK_URL) {
    //   fetch(process.env.N8N_WEBHOOK_URL, {
    //     method: 'POST',
    //     body: JSON.stringify(transaction)
    //   })
    // }

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    )
  }
}

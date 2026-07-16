import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { status, payout_receipt_url } = await request.json()
    const { id } = await params
    
    // Only allow valid statuses
    if (!['PENDING', 'COMPLETED', 'DISPUTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status provided' },
        { status: 400 }
      )
    }

    const previous = await query(
      'SELECT status, payout_receipt_url FROM transactions WHERE id = $1',
      [id]
    )

    if (previous.rows.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    const { status: previousStatus, payout_receipt_url: previousReceiptUrl } = previous.rows[0]

    const result = await query(
      'UPDATE transactions SET status = $1, payout_receipt_url = COALESCE($2, payout_receipt_url), updated_at = NOW() WHERE id = $3 RETURNING *',
      [status, payout_receipt_url || null, id]
    )

    const transaction = result.rows[0]

    // Trigger n8n webhook so it can message the customer. The status change is
    // only allowed to stick if the customer actually gets notified - otherwise
    // roll back so the transaction stays retryable instead of silently stuck
    // in a new status with no notification ever sent.
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        const webhookRes = await fetch(process.env.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transaction)
        })
        if (!webhookRes.ok) {
          throw new Error(`n8n webhook responded with status ${webhookRes.status}`)
        }
      } catch (e) {
        console.error('Failed to notify customer via n8n webhook, rolling back status change', e)
        await query(
          'UPDATE transactions SET status = $1, payout_receipt_url = $2, updated_at = NOW() WHERE id = $3',
          [previousStatus, previousReceiptUrl, id]
        )
        return NextResponse.json(
          { error: 'Customer notification failed, so the transaction was not approved. Please try again.' },
          { status: 502 }
        )
      }
    }

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    )
  }
}

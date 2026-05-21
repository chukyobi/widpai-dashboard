import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params
  const phone = decodeURIComponent(sessionId)

  try {
    const body = await request.json()
    // msgType: 'text' | 'image' | 'video' | 'document'
    // content: text body or caption
    // mediaUrl: cloudinary URL for media messages
    const { content, msgType = 'text', mediaUrl, filename } = body

    if (msgType === 'text' && (!content || !content.trim())) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }
    if (msgType !== 'text' && !mediaUrl) {
      return NextResponse.json({ error: 'mediaUrl is required for media messages' }, { status: 400 })
    }

    // 1. Force the handover status to 'manual' when a human agent replies
    await query(
      `INSERT INTO session_handover (session_id, agent_status, updated_at)
       VALUES ($1, 'manual', NOW())
       ON CONFLICT (session_id)
       DO UPDATE SET agent_status = 'manual', updated_at = NOW()`,
      [phone]
    )

    const token = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID

    let whatsappMsgId = 'manual_' + Date.now()

    if (token && phoneId) {
      const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`

      // Build the correct WhatsApp payload based on message type
      let payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: msgType,
      }

      if (msgType === 'text') {
        payload.text = { body: content }
      } else if (msgType === 'image') {
        payload.image = { link: mediaUrl, caption: content || '' }
      } else if (msgType === 'video') {
        payload.video = { link: mediaUrl, caption: content || '' }
      } else if (msgType === 'document') {
        payload.document = {
          link: mediaUrl,
          filename: filename || 'document.pdf',
          caption: content || '',
        }
      } else if (msgType === 'audio') {
        payload.audio = { link: mediaUrl }
      } else if (msgType === 'sticker') {
        payload.sticker = { link: mediaUrl }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        console.error('WhatsApp API error:', errData)
        return NextResponse.json({ error: 'Failed to send WhatsApp message', details: errData }, { status: 502 })
      }

      const data = await res.json()
      whatsappMsgId = data.messages?.[0]?.id || whatsappMsgId
    } else {
      console.warn('[send] WhatsApp credentials missing — logging message to DB only.')
    }

    // 2. Save to chat_history with media fields so the dashboard renders it correctly
    const chatMessage: Record<string, unknown> = {
      type: 'ai',
      content: msgType === 'text' ? content : (content || ''),
      media_url: mediaUrl || null,
      media_type: msgType !== 'text' ? msgType : null,
      additional_kwargs: { is_manual: true, whatsapp_message_id: whatsappMsgId },
      response_metadata: {},
    }

    await query(
      `INSERT INTO chat_history (session_id, message, created_at) VALUES ($1, $2, NOW())`,
      [phone, JSON.stringify(chatMessage)]
    )

    // Broadcast newly sent manual message to the active session and globally
    const wsBroadcast = (global as any).wsBroadcast
    if (wsBroadcast) {
      const formattedMessage = {
        id: Date.now(),
        role: 'ai',
        content: msgType === 'text' ? content : (content || ''),
        media_url: mediaUrl || null,
        media_type: msgType !== 'text' ? msgType : null,
        is_manual: true,
        created_at: new Date().toISOString()
      }
      wsBroadcast(phone, { type: 'new_message', message: formattedMessage })
      
      let lastMsgText = '—'
      if (mediaUrl) {
        const typeMap: Record<string, string> = {
          audio: '🎵 Voice Note',
          image: '📷 Image',
          video: '🎥 Video',
          document: '📄 Document',
          sticker: '🖼 Sticker'
        }
        lastMsgText = typeMap[msgType] || '📷 Media'
      } else {
        lastMsgText = content || '—'
      }

      wsBroadcast('_global', { 
        type: 'session_update', 
        sessionId: phone, 
        last_message: lastMsgText,
        last_message_at: new Date().toISOString()
      })
    }

    return NextResponse.json({ success: true, messageId: whatsappMsgId })
  } catch (err) {
    console.error('[/api/conversations/send]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

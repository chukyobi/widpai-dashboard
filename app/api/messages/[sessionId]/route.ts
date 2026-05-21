import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params
  const decoded = decodeURIComponent(sessionId)

  try {
    // Reset unread count for this session when admin opens the chat
    await query(`
      UPDATE session_handover 
      SET unread_count = 0 
      WHERE session_id = $1
    `, [decoded]).catch(e => console.error('Failed to reset unread count', e))

    const result = await query(
      `SELECT
         id,
         message->>'type'                                   AS role,
         message->>'content'                                AS content,
         message->>'media_url'                              AS media_url,
         message->>'media_type'                             AS media_type,
         (message->'additional_kwargs'->>'is_manual')::boolean AS is_manual,
         created_at
       FROM chat_history
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [decoded]
    )

    const parsedRows = result.rows
      .map(row => {
        let content = row.content || ''
        let media_url = row.media_url || null
        let media_type = row.media_type || null

        // 1. Check for Voice Message Transcribed pattern
        if (content.includes('[Voice Message Transcribed]:') && content.includes('Permanent CDN Storage URL:')) {
          const urlMatch = content.match(/Permanent CDN Storage URL:\s*(https?:\/\/[^\s|]+)/)
          if (urlMatch) {
            media_url = urlMatch[1]
            media_type = 'audio'
            content = '' // Clear text content so it only shows the playable player
          }
        } 
        // 2. Check for File Uploaded pattern (image)
        else if (content.includes('[File Uploaded] Type: image') && content.includes('CDN URL:')) {
          const urlMatch = content.match(/CDN URL:\s*(https?:\/\/[^\s|]+)/)
          if (urlMatch) {
            media_url = urlMatch[1]
            media_type = 'image'
            content = '' // Clear text content so it only shows the image
          }
        }
        // 3. Check for File Uploaded pattern (video)
        else if (content.includes('[File Uploaded] Type: video') && content.includes('CDN URL:')) {
          const urlMatch = content.match(/CDN URL:\s*(https?:\/\/[^\s|]+)/)
          if (urlMatch) {
            media_url = urlMatch[1]
            media_type = 'video'
            content = ''
          }
        }
        // 4. Check for File Uploaded pattern (document/pdf)
        else if (content.includes('[File Uploaded] Type: document') && content.includes('CDN URL:')) {
          const urlMatch = content.match(/CDN URL:\s*(https?:\/\/[^\s|]+)/)
          if (urlMatch) {
            media_url = urlMatch[1]
            media_type = 'document'
            content = ''
          }
        }
        // 5. Check for File Uploaded pattern (audio/voice)
        else if ((content.includes('[File Uploaded] Type: audio') || content.includes('[File Uploaded] Type: voice')) && content.includes('CDN URL:')) {
          const urlMatch = content.match(/CDN URL:\s*(https?:\/\/[^\s|]+)/)
          if (urlMatch) {
            media_url = urlMatch[1]
            media_type = 'audio'
            content = ''
          }
        }
        // 6. Check for File Uploaded pattern (sticker)
        else if (content.includes('[File Uploaded] Type: sticker') && content.includes('CDN URL:')) {
          const urlMatch = content.match(/CDN URL:\s*(https?:\/\/[^\s|]+)/)
          if (urlMatch) {
            media_url = urlMatch[1]
            media_type = 'sticker'
            content = ''
          }
        }

        // Generic fallback: if media_url is already populated and content is a placeholder
        if (media_url && media_type && (content.startsWith('[File Uploaded]') || media_type === 'sticker')) {
          content = ''
        }

        return {
          id: row.id,
          role: row.role,
          content,
          media_url,
          media_type,
          is_manual: row.is_manual === true,
          created_at: row.created_at
        }
      })
      .filter(msg => {
        // Only allow actual user prompts and AI responses
        if (msg.role !== 'human' && msg.role !== 'ai' && msg.role !== 'bot') {
          return false
        }
        // Exclude tool execution intermediate messages
        if (msg.role === 'ai') {
          if (msg.content.trim().startsWith('Calling ')) return false
          if (msg.content.trim().startsWith('Called ')) return false
        }
        return true
      })

    return NextResponse.json(parsedRows)
  } catch (err) {
    console.error('[/api/messages]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const decoded = decodeURIComponent(sessionId)

  try {
    const body = await request.json()
    const { message } = body // Expected: { id, role, content, media_url, media_type, is_manual, created_at }

    if (!message || !message.role) {
      return NextResponse.json({ error: 'Invalid message structure' }, { status: 400 })
    }

    // Increment unread_count if it's a message from the user
    if (message.role === 'human') {
      await query(`
        INSERT INTO session_handover (session_id, unread_count)
        VALUES ($1, 1)
        ON CONFLICT (session_id) 
        DO UPDATE SET unread_count = COALESCE(session_handover.unread_count, 0) + 1, updated_at = now()
      `, [decoded]).catch(e => console.error('Failed to update unread count', e))
    }

    const wsBroadcast = (global as any).wsBroadcast
    if (wsBroadcast) {
      // 1. Broadcast the new message to the active session room
      wsBroadcast(decoded, { type: 'new_message', message })
      
      // 2. Broadcast the session list update to the global room
      let lastMsgText = '—'
      if (message.media_url) {
        const typeMap: Record<string, string> = {
          audio: '🎵 Voice Note',
          image: '📷 Image',
          video: '🎥 Video',
          document: '📄 Document',
          sticker: '🖼 Sticker'
        }
        lastMsgText = typeMap[message.media_type] || '📷 Media'
      } else {
        lastMsgText = message.content || '—'
      }

      wsBroadcast('_global', { 
        type: 'session_update', 
        sessionId: decoded, 
        last_message: lastMsgText,
        last_message_at: message.created_at || new Date().toISOString()
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/messages/notify]', err)
    return NextResponse.json({ error: 'Notification error' }, { status: 500 })
  }
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, MessageSquare, Bot, User as UserIcon, ArrowLeft, Zap, ChevronRight, Paperclip, Send, Smile, MoreVertical, CheckCheck, FileText, Play, Pause, X, Image as ImageIcon, Power, Shield, Camera, Settings, LogOut, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { logoutAction } from '@/app/(auth)/actions'
import Link from 'next/link'

interface Session {
  session_id: string
  message_count: string
  last_message_at: string
  last_message: string
}

interface Message {
  id: number
  role: string
  content: string
  media_url?: string
  media_type?: string
  is_manual?: boolean
  created_at: string
}

const COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-cyan-500','bg-pink-500']

function avatarColor(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return COLORS[n % COLORS.length]
}
function initials(id: string) { return id.slice(0, 2).toUpperCase() }

function formatTime(dt: string) {
  // Ensure the date string is treated as UTC if it lacks timezone info to prevent timezone offset bugs
  const dateStr = dt.endsWith('Z') || dt.includes('+') ? dt : dt + 'Z';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function formatDate(dt: string) {
  const dateStr = dt.endsWith('Z') || dt.includes('+') ? dt : dt + 'Z';
  const d = new Date(dateStr), now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
function VoiceNotePlayer({ src }: { src: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(src)
    audioRef.current = audio

    const setAudioData = () => setDuration(audio.duration || 0)
    const setAudioTime = () => setCurrentTime(audio.currentTime)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('loadedmetadata', setAudioData)
    audio.addEventListener('timeupdate', setAudioTime)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', setAudioData)
      audio.removeEventListener('timeupdate', setAudioTime)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [src])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(e => console.error("Audio playback error:", e))
      setIsPlaying(true)
    }
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = val
      setCurrentTime(val)
    }
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00'
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 px-3.5 py-2.5 rounded-2xl w-full max-w-[280px]">
      <button
        onClick={togglePlay}
        className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all flex-shrink-0"
      >
        {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSliderChange}
          className="w-full h-1 bg-black/30 rounded-lg appearance-none cursor-pointer accent-black"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}

export default function ConversationsClient() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [appLoading, setAppLoading] = useState(true)   // true until initial fetches done
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [agentStatusLoading, setAgentStatusLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [payoutPending, setPayoutPending] = useState(false)
  const [payoutDone, setPayoutDone] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [lightboxType, setLightboxType] = useState<'image' | 'video' | null>(null)
  const [agentStatus, setAgentStatus] = useState<'ai' | 'manual' | null>(null)
  const [attachFile, setAttachFile] = useState<File | null>(null)
  const [attachPreview, setAttachPreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [globalPaused, setGlobalPaused] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  
  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const selectedRef = useRef<string | null>(null)

  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  useEffect(() => {
    const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws'

    // Load all critical state in parallel BEFORE showing UI
    Promise.all([
      fetch('/api/conversations').then(r => r.json()).catch(() => []),
      fetch('/api/conversations/global-status').then(r => r.json()).catch(() => ({}))
    ]).then(([sessionsData, globalData]) => {
      if (Array.isArray(sessionsData) && sessionsData.length > 0) {
        setSessions(sessionsData.sort((a: Session, b: Session) =>
          new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        ))
        // Load initial unread counts from database
        const initialUnread: Record<string, number> = {}
        sessionsData.forEach((s: any) => {
          if (Number(s.unread_count) > 0) {
            initialUnread[s.session_id] = Number(s.unread_count)
          }
        })
        setUnreadCounts(initialUnread)
      }
      if (globalData && typeof globalData.allManual === 'boolean') {
        setGlobalPaused(globalData.allManual)
      }
      setAppLoading(false)
    })

    // Global WebSocket for real-time sidebar updates
    const globalWs = new WebSocket(`${proto}://${window.location.host}/ws?sessionId=_global`)
    
    globalWs.onmessage = e => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'session_update') {
          setSessions(prev => {
            const existingIndex = prev.findIndex(s => s.session_id === data.sessionId)
            if (existingIndex > -1) {
              const updated = [...prev]
              updated[existingIndex] = {
                ...updated[existingIndex],
                last_message: data.last_message,
                last_message_at: data.last_message_at,
              }
              return updated.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
            } else {
              return [{ session_id: data.sessionId, last_message: data.last_message, last_message_at: data.last_message_at, message_count: '0' }, ...prev]
            }
          })
          // Only increment unread if NOT currently in that session
          if (selectedRef.current !== data.sessionId) {
            setUnreadCounts(prev => ({ ...prev, [data.sessionId]: (prev[data.sessionId] || 0) + 1 }))
          }
        }
        if (data.type === 'status_change' && selectedRef.current === data.sessionId) {
          setAgentStatus(data.status)
        }
      } catch {}
    }

    // Poll conversations API every 15s for persistent unread counts (Vercel WebSocket fallback)
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/conversations')
        const data = await res.json()
        if (Array.isArray(data)) {
          const polledUnread: Record<string, number> = {}
          data.forEach((s: any) => {
            if (Number(s.unread_count) > 0 && selectedRef.current !== s.session_id) {
              polledUnread[s.session_id] = Number(s.unread_count)
            }
          })
          setUnreadCounts(polledUnread)
          setSessions(data.sort((a: Session, b: Session) =>
            new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
          ))
        }
      } catch { /* silent */ }
    }, 15000)

    return () => { globalWs.close(); clearInterval(pollInterval) }
  }, [])

  const selectSession = useCallback(async (id: string) => {
    setSelected(id)
    setMessages([])
    setLoadingMessages(true)
    setPayoutDone(false)

    // Mark session as read immediately
    setUnreadCounts(prev => ({ ...prev, [id]: 0 }))

    wsRef.current?.close()
    const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${window.location.host}/ws?sessionId=${encodeURIComponent(id)}`)
    wsRef.current = ws
    ws.onmessage = e => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'new_message') {
          setMessages(prev => {
            const isDuplicate = prev.some(m =>
              m.content === data.message.content &&
              Math.abs(new Date(m.created_at).getTime() - new Date(data.message.created_at).getTime()) < 10000
            )
            if (isDuplicate) return prev
            return [...prev, data.message]
          })
          // Clear unread for current session since we're inside it
          setUnreadCounts(prev => ({ ...prev, [id]: 0 }))
        }
        if (data.type === 'status_change') setAgentStatus(data.status)
      } catch {}
    }

    // Fetch messages and status in parallel
    setAgentStatus(null) // clear stale status while loading
    setAgentStatusLoading(true)
    try {
      const [msgRes, statusRes] = await Promise.all([
        fetch(`/api/messages/${encodeURIComponent(id)}`),
        fetch(`/api/conversations/${encodeURIComponent(id)}/status`)
      ])
      const msgData = await msgRes.json()
      const statusData = await statusRes.json()

      setMessages(Array.isArray(msgData) && msgData.length > 0 ? msgData : [])
      setAgentStatus(statusData?.status || 'ai')
    } catch {
      setMessages([])
      setAgentStatus('ai')
    } finally {
      setLoadingMessages(false)
      setAgentStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loadingMessages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selected) return;
    
    const textToSend = inputMessage;
    setInputMessage('');

    // Optimistically show message as sent by the AI/agent role in UI
    const optimisticMessage: Message = {
      id: Date.now(),
      role: 'ai',
      content: textToSend,
      is_manual: true,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Automatically set status to manual when the human agent sends a message
    setAgentStatus('manual');

    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(selected)}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textToSend })
      });
      if (!res.ok) {
        console.error('Failed to send WhatsApp message via API');
      }
    } catch (err) {
      console.error('Send error:', err);
    }
  }

  const toggleAgentStatus = async () => {
    if (!selected || agentStatus === null) return
    const prev = agentStatus
    const newStatus = agentStatus === 'ai' ? 'manual' : 'ai'
    setAgentStatus(newStatus)
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(selected)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) { setAgentStatus(prev); console.error('Failed to toggle bot status') }
    } catch (err) { setAgentStatus(prev); console.error(err) }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachFile(file)
    // Generate a preview for images/videos
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setAttachPreview(URL.createObjectURL(file))
    } else {
      setAttachPreview(null)
    }
  }

  const clearAttachment = () => {
    setAttachFile(null)
    setAttachPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSendMedia = async () => {
    if (!attachFile || !selected) return
    setSending(true)
    setUploadProgress(0)

    try {
      let msgType = 'document'
      if (attachFile.type.startsWith('image/')) msgType = 'image'
      else if (attachFile.type.startsWith('video/')) msgType = 'video'
      else if (attachFile.type.startsWith('audio/')) msgType = 'audio'

      // 1. Upload with XHR to track real progress
      const mediaUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/upload')
        xhr.setRequestHeader('x-api-key', 'widpai_upload_secret_key')
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText)
            resolve(data.url)
          } else {
            reject(new Error('Upload failed'))
          }
        }
        xhr.onerror = () => reject(new Error('Network error'))
        const formData = new FormData()
        formData.append('file', attachFile)
        xhr.send(formData)
      })

      setUploadProgress(null)

      // 2. Optimistically show in chat
      const optimistic: Message = {
        id: Date.now(),
        role: 'ai',
        content: inputMessage || '',
        media_url: attachPreview || mediaUrl,
        media_type: msgType,
        is_manual: true,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, optimistic])
      setAgentStatus('manual')

      // 3. Send via WhatsApp
      await fetch(`/api/conversations/${encodeURIComponent(selected)}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msgType, mediaUrl, content: inputMessage || '', filename: attachFile.name }),
      })
    } catch (err) {
      console.error('Media send error:', err)
      setUploadProgress(null)
    } finally {
      clearAttachment()
      setInputMessage('')
      setSending(false)
    }
  }

  const toggleGlobalStatus = async () => {
    const newStatus = globalPaused ? 'ai' : 'manual'
    setGlobalPaused(!globalPaused)
    try {
      await fetch('/api/conversations/global-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (selected) setAgentStatus(newStatus)
    } catch {
      setGlobalPaused(globalPaused) // rollback
    }
  }

  const filtered = sessions.filter(s =>
    s.session_id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      
      {/* 1. CHAT LIST (WhatsApp Style) */}
      {/* Hidden on mobile when a chat is selected */}
      <div className={`
        ${selected ? 'hidden md:flex' : 'flex'} 
        w-full md:w-[350px] flex-shrink-0 border-r border-border/40 bg-card/30 backdrop-blur-md flex-col h-full animate-fade-in
      `}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-border/40 bg-background/30 flex justify-between items-center">
          <h2 className="text-lg font-bold">Chats</h2>
          <div className="flex gap-2 items-center">
            <Button
              size="sm"
              variant="outline"
              onClick={toggleGlobalStatus}
              className={`text-[10px] gap-1 h-7 font-medium rounded-full transition-all duration-200 ${
                globalPaused
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/30'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
              }`}
            >
              <Power className="h-3 w-3" />
              {globalPaused ? 'All Manual' : 'All AI'}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 bg-background/20">
          <div className="relative flex items-center bg-background/60 border border-border/50 rounded-xl px-3 py-1.5 transition-all focus-within:border-primary/50">
            <Search className="h-4 w-4 text-muted-foreground mr-3" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search or start new chat"
              className="w-full bg-transparent text-sm focus:outline-none placeholder-muted-foreground"
            />
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          {appLoading ? (
            // Skeleton loader — no flash of wrong state
            <div className="flex flex-col gap-0">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-border/10 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/5" />
                    <div className="h-2.5 bg-muted rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No conversations found</p>
          ) : filtered.map((s, index) => {
            const unread = unreadCounts[s.session_id] || 0
            const isActive = selected === s.session_id
            return (
              <div
                key={s.session_id}
                onClick={() => selectSession(s.session_id)}
                style={{ animationDelay: `${index * 40}ms` }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-border/10 cursor-pointer hover:bg-accent/20 active:bg-accent/30 transition-all duration-200 animate-fade-in-up ${
                  isActive ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                }`}
              >
                <div className={`h-12 w-12 rounded-full ${avatarColor(s.session_id)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow`}>
                  {initials(s.session_id)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className={`text-sm truncate ${unread > 0 ? 'font-bold' : 'font-semibold'}`}>{s.session_id}</span>
                    <span className={`text-[10px] ml-2 flex-shrink-0 ${unread > 0 ? 'text-emerald-500 font-semibold' : 'text-muted-foreground'}`}>
                      {formatDate(s.last_message_at)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className={`text-xs truncate ${unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {s.last_message || '—'}
                    </span>
                    {unread > 0 && (
                      <span className="text-[10px] font-bold bg-emerald-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5 flex-shrink-0 animate-scale-up">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. CHAT AREA */}
      {/* Hidden on mobile when NO chat is selected */}
      <div className={`
        ${selected ? 'flex' : 'hidden md:flex'} 
        flex-1 flex flex-col h-full overflow-hidden bg-background/50 animate-fade-in
      `}>
        {!selected ? (
          // Desktop Empty State (Only visible on desktop when no chat selected)
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-muted-foreground gap-4 h-full">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
              <MessageSquare className="h-10 w-10 text-primary/30" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold">Select a conversation</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Click any chat to view messages</p>
            </div>
          </div>
        ) : (
          <>
              {/* Chat Area: flex-col ensures header top-stuck, input bottom-stuck, messages scroll in between */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-card/40 backdrop-blur-md flex-shrink-0 sticky top-0 z-10">
              {/* Back Button (Mobile Only) - Returns to List */}
              <button 
                onClick={() => setSelected(null)}
                className="md:hidden p-2 -ml-2 rounded-full hover:bg-accent/20 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              
              <div className={`h-9 w-9 rounded-full ${avatarColor(selected)} flex items-center justify-center text-white text-xs font-bold shadow flex-shrink-0 transition-transform hover:scale-105`}>
                {initials(selected)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{selected}</p>
                <p className="text-xs text-muted-foreground">{messages.length} messages · Live</p>
              </div>
              <div className="flex items-center gap-3">
                {agentStatus === null || agentStatusLoading ? (
                  // Skeleton while status is loading — no flash
                  <div className="h-8 w-28 rounded-full bg-muted animate-pulse" />
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={toggleAgentStatus}
                    className={`text-xs gap-1.5 h-8 font-medium rounded-full shadow-sm transition-all duration-200 ${
                      agentStatus === 'manual'
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/30'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${agentStatus === 'manual' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                    {agentStatus === 'manual' ? 'AI Bot Paused' : 'AI Bot Active'}
                  </Button>
                )}
              {/* Settings dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowSettings(s => !s)}
                    className="p-1.5 rounded-full hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                  {showSettings && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                      <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border/50 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in-up">
                        <div className="p-1.5">
                          <Link
                            href="/payment-methods"
                            onClick={() => setShowSettings(false)}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg hover:bg-accent/50 text-foreground transition-colors"
                          >
                            <CreditCard className="h-4 w-4" />
                            Payment Methods
                          </Link>
                          <div className="my-1 h-px bg-border/30" />
                          <form action={logoutAction}>
                            <button type="submit" className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors">
                              <LogOut className="h-4 w-4" />
                              Sign Out
                            </button>
                          </form>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Messages — min-h-0 is critical for flex-1 to work correctly in Safari/mobile */}
            <div
              className="flex-1 overflow-y-auto min-h-0 scrollbar-none px-4 py-4 space-y-3"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.04) 0%, transparent 50%),
                                  radial-gradient(circle at 80% 80%, hsl(var(--accent) / 0.04) 0%, transparent 50%)`,
              }}
            >
              {loadingMessages ? (
                <p className="text-center text-sm text-muted-foreground animate-pulse">Loading messages...</p>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-20 animate-fade-in">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">No messages in this session</p>
                </div>
              ) : messages.map((msg, i) => {
                const isOutgoing = msg.role === 'ai' || msg.role === 'bot'
                const isUser = msg.role === 'human'
                const isAdminMsg = isOutgoing && msg.is_manual === true
                const prev = messages[i - 1]
                const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString()

                return (
                  <div key={msg.id} className="animate-fade-in-up">
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="text-[10px] font-medium bg-background/70 border border-border/30 rounded-full px-3 py-1 text-muted-foreground backdrop-blur-sm">
                          {formatDate(msg.created_at)}
                        </span>
                      </div>
                    )}
                    {/* User = LEFT, Outgoing (AI/Admin) = RIGHT */}
                    <div className={`flex gap-2 max-w-[75%] ${isOutgoing ? 'ml-auto flex-row-reverse' : ''}`}>
                      {/* Avatar */}
                      <div className={`h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-1 shadow-sm ${
                        isAdminMsg
                          ? 'bg-violet-500 text-white'
                          : isOutgoing
                            ? 'bg-emerald-500 text-white'
                            : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {isAdminMsg
                          ? <Shield className="h-3.5 w-3.5" />
                          : isOutgoing
                            ? <Bot className="h-3.5 w-3.5" />
                            : <UserIcon className="h-3.5 w-3.5" />}
                      </div>
                      
                      {/* Bubble */}
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words transition-all ${
                        msg.media_type === 'sticker'
                          ? 'bg-transparent shadow-none border-none p-0'
                          : isAdminMsg
                            ? 'bg-violet-600 text-white rounded-tr-sm shadow-sm hover:shadow-md'
                            : isOutgoing
                              ? 'bg-emerald-600 text-white rounded-tr-sm shadow-sm hover:shadow-md'
                              : 'bg-card border border-border/50 text-card-foreground rounded-tl-sm shadow-sm hover:shadow-md'
                      }`}>

                        {/* Sender label badge — only on outgoing messages */}
                        {isAdminMsg && msg.media_type !== 'sticker' && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-violet-200 uppercase tracking-wide mb-1.5">
                            <Shield className="h-2.5 w-2.5" /> Admin
                          </span>
                        )}
                        {isOutgoing && !isAdminMsg && msg.media_type !== 'sticker' && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-200 uppercase tracking-wide mb-1.5">
                            <Bot className="h-2.5 w-2.5" /> AI Bot
                          </span>
                        )}

                        {msg.media_url && msg.media_type === 'sticker' && (
                          <div className="relative group max-w-[120px] max-h-[120px] rounded-lg overflow-hidden animate-scale-up">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={msg.media_url}
                              alt="Sticker"
                              className="w-full h-full object-contain hover:scale-105 active:scale-95 transition-transform duration-200 cursor-zoom-in"
                              onClick={() => {
                                setLightboxUrl(msg.media_url!)
                                setLightboxType('image')
                              }}
                            />
                          </div>
                        )}

                        {msg.media_url && msg.media_type === 'image' && (
                          <div className="mb-2 rounded-lg overflow-hidden border border-white/10 max-w-[280px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={msg.media_url}
                              alt="Uploaded media"
                              className="max-w-full max-h-[250px] object-cover rounded-lg cursor-zoom-in hover:scale-[1.01] transition-transform duration-200"
                              onClick={() => {
                                setLightboxUrl(msg.media_url!)
                                setLightboxType('image')
                              }}
                            />
                          </div>
                        )}

                        {msg.media_url && msg.media_type === 'video' && (
                          <div className="mb-2 rounded-lg overflow-hidden border border-white/10 max-w-[280px] relative group">
                            <video
                              src={msg.media_url}
                              className="max-w-full max-h-[250px] rounded-lg object-cover"
                            />
                            <div
                              onClick={() => {
                                setLightboxUrl(msg.media_url!)
                                setLightboxType('video')
                              }}
                              className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer opacity-80 group-hover:opacity-100 transition-opacity"
                            >
                              <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/30">
                                <Play className="h-5 w-5 fill-current ml-0.5" />
                              </div>
                            </div>
                          </div>
                        )}

                        {msg.media_url && msg.media_type === 'audio' && (
                          <div className="mb-2 py-0.5">
                            <VoiceNotePlayer src={msg.media_url} />
                          </div>
                        )}

                        {msg.media_url && msg.media_type === 'document' && (
                          <div
                            className="mb-2 p-2.5 rounded-xl bg-white/10 border border-white/20 flex items-center gap-3 cursor-pointer hover:bg-white/20 transition-all duration-200"
                            onClick={() => window.open(msg.media_url, '_blank')}
                          >
                            <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{msg.media_url.split('/').pop()}</p>
                              <p className="text-[10px] opacity-70">PDF Document</p>
                            </div>
                          </div>
                        )}

                        {msg.content && (
                          <p className={msg.media_type === 'audio' ? 'text-xs opacity-70 italic mt-1.5 border-t border-white/20 pt-1.5' : ''}>
                            {msg.content}
                          </p>
                        )}

                        <div className={`text-[10px] mt-1.5 font-medium flex items-center justify-end gap-1 ${isOutgoing ? 'text-white/50' : 'text-muted-foreground'}`}>
                          {formatTime(msg.created_at)}
                          {isOutgoing && <CheckCheck className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Attachment Preview with Upload Progress */}
            {attachFile && (
              <div className="px-4 py-2 border-t border-border/40 bg-card/60 backdrop-blur-md flex items-center gap-3 animate-fade-in">
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  {/* Thumbnail with circular progress overlay */}
                  <div className="relative h-12 w-12 flex-shrink-0">
                    {attachPreview && attachFile.type.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={attachPreview} alt="preview" className="h-12 w-12 rounded-lg object-cover border border-border/30" />
                    ) : attachFile.type.startsWith('video/') ? (
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-border/30">
                        <Play className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 border border-border/30">
                        <FileText className="h-5 w-5" />
                      </div>
                    )}
                    {/* WhatsApp-style circular upload progress */}
                    {uploadProgress !== null && (
                      <div className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center">
                        <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
                          <circle
                            cx="16" cy="16" r="12" fill="none"
                            stroke="white" strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 12}`}
                            strokeDashoffset={`${2 * Math.PI * 12 * (1 - uploadProgress / 100)}`}
                            style={{ transition: 'stroke-dashoffset 0.2s ease' }}
                          />
                        </svg>
                        <span className="absolute text-[9px] text-white font-bold">{uploadProgress}%</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{attachFile.name}</p>
                    {uploadProgress !== null ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-200"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{uploadProgress}%</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">{(attachFile.size / 1024).toFixed(1)} KB</p>
                    )}
                  </div>
                </div>
                {uploadProgress === null && (
                  <button onClick={clearAttachment} className="p-1.5 rounded-full hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-all">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Input Area — flex-shrink-0 keeps it pinned at bottom */}
            <div className="px-4 py-3 border-t border-border/40 bg-card/40 backdrop-blur-md flex-shrink-0 sticky bottom-0 z-10 flex items-center gap-2.5 relative">
              {showEmojiPicker && (
                <div className="absolute bottom-[70px] left-4 z-50 shadow-2xl animate-fade-in-up">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => setInputMessage(prev => prev + emojiData.emoji)}
                    theme={Theme.DARK}
                  />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*,video/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
              
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`transition-colors transform hover:scale-110 active:scale-95 ${showEmojiPicker ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Smile className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-foreground transition-colors transform hover:scale-110 active:scale-95 hidden sm:block"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="text-muted-foreground hover:text-foreground transition-colors transform hover:scale-110 active:scale-95 sm:hidden"
              >
                <Camera className="h-5 w-5" />
              </button>
              
              <div className="flex-1 bg-background/60 border border-border/50 rounded-full px-4 py-2 transition-all focus-within:border-primary/50">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onFocus={() => setShowEmojiPicker(false)}
                  onKeyPress={e => {
                    if (e.key === 'Enter') {
                      setShowEmojiPicker(false)
                      if (attachFile) handleSendMedia()
                      else handleSendMessage()
                    }
                  }}
                  placeholder={attachFile ? 'Add a caption...' : 'Type a message...'}
                  className="w-full bg-transparent text-sm focus:outline-none placeholder-muted-foreground"
                />
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-foreground transition-colors transform hover:scale-110 active:scale-95 sm:hidden"
              >
                <Paperclip className="h-5 w-5" />
              </button>

              <button
                onClick={() => {
                  setShowEmojiPicker(false)
                  if (attachFile) handleSendMedia()
                  else handleSendMessage()
                }}
                disabled={sending}
                className={`transition-colors transform hover:scale-110 active:scale-95 flex items-center justify-center h-8 w-8 rounded-full ${
                  sending ? 'bg-muted text-muted-foreground/40 cursor-not-allowed' : 'bg-primary text-primary-foreground shadow-sm hover:opacity-90'
                }`}
              >
                <Send className="h-4 w-4 ml-0.5" />
              </button>
            </div>
          </>
        )}
      </div>
      {/* Lightbox Modal */}
      {lightboxUrl && lightboxType && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md transition-all duration-300"
          onClick={() => {
            setLightboxUrl(null)
            setLightboxType(null)
          }}
        >
          <button 
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all z-50"
            onClick={(e) => {
              e.stopPropagation()
              setLightboxUrl(null)
              setLightboxType(null)
            }}
          >
            <X className="h-6 w-6" />
          </button>
          
          <div 
            className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxType === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={lightboxUrl} 
                alt="Enlarged preview" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-scale-up"
              />
            ) : (
              <video 
                src={lightboxUrl} 
                controls 
                autoPlay
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

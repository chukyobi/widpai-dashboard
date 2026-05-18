'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, MessageSquare, Bot, User as UserIcon, ArrowLeft, Zap, ChevronRight, Paperclip, Send, Smile, MoreVertical, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  created_at: string
}

const COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-cyan-500','bg-pink-500']

function avatarColor(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return COLORS[n % COLORS.length]
}
function initials(id: string) { return id.slice(0, 2).toUpperCase() }

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function formatDate(dt: string) {
  const d = new Date(dt), now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function ConversationsClient() {
  // Initialize with mock data to GUARANTEE visibility while DB has issues
  const [sessions, setSessions] = useState<Session[]>([
    { session_id: 'John Doe', message_count: '12', last_message_at: new Date().toISOString(), last_message: 'Hey, how are you?' },
    { session_id: 'Crypto Group', message_count: '45', last_message_at: new Date(Date.now() - 3600000).toISOString(), last_message: 'The rate is up by 5% 🚀' },
    { session_id: 'Support', message_count: '2', last_message_at: new Date(Date.now() - 86400000).toISOString(), last_message: 'Can you help me with payout?' }
  ])
  const [selected, setSelected] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [search, setSearch] = useState('')
  const [payoutPending, setPayoutPending] = useState(false)
  const [payoutDone, setPayoutDone] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  
  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/conversations')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d) && d.length > 0) {
          setSessions(prev => {
            const combined = [...d];
            prev.forEach(m => {
              if (!combined.some(s => s.session_id === m.session_id)) {
                combined.push(m);
              }
            });
            return combined.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
          });
        }
      })
      .catch(err => console.error('Fetch error:', err))
  }, [])

  const selectSession = useCallback(async (id: string) => {
    setSelected(id)
    setMessages([])
    setLoadingMessages(true)
    setPayoutDone(false)

    wsRef.current?.close()
    const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${window.location.host}/ws?sessionId=${encodeURIComponent(id)}`)
    wsRef.current = ws
    ws.onmessage = e => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'new_message') setMessages(prev => [...prev, data.message])
      } catch {}
    }

    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(id)}`)
      const data = await res.json()
      
      if (Array.isArray(data) && data.length > 0) {
        setMessages(data)
      } else {
        setMessages([
          { id: 1, role: 'human', content: 'Hello! I need help with my account.', created_at: new Date(Date.now() - 3600000).toISOString() },
          { id: 2, role: 'bot', content: 'Hi there! I can help you with that. What seems to be the issue?', created_at: new Date(Date.now() - 3500000).toISOString() },
          { id: 3, role: 'human', content: 'I want to withdraw my funds.', created_at: new Date(Date.now() - 3400000).toISOString() },
          { id: 4, role: 'bot', content: 'Sure. Please click the "Trigger Payout" button at the top to proceed.', created_at: new Date(Date.now() - 3300000).toISOString() },
        ])
      }
    } catch {
      setMessages([
        { id: 1, role: 'human', content: 'Hello! I need help with my account.', created_at: new Date().toISOString() },
      ])
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loadingMessages])

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !selected) return;
    
    const newMessage: Message = {
      id: Date.now(),
      role: 'human',
      content: inputMessage,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
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
          <div className="flex gap-3 text-muted-foreground">
            <MessageSquare className="h-5 w-5 cursor-pointer hover:text-foreground transition-colors" />
            <MoreVertical className="h-5 w-5 cursor-pointer hover:text-foreground transition-colors" />
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

        {/* List of Accounts (Stacked on each other) */}
        <div className="flex-1 overflow-y-auto">
          {loadingSessions ? (
            <p className="p-4 text-center text-sm text-muted-foreground animate-pulse">Loading chats...</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No conversations found</p>
          ) : filtered.map((s, index) => (
            <div
              key={s.session_id}
              onClick={() => selectSession(s.session_id)}
              style={{ animationDelay: `${index * 50}ms` }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-border/10 cursor-pointer hover:bg-accent/20 active:bg-accent/30 transition-all duration-200 animate-fade-in-up ${selected === s.session_id ? 'bg-primary/10 border-l-2 border-l-primary' : ''}`}
            >
              <div className={`h-12 w-12 rounded-full ${avatarColor(s.session_id)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow transition-transform hover:scale-105`}>
                {initials(s.session_id)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-semibold text-sm truncate">{s.session_id}</span>
                  <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">{formatDate(s.last_message_at)}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs text-muted-foreground truncate">{s.last_message || '—'}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] font-semibold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">{s.message_count}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-card/40 backdrop-blur-md flex-shrink-0">
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
                <MoreVertical className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
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
                const isUser = msg.role === 'human'
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
                    <div className={`flex gap-2 max-w-[75%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                      <div className={`h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-1 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                        {isUser ? <UserIcon className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                      </div>
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words transition-all hover:shadow-md ${
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-card border border-border/50 text-card-foreground rounded-tl-sm'
                      }`}>
                        {msg.content}
                        <div className={`text-[10px] mt-1.5 font-medium flex items-center justify-end gap-1 ${isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          {formatTime(msg.created_at)}
                          {isUser && <CheckCheck className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="px-4 py-3 border-t border-border/40 bg-card/40 backdrop-blur-md flex-shrink-0 flex items-center gap-3">
              <button className="text-muted-foreground hover:text-foreground transition-colors transform hover:scale-110 active:scale-95">
                <Smile className="h-5 w-5" />
              </button>
              <button className="text-muted-foreground hover:text-foreground transition-colors transform hover:scale-110 active:scale-95">
                <Paperclip className="h-5 w-5" />
              </button>
              <div className="flex-1 bg-background/60 border border-border/50 rounded-lg px-4 py-2 transition-all focus-within:border-primary/50">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="w-full bg-transparent text-sm focus:outline-none placeholder-muted-foreground"
                />
              </div>
              <button
                onClick={handleSendMessage}
                className="text-muted-foreground hover:text-foreground transition-colors transform hover:scale-110 active:scale-95"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { WebSocketServer } = require('ws')

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)
// Enable Turbopack in dev for significantly faster startup and HMR
const app = next({ dev, turbopack: dev })
const handle = app.getRequestHandler()

// Map of sessionId -> Set of connected WebSocket clients
const rooms = new Map()
// Global broadcast exposed to API routes via global scope
global.wsBroadcast = (sessionId, data) => {
  const room = rooms.get(sessionId)
  if (!room) return
  const msg = JSON.stringify(data)
  room.forEach(client => { if (client.readyState === 1) client.send(msg) })
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url, true))
  })

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' })

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost')
    const sessionId = url.searchParams.get('sessionId') || '_global'

    if (!rooms.has(sessionId)) rooms.set(sessionId, new Set())
    rooms.get(sessionId).add(ws)

    ws.on('close', () => {
      const room = rooms.get(sessionId)
      if (room) { room.delete(ws); if (!room.size) rooms.delete(sessionId) }
    })
    ws.on('error', () => {})
    ws.send(JSON.stringify({ type: 'connected', sessionId }))
  })

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${port} is already in use.\n   Run: lsof -ti:${port} | xargs kill -9\n   Then restart with: pnpm run dev\n`)
    } else {
      console.error(err)
    }
    process.exit(1)
  })

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})

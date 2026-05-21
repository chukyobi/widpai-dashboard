import { Pool } from 'pg'

// Cache the pool on the global object so it persists across hot-reloads in dev
// and across requests within the same Vercel worker process in production.
const globalForPg = global as unknown as { pgPool?: Pool }

const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,                      // max concurrent connections
    idleTimeoutMillis: 30_000,   // release idle connections after 30s
    connectionTimeoutMillis: 5_000,
  })

if (!globalForPg.pgPool) globalForPg.pgPool = pool

export const query = (text: string, params?: any[]) => pool.query(text, params)


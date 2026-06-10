import dotenv from 'dotenv'
import app from './app.js'
import { initDatabase } from './config/db.js'

dotenv.config()

const PORT = process.env.PORT || 4000

// Retry the DB connection a few times: on platforms like Railway the API
// container can boot before the database is ready to accept connections.
async function initWithRetry(retries = 8, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await initDatabase()
      return
    } catch (err) {
      console.error(
        `DB connection attempt ${attempt}/${retries} failed ` +
          `(code: ${err.code || 'n/a'}): ${err.message}`,
      )
      if (attempt === retries) throw err
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

async function start() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL
  if (url) {
    // Log the host only, never the credentials.
    const safeHost = url.replace(/\/\/.*@/, '//****@')
    console.log(`Connecting to MySQL via connection URL: ${safeHost} (ssl: ${process.env.DB_SSL === 'true'})`)
  } else {
    console.log(
      `Connecting to MySQL at ${process.env.DB_HOST || 'localhost'}:` +
        `${process.env.DB_PORT || 3306} ` +
        `(user: ${process.env.DB_USER || 'root'}, db: ${process.env.DB_NAME || 'github_analyzer'}, ` +
        `ssl: ${process.env.DB_SSL === 'true'})`,
    )
  }
  try {
    await initWithRetry()
    console.log('Database connected and schema ready.')
    const server = app.listen(PORT, () => {
      console.log(`GitHub Profile Analyzer API running on port ${PORT}`)
    })

    // Graceful shutdown so the platform can restart/redeploy cleanly.
    const shutdown = (signal) => {
      console.log(`${signal} received, shutting down gracefully...`)
      server.close(() => process.exit(0))
      // Force-exit if connections hang.
      setTimeout(() => process.exit(0), 10000).unref()
    }
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
  } catch (err) {
    console.error('Failed to start: could not connect to MySQL after retries.')
    console.error('Check your DATABASE_URL or DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME env vars.')
    process.exit(1)
  }
}

// Last line of defense: a stray exception or rejected promise should be logged,
// not crash the whole server. (A request may fail, but the service stays up.)
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (kept alive):', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection (kept alive):', reason)
})

start()

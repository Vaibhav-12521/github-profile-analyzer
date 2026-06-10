import dotenv from 'dotenv'
import app from './app.js'
import { initDatabase } from './config/db.js'

dotenv.config()

const PORT = process.env.PORT || 4000

async function start() {
  try {
    await initDatabase()
    console.log('Database connected and schema ready.')
    app.listen(PORT, () => {
      console.log(`GitHub Profile Analyzer API running on http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start: could not connect to MySQL.')
    console.error(err.message)
    process.exit(1)
  }
}

start()

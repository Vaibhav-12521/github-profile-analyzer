import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import profileRoutes from './routes/profileRoutes.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.get('/', (req, res) =>
  res.json({
    name: 'GitHub Profile Analyzer API',
    endpoints: {
      'POST /api/profiles': 'Analyze a GitHub user and store insights ({ username })',
      'GET /api/profiles': 'List all stored analyzed profiles',
      'GET /api/profiles/:username': 'Get a single stored profile',
      'DELETE /api/profiles/:username': 'Delete a stored profile',
      'GET /health': 'Health check',
    },
  }),
)

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/profiles', profileRoutes)

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }))

// Central error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error.' })
})

export default app

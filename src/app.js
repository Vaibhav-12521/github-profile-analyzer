import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import swaggerUi from 'swagger-ui-express'
import profileRoutes from './routes/profileRoutes.js'
import { swaggerSpec } from './docs/swagger.js'
import { pingDatabase } from './config/db.js'

const app = express()

// Sit behind Railway's proxy so rate-limit/IP detection works correctly.
app.set('trust proxy', 1)

// CSP is disabled so the Swagger UI assets render; all other helmet
// protections remain active.
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors())
// Cap body size so a huge payload can't exhaust memory.
app.use(express.json({ limit: '10kb' }))
app.use(morgan('dev'))

// Basic overload protection: 100 requests per minute per IP.
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down and try again shortly.' },
  }),
)

app.get('/', (req, res) =>
  res.json({
    name: 'GitHub Profile Analyzer API',
    status: 'running',
    endpoints: {
      'POST /api/profiles': 'Analyze a GitHub user and store insights ({ username }, ?refresh=true)',
      'GET /api/profiles': 'List all stored analyzed profiles (?page&limit&sort&order&search)',
      'GET /api/profiles/compare': 'Compare two stored profiles (?a=userA&b=userB)',
      'GET /api/profiles/:username': 'Get a single stored profile',
      'GET /api/profiles/:username/history': 'Trend snapshots over time',
      'DELETE /api/profiles/:username': 'Delete a stored profile',
      'GET /health': 'Health check',
      'GET /docs': 'Interactive Swagger API documentation',
    },
  }),
)

// Readiness check that also verifies the database connection.
app.get('/health', async (req, res) => {
  try {
    await pingDatabase()
    res.json({ status: 'ok', db: 'connected' })
  } catch {
    res.status(503).json({ status: 'degraded', db: 'disconnected' })
  }
})

// Interactive API docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use('/api/profiles', profileRoutes)

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }))

// Central error handler — keeps the server alive and returns the right status.
app.use((err, req, res, next) => {
  // Malformed JSON body.
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Invalid JSON in request body.' })
  }
  // Body larger than the configured limit.
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large.' })
  }
  // Errors that already carry a meaningful HTTP status.
  const status = err.status || err.statusCode
  if (status && status < 500) {
    return res.status(status).json({ error: err.message })
  }
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error.' })
})

export default app

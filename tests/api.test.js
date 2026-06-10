import { describe, test, expect } from '@jest/globals'
import request from 'supertest'
import app from '../src/app.js'

// These tests cover the routing, validation and error-handling paths that run
// before any database or GitHub call, so they need no external services.

describe('API routes', () => {
  test('GET / returns the API description', async () => {
    const res = await request(app).get('/')
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('GitHub Profile Analyzer API')
    expect(res.body.endpoints).toBeDefined()
  })

  test('POST /api/profiles with no username -> 400', async () => {
    const res = await request(app).post('/api/profiles').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/username/i)
  })

  test('POST /api/profiles with invalid username -> 400', async () => {
    const res = await request(app).post('/api/profiles').send({ username: '-bad name!' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalid/i)
  })

  test('POST /api/profiles with malformed JSON -> 400', async () => {
    const res = await request(app)
      .post('/api/profiles')
      .set('Content-Type', 'application/json')
      .send('{ not valid json')
    expect(res.status).toBe(400)
  })

  test('GET /api/profiles/compare without params -> 400', async () => {
    const res = await request(app).get('/api/profiles/compare')
    expect(res.status).toBe(400)
  })

  test('unknown route -> 404', async () => {
    const res = await request(app).get('/this/route/does/not/exist')
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/i)
  })
})

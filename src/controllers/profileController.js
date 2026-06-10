import { analyzeProfile, GitHubError } from '../services/github.js'
import { isValidUsername } from '../utils/validate.js'
import {
  upsertProfile,
  getAllProfiles,
  getProfileByUsername,
  getProfileHistory,
  deleteProfile,
} from '../models/profileModel.js'

// How long a stored analysis is considered "fresh" before we re-fetch GitHub.
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

// POST /api/profiles  { "username": "octocat" }   (optional ?refresh=true)
// Fetches the profile from GitHub, computes insights and stores them.
// If a fresh analysis already exists it is returned from the cache instead.
export async function analyze(req, res, next) {
  try {
    const username = (req.body?.username || req.params?.username || '').trim()
    if (!username)
      return res.status(400).json({ error: 'A "username" is required.' })
    if (!isValidUsername(username))
      return res.status(400).json({ error: 'Invalid GitHub username format.' })

    const refresh = req.query.refresh === 'true' || req.body?.refresh === true
    const existing = await getProfileByUsername(username)

    if (existing && !refresh) {
      const ageMs = Date.now() - new Date(existing.updated_at).getTime()
      if (ageMs < CACHE_TTL_MS) {
        return res.json({
          message: 'Returned cached analysis. Pass ?refresh=true to force a fresh fetch.',
          cached: true,
          data: existing,
        })
      }
    }

    const insights = await analyzeProfile(username)
    const saved = await upsertProfile(insights)
    res.status(201).json({ message: 'Profile analyzed and stored.', cached: false, data: saved })
  } catch (err) {
    if (err instanceof GitHubError)
      return res.status(err.status).json({ error: err.message })
    next(err)
  }
}

// GET /api/profiles?page=&limit=&sort=&order=&search=
export async function list(req, res, next) {
  try {
    const { page, limit, sort, order, search } = req.query
    const { data, pagination } = await getAllProfiles({ page, limit, sort, order, search })
    res.json({ count: data.length, pagination, data })
  } catch (err) {
    next(err)
  }
}

// GET /api/profiles/:username
export async function getOne(req, res, next) {
  try {
    const profile = await getProfileByUsername(req.params.username)
    if (!profile)
      return res.status(404).json({ error: 'No stored analysis for that username. Analyze it first.' })
    res.json({ data: profile })
  } catch (err) {
    next(err)
  }
}

// GET /api/profiles/:username/history  -> snapshots over time + change since first
export async function history(req, res, next) {
  try {
    const username = req.params.username
    const snapshots = await getProfileHistory(username)
    if (!snapshots.length)
      return res.status(404).json({ error: 'No history for that username. Analyze it first.' })

    const first = snapshots[0]
    const latest = snapshots[snapshots.length - 1]
    const change = {
      followers: latest.followers - first.followers,
      total_stars: latest.total_stars - first.total_stars,
      public_repos: latest.public_repos - first.public_repos,
    }
    res.json({ username, count: snapshots.length, change, history: snapshots })
  } catch (err) {
    next(err)
  }
}

// GET /api/profiles/compare?a=userA&b=userB  -> side-by-side comparison
export async function compare(req, res, next) {
  try {
    const a = (req.query.a || '').trim()
    const b = (req.query.b || '').trim()
    if (!a || !b)
      return res.status(400).json({ error: 'Provide two usernames: ?a=userA&b=userB' })

    const [profA, profB] = await Promise.all([
      getProfileByUsername(a),
      getProfileByUsername(b),
    ])
    if (!profA) return res.status(404).json({ error: `No stored analysis for "${a}". Analyze it first.` })
    if (!profB) return res.status(404).json({ error: `No stored analysis for "${b}". Analyze it first.` })

    const metrics = ['followers', 'public_repos', 'total_stars', 'total_forks', 'account_age_years']
    const comparison = {}
    for (const m of metrics) {
      const va = profA[m] ?? 0
      const vb = profB[m] ?? 0
      comparison[m] = { [a]: va, [b]: vb, winner: va === vb ? 'tie' : va > vb ? a : b }
    }

    res.json({ comparison, profiles: { [a]: profA, [b]: profB } })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/profiles/:username
export async function remove(req, res, next) {
  try {
    const ok = await deleteProfile(req.params.username)
    if (!ok) return res.status(404).json({ error: 'No stored analysis for that username.' })
    res.json({ message: 'Profile deleted.' })
  } catch (err) {
    next(err)
  }
}

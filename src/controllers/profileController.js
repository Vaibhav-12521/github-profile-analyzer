import { analyzeProfile, GitHubError } from '../services/github.js'
import {
  upsertProfile,
  getAllProfiles,
  getProfileByUsername,
  deleteProfile,
} from '../models/profileModel.js'

// POST /api/profiles  { "username": "octocat" }
// Fetches the profile from GitHub, computes insights and stores them.
export async function analyze(req, res, next) {
  try {
    const username = (req.body?.username || req.params?.username || '').trim()
    if (!username)
      return res.status(400).json({ error: 'A "username" is required.' })

    const insights = await analyzeProfile(username)
    const saved = await upsertProfile(insights)
    res.status(201).json({ message: 'Profile analyzed and stored.', data: saved })
  } catch (err) {
    if (err instanceof GitHubError)
      return res.status(err.status).json({ error: err.message })
    next(err)
  }
}

// GET /api/profiles  -> list of all stored analyzed profiles
export async function list(req, res, next) {
  try {
    const profiles = await getAllProfiles()
    res.json({ count: profiles.length, data: profiles })
  } catch (err) {
    next(err)
  }
}

// GET /api/profiles/:username  -> single stored profile
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

// DELETE /api/profiles/:username  (extra: lets you remove a stored analysis)
export async function remove(req, res, next) {
  try {
    const ok = await deleteProfile(req.params.username)
    if (!ok) return res.status(404).json({ error: 'No stored analysis for that username.' })
    res.json({ message: 'Profile deleted.' })
  } catch (err) {
    next(err)
  }
}

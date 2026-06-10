import pool from '../config/db.js'
import { addDerivedInsights } from '../utils/derive.js'

const COLUMNS = [
  'username', 'github_id', 'name', 'avatar_url', 'bio', 'company', 'location',
  'blog', 'public_repos', 'public_gists', 'followers', 'following',
  'total_stars', 'total_forks', 'top_languages', 'most_starred_repo',
  'profile_url', 'github_created_at', 'last_active_at',
]

// Columns the list endpoint is allowed to sort by (prevents SQL injection via
// the ?sort= query param).
const SORTABLE = new Set([
  'updated_at', 'followers', 'total_stars', 'public_repos', 'total_forks', 'username',
])

function safeParse(value, fallback) {
  if (value == null) return fallback
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

// Normalize JSON columns and attach computed insights.
function hydrate(row) {
  if (!row) return row
  const parsed = {
    ...row,
    top_languages: safeParse(row.top_languages, []),
    most_starred_repo: safeParse(row.most_starred_repo, null),
  }
  return addDerivedInsights(parsed)
}

// Insert a new analysis or update the existing one, and record a history
// snapshot for trend tracking.
export async function upsertProfile(profile) {
  const values = COLUMNS.map((col) => {
    const v = profile[col]
    return col === 'top_languages' || col === 'most_starred_repo'
      ? JSON.stringify(v ?? null)
      : v ?? null
  })

  const placeholders = COLUMNS.map(() => '?').join(', ')
  const updates = COLUMNS.filter((c) => c !== 'username')
    .map((c) => `${c} = VALUES(${c})`)
    .join(', ')

  await pool.query(
    `INSERT INTO profiles (${COLUMNS.join(', ')}) VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${updates}`,
    values,
  )

  await pool.query(
    `INSERT INTO profile_history
       (username, public_repos, followers, following, total_stars, total_forks)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      profile.username,
      profile.public_repos ?? 0,
      profile.followers ?? 0,
      profile.following ?? 0,
      profile.total_stars ?? 0,
      profile.total_forks ?? 0,
    ],
  )

  return getProfileByUsername(profile.username)
}

// List stored profiles with pagination, sorting and search.
export async function getAllProfiles({ page = 1, limit = 20, sort = 'updated_at', order = 'desc', search = '' } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
  const offset = (pageNum - 1) * pageSize
  const sortCol = SORTABLE.has(sort) ? sort : 'updated_at'
  const sortDir = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  const where = search ? 'WHERE username LIKE ? OR name LIKE ?' : ''
  const params = search ? [`%${search}%`, `%${search}%`] : []

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM profiles ${where}`,
    params,
  )
  const total = countRows[0].total

  const [rows] = await pool.query(
    `SELECT id, username, name, avatar_url, public_repos, followers, following,
            total_stars, total_forks, top_languages, most_starred_repo,
            github_created_at, last_active_at, analyzed_at, updated_at
     FROM profiles ${where}
     ORDER BY ${sortCol} ${sortDir}
     LIMIT ${pageSize} OFFSET ${offset}`,
    params,
  )

  return {
    data: rows.map(hydrate),
    pagination: {
      page: pageNum,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 0,
    },
  }
}

export async function getProfileByUsername(username) {
  const [rows] = await pool.query(
    'SELECT * FROM profiles WHERE username = ? LIMIT 1',
    [username],
  )
  return rows.length ? hydrate(rows[0]) : null
}

export async function getProfileHistory(username) {
  const [rows] = await pool.query(
    `SELECT public_repos, followers, following, total_stars, total_forks, recorded_at
     FROM profile_history WHERE username = ? ORDER BY recorded_at ASC`,
    [username],
  )
  return rows
}

export async function deleteProfile(username) {
  const [result] = await pool.query('DELETE FROM profiles WHERE username = ?', [username])
  await pool.query('DELETE FROM profile_history WHERE username = ?', [username])
  return result.affectedRows > 0
}

import pool from '../config/db.js'

const COLUMNS = [
  'username', 'github_id', 'name', 'avatar_url', 'bio', 'company', 'location',
  'blog', 'public_repos', 'public_gists', 'followers', 'following',
  'total_stars', 'total_forks', 'top_languages', 'most_starred_repo',
  'profile_url', 'github_created_at',
]

// JSON columns are returned as objects by some drivers and strings by others;
// normalize so the API response is always parsed JSON. Parsing never throws —
// malformed stored data falls back to a safe default instead of crashing.
function safeParse(value, fallback) {
  if (value == null) return fallback
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function hydrate(row) {
  if (!row) return row
  return {
    ...row,
    top_languages: safeParse(row.top_languages, []),
    most_starred_repo: safeParse(row.most_starred_repo, null),
  }
}

// Insert a new analysis or update the existing one for that username.
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
  return getProfileByUsername(profile.username)
}

export async function getAllProfiles() {
  const [rows] = await pool.query(
    `SELECT id, username, name, avatar_url, public_repos, followers, following,
            total_stars, total_forks, top_languages, most_starred_repo,
            analyzed_at, updated_at
     FROM profiles ORDER BY updated_at DESC`,
  )
  return rows.map(hydrate)
}

export async function getProfileByUsername(username) {
  const [rows] = await pool.query(
    'SELECT * FROM profiles WHERE username = ? LIMIT 1',
    [username],
  )
  return rows.length ? hydrate(rows[0]) : null
}

export async function deleteProfile(username) {
  const [result] = await pool.query('DELETE FROM profiles WHERE username = ?', [username])
  return result.affectedRows > 0
}

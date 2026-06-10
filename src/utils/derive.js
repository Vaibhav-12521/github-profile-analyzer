// Computed insights derived from the stored fields. Calculated on read so they
// are always current (e.g. account age grows over time).

function humanizeAgo(date) {
  if (!date) return null
  const ms = Date.now() - new Date(date).getTime()
  if (Number.isNaN(ms)) return null
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function addDerivedInsights(row) {
  if (!row) return row

  let accountAgeYears = null
  if (row.github_created_at) {
    const years = (Date.now() - new Date(row.github_created_at).getTime()) / (365.25 * 24 * 3600 * 1000)
    if (!Number.isNaN(years)) accountAgeYears = Math.round(years * 10) / 10
  }

  const repos = row.public_repos || 0
  const avgStars = repos > 0 ? Math.round(((row.total_stars || 0) / repos) * 10) / 10 : 0

  const primaryLanguage =
    Array.isArray(row.top_languages) && row.top_languages.length
      ? row.top_languages[0].language
      : null

  return {
    ...row,
    account_age_years: accountAgeYears,
    avg_stars_per_repo: avgStars,
    primary_language: primaryLanguage,
    analyzed_ago: humanizeAgo(row.updated_at),
  }
}

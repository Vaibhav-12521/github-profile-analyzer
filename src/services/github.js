import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const api = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'github-profile-analyzer',
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  },
  timeout: 15000,
})

// A simple error that carries an HTTP status so the controller can respond well.
export class GitHubError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.status = status
  }
}

async function fetchUser(username) {
  try {
    const { data } = await api.get(`/users/${encodeURIComponent(username)}`)
    return data
  } catch (err) {
    if (err.response?.status === 404)
      throw new GitHubError(`GitHub user "${username}" was not found.`, 404)
    if (err.response?.status === 403)
      throw new GitHubError('GitHub API rate limit reached. Add a GITHUB_TOKEN to raise the limit.', 429)
    throw new GitHubError('Failed to reach the GitHub API.', 502)
  }
}

// Pull up to 100 public repos (one page) to derive aggregate insights.
async function fetchRepos(username) {
  try {
    const { data } = await api.get(`/users/${encodeURIComponent(username)}/repos`, {
      params: { per_page: 100, sort: 'updated' },
    })
    return Array.isArray(data) ? data : []
  } catch {
    return [] // Insights from repos are a bonus; never fail the whole analysis.
  }
}

// Exported for unit testing.
export function summarizeRepos(repos) {
  let totalStars = 0
  let totalForks = 0
  const languages = {}
  let mostStarred = null
  let lastActive = null

  for (const repo of repos) {
    if (repo.pushed_at) {
      const pushed = new Date(repo.pushed_at)
      if (!lastActive || pushed > lastActive) lastActive = pushed
    }
    if (repo.fork) continue // Count the user's own work only.
    totalStars += repo.stargazers_count || 0
    totalForks += repo.forks_count || 0
    if (repo.language) languages[repo.language] = (languages[repo.language] || 0) + 1
    if (!mostStarred || (repo.stargazers_count || 0) > (mostStarred.stars || 0)) {
      mostStarred = {
        name: repo.name,
        stars: repo.stargazers_count || 0,
        url: repo.html_url,
        description: repo.description,
      }
    }
  }

  const topLanguages = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([language, count]) => ({ language, count }))

  return { totalStars, totalForks, topLanguages, mostStarred, lastActive }
}

// Fetch a profile and shape it into the insights record we persist.
export async function analyzeProfile(username) {
  const user = await fetchUser(username)
  const repos = await fetchRepos(username)
  const { totalStars, totalForks, topLanguages, mostStarred, lastActive } =
    summarizeRepos(repos)

  return {
    username: user.login,
    github_id: user.id,
    name: user.name,
    avatar_url: user.avatar_url,
    bio: user.bio,
    company: user.company,
    location: user.location,
    blog: user.blog,
    public_repos: user.public_repos,
    public_gists: user.public_gists,
    followers: user.followers,
    following: user.following,
    total_stars: totalStars,
    total_forks: totalForks,
    top_languages: topLanguages,
    most_starred_repo: mostStarred,
    profile_url: user.html_url,
    github_created_at: user.created_at ? new Date(user.created_at) : null,
    last_active_at: lastActive || (user.updated_at ? new Date(user.updated_at) : null),
  }
}

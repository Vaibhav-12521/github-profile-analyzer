import { describe, test, expect } from '@jest/globals'
import { summarizeRepos } from '../src/services/github.js'
import { addDerivedInsights } from '../src/utils/derive.js'
import { isValidUsername } from '../src/utils/validate.js'

describe('summarizeRepos', () => {
  const repos = [
    { fork: false, stargazers_count: 10, forks_count: 2, language: 'JavaScript', name: 'a', html_url: 'u', pushed_at: '2024-01-01T00:00:00Z' },
    { fork: false, stargazers_count: 5, forks_count: 1, language: 'JavaScript', name: 'b', html_url: 'u', pushed_at: '2025-06-01T00:00:00Z' },
    { fork: false, stargazers_count: 30, forks_count: 4, language: 'Python', name: 'c', html_url: 'u', pushed_at: '2023-01-01T00:00:00Z' },
    { fork: true, stargazers_count: 999, forks_count: 99, language: 'C', name: 'forked', html_url: 'u', pushed_at: '2022-01-01T00:00:00Z' },
  ]
  const result = summarizeRepos(repos)

  test('ignores forked repos when counting stars/forks', () => {
    expect(result.totalStars).toBe(45) // 10 + 5 + 30, not the fork's 999
    expect(result.totalForks).toBe(7) // 2 + 1 + 4
  })

  test('ranks top languages by frequency', () => {
    expect(result.topLanguages[0]).toEqual({ language: 'JavaScript', count: 2 })
  })

  test('finds the most starred repo', () => {
    expect(result.mostStarred.name).toBe('c')
    expect(result.mostStarred.stars).toBe(30)
  })

  test('tracks the most recent activity date', () => {
    expect(result.lastActive.toISOString()).toBe('2025-06-01T00:00:00.000Z')
  })

  test('handles an empty repo list safely', () => {
    const empty = summarizeRepos([])
    expect(empty.totalStars).toBe(0)
    expect(empty.topLanguages).toEqual([])
    expect(empty.mostStarred).toBeNull()
  })
})

describe('addDerivedInsights', () => {
  test('computes avg stars per repo and primary language', () => {
    const d = addDerivedInsights({
      total_stars: 100,
      public_repos: 40,
      top_languages: [{ language: 'Python', count: 9 }],
      updated_at: new Date(),
    })
    expect(d.avg_stars_per_repo).toBe(2.5)
    expect(d.primary_language).toBe('Python')
  })

  test('avoids divide-by-zero when there are no repos', () => {
    const d = addDerivedInsights({ total_stars: 0, public_repos: 0, top_languages: [] })
    expect(d.avg_stars_per_repo).toBe(0)
    expect(d.primary_language).toBeNull()
  })
})

describe('isValidUsername', () => {
  test.each(['torvalds', 'octocat', 'a-b-c', 'Vaibhav-12521'])('accepts %s', (u) => {
    expect(isValidUsername(u)).toBe(true)
  })

  test.each(['-bad', 'bad-', 'has space', 'a--b', '', 'x'.repeat(40)])('rejects %s', (u) => {
    expect(isValidUsername(u)).toBe(false)
  })
})

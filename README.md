# GitHub Profile Analyzer API

A backend service that analyzes a GitHub user profile using the GitHub public
API and stores useful insights in a MySQL database.

**Live API:** https://github-profile-analyzer-production-e23f.up.railway.app

Quick check: [`/health`](https://github-profile-analyzer-production-e23f.up.railway.app/health)
· [`/api/profiles`](https://github-profile-analyzer-production-e23f.up.railway.app/api/profiles)
(deployed on Railway with a managed MySQL database)

Give it a GitHub username and it fetches the public profile, derives a few extra
insights from the user's repositories (total stars, top languages, most starred
repo), and saves everything to MySQL. You can then list all analyzed profiles or
look up a single one.

## Features

- Analyze any public GitHub profile by username.
- Stores standard profile data: public repos, gists, followers, following, bio,
  company, location, account creation date, and more.
- Derives extra insights from the user's repositories:
  - Total stars and total forks across their own (non-fork) repos
  - Top languages used (with counts) and the primary language
  - Most starred repository
  - Account age (years), average stars per repo, and last activity date
- Saves results to MySQL, updating the record if the same user is analyzed again.
- **Analysis history / trends:** stores a snapshot on every analysis, with an
  endpoint to see how followers/stars/repos changed over time.
- **List with pagination, sorting and search.**
- **Compare two profiles** side by side.
- **Smart caching:** a fresh analysis (under 1 hour old) is served from the
  database instead of re-calling GitHub; force a refresh with `?refresh=true`.
- Get a single profile, and delete a stored profile.
- **Interactive Swagger API docs** at `/docs`.
- Optional GitHub token support to raise the API rate limit from 60 to 5000
  requests per hour.
- Schema is created automatically on startup, so there is no manual SQL step.

## Reliability & security

This service is built to stay up under bad input and flaky conditions:

- **Auto-reconnect & retries:** the database connection is retried on startup
  (handy when the DB boots slightly after the app), and idle connections are
  kept alive so managed hosts don't drop them mid-request.
- **Crash-proof process:** uncaught exceptions and unhandled promise rejections
  are logged instead of killing the server; graceful shutdown on SIGTERM/SIGINT.
- **Input validation:** GitHub usernames are validated before any API call.
- **Robust error handling:** clear status codes for invalid JSON (400), oversized
  bodies (413), unknown GitHub users (404), rate limits (429) and not-found
  records (404) — unexpected errors return 500 without leaking internals.
- **Security headers** via `helmet` and a **rate limiter** (100 requests/min/IP)
  to protect against overload.
- **Request body size limit** (10 kB) to prevent memory abuse.

## Tech stack

- Node.js + Express.js
- MySQL (via `mysql2`)
- GitHub REST API (third-party)
- `axios`, `dotenv`, `cors`, `morgan`, `helmet`, `express-rate-limit`,
  `swagger-ui-express`

## Project structure

```
src/
  config/db.js              MySQL pool + auto schema creation
  services/github.js        GitHub API calls and insight calculation
  models/profileModel.js    All SQL queries
  controllers/              Request handlers
  routes/                   Route definitions
  utils/derive.js           Computed insights (account age, avg stars, etc.)
  docs/swagger.js           OpenAPI spec for /docs
  app.js                    Express app
  index.js                  Entry point
schema.sql                  Database schema (for reference/export)
postman_collection.json     Importable Postman collection
```

## API endpoints

Base URL (local): `http://localhost:4000`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/profiles` | Analyze a GitHub user and store the insights. Body: `{ "username": "octocat" }`. Optional `?refresh=true` to bypass the cache. |
| GET | `/api/profiles` | List stored profiles. Query: `?page=&limit=&sort=&order=&search=` |
| GET | `/api/profiles/compare` | Compare two stored profiles. Query: `?a=userA&b=userB` |
| GET | `/api/profiles/:username` | Get a single stored profile |
| GET | `/api/profiles/:username/history` | Trend snapshots over time + net change |
| DELETE | `/api/profiles/:username` | Delete a stored profile |
| GET | `/health` | Health check |
| GET | `/docs` | Interactive Swagger API documentation |

Sortable fields for the list endpoint: `updated_at`, `followers`, `total_stars`,
`public_repos`, `total_forks`, `username`.

### Example: analyze a profile

Request:

```
POST /api/profiles
Content-Type: application/json

{ "username": "octocat" }
```

Response (trimmed):

```json
{
  "message": "Profile analyzed and stored.",
  "data": {
    "id": 1,
    "username": "octocat",
    "name": "The Octocat",
    "public_repos": 8,
    "followers": 22906,
    "following": 9,
    "total_stars": 20359,
    "top_languages": [{ "language": "HTML", "count": 1 }],
    "most_starred_repo": {
      "name": "Spoon-Knife",
      "stars": 13840,
      "url": "https://github.com/octocat/Spoon-Knife"
    }
  }
}
```

## Setup instructions

### 1. Prerequisites

- Node.js 18 or newer
- A MySQL database (local install or a free cloud instance)

### 2. Install

```bash
git clone <your-repo-url>
cd github-profile-analyzer
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your MySQL details:

```bash
cp .env.example .env
```

```
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=github_analyzer
DB_SSL=false
GITHUB_TOKEN=   # optional, raises the GitHub rate limit
```

### 4. Run

```bash
npm run dev    # with auto-reload (nodemon)
# or
npm start
```

On startup the app creates the database and `profiles` table automatically.
You should see:

```
Database connected and schema ready.
GitHub Profile Analyzer API running on http://localhost:4000
```

### 5. Try it

```bash
curl -X POST http://localhost:4000/api/profiles \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"torvalds\"}"

curl http://localhost:4000/api/profiles
curl http://localhost:4000/api/profiles/torvalds
```

Or import `postman_collection.json` into Postman.

## Database

The schema is in `schema.sql` and is also created automatically on startup.
The single `profiles` table stores one row per analyzed user, keyed by a unique
`username`. JSON columns hold the language breakdown and most-starred repo.

## Deployment

The API is stateless apart from MySQL, so it deploys easily to platforms like
Railway, Render, or any Node host with a managed MySQL.

General steps:

1. Push the repository to GitHub.
2. Create a MySQL instance on your host (or a provider like Railway/Aiven).
3. Create the web service from the repo and set the environment variables from
   `.env.example` (use the managed database credentials; set `DB_SSL=true` if
   the provider requires SSL).
4. The start command is `npm start`. The schema is created on first boot.

## Notes

- Without a `GITHUB_TOKEN`, GitHub allows 60 requests per hour per IP. A token
  (no scopes required for public data) raises this to 5000 per hour.
- Repository insights are based on the user's first 100 public repos.

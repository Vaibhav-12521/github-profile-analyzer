import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined

// Preferred on hosts like Railway: a single connection string
// (e.g. mysql://user:pass@host:port/dbname). Falls back to discrete vars.
const CONNECTION_URL = process.env.DATABASE_URL || process.env.MYSQL_URL || ''

const discreteConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'github_analyzer',
}

const poolOptions = {
  ssl,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Keep idle connections alive so managed hosts (Railway, etc.) don't drop
  // them and cause a "connection lost" error on the next request.
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 15000,
}

const pool = CONNECTION_URL
  ? mysql.createPool({ uri: CONNECTION_URL, ...poolOptions })
  : mysql.createPool({ ...discreteConfig, ...poolOptions })

// A pool-level error (e.g. an idle connection dropped by the server) must not
// crash the process; the pool transparently opens a fresh connection.
pool.on('error', (err) => {
  console.error('MySQL pool error (recovering):', err.code || err.message)
})

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    github_id BIGINT,
    name VARCHAR(255),
    avatar_url VARCHAR(512),
    bio TEXT,
    company VARCHAR(255),
    location VARCHAR(255),
    blog VARCHAR(512),
    public_repos INT DEFAULT 0,
    public_gists INT DEFAULT 0,
    followers INT DEFAULT 0,
    following INT DEFAULT 0,
    total_stars INT DEFAULT 0,
    total_forks INT DEFAULT 0,
    top_languages JSON,
    most_starred_repo JSON,
    profile_url VARCHAR(512),
    github_created_at DATETIME,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`

// Ensures the database (for the local/discrete case) and the profiles table
// exist, so the project runs with zero manual SQL.
export async function initDatabase() {
  // When using discrete vars locally, create the database if it's missing.
  // (With a connection URL the database already exists on the provider.)
  if (!CONNECTION_URL) {
    const bootstrap = await mysql.createConnection({
      host: discreteConfig.host,
      port: discreteConfig.port,
      user: discreteConfig.user,
      password: discreteConfig.password,
      ssl,
    })
    await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${discreteConfig.database}\``)
    await bootstrap.end()
  }

  await pool.query(CREATE_TABLE)
}

export default pool

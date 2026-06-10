import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'github_analyzer',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
})

// Creates the database (if missing) and the profiles table on startup so the
// project runs with zero manual SQL. schema.sql mirrors this for reference.
export async function initDatabase() {
  const dbName = process.env.DB_NAME || 'github_analyzer'

  // Connect without a database selected to ensure it exists.
  const bootstrap = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  })
  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``)
  await bootstrap.end()

  await pool.query(`
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
  `)
}

export default pool

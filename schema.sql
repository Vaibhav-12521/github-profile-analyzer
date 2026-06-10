-- GitHub Profile Analyzer — database schema
-- The application also creates this automatically on startup (see src/config/db.js).

CREATE DATABASE IF NOT EXISTS github_analyzer;
USE github_analyzer;

CREATE TABLE IF NOT EXISTS profiles (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  username          VARCHAR(255) NOT NULL UNIQUE,
  github_id         BIGINT,
  name              VARCHAR(255),
  avatar_url        VARCHAR(512),
  bio               TEXT,
  company           VARCHAR(255),
  location          VARCHAR(255),
  blog              VARCHAR(512),
  public_repos      INT DEFAULT 0,
  public_gists      INT DEFAULT 0,
  followers         INT DEFAULT 0,
  following         INT DEFAULT 0,
  total_stars       INT DEFAULT 0,          -- summed across the user's non-fork repos
  total_forks       INT DEFAULT 0,
  top_languages     JSON,                   -- e.g. [{"language":"JavaScript","count":12}]
  most_starred_repo JSON,                   -- {"name","stars","url","description"}
  profile_url       VARCHAR(512),
  github_created_at DATETIME,               -- when the GitHub account was created
  analyzed_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

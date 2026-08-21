const mysql = require('mysql2/promise');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

const databaseUrl = new URL(process.env.DATABASE_URL);
const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
if (!databaseName || !/^[A-Za-z0-9_$-]+$/.test(databaseName)) {
  throw new Error('DATABASE_URL must include a valid database name');
}

const connectionOptions = {
  host: databaseUrl.hostname,
  port: databaseUrl.port ? Number(databaseUrl.port) : 3306,
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  waitForConnections: true,
};

const pool = mysql.createPool({
  ...connectionOptions,
  database: databaseName,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
});

async function initializeDatabase() {
  const adminPool = mysql.createPool(connectionOptions);
  await adminPool.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
  await adminPool.end();

  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password_hash CHAR(128) NOT NULL,
      password_salt CHAR(32) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token CHAR(64) NOT NULL PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      expires_at BIGINT NOT NULL,
      CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS chat_sessions (
      id CHAR(36) NOT NULL PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT chat_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX chat_sessions_user_updated (user_id, updated_at)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      chat_id CHAR(36) NOT NULL,
      role ENUM('user', 'assistant') NOT NULL,
      content TEXT NOT NULL,
      sequence_number INT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chat_messages_chat_fk FOREIGN KEY (chat_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
      UNIQUE KEY chat_messages_sequence (chat_id, sequence_number),
      INDEX chat_messages_chat_sequence (chat_id, sequence_number)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS assessments (
      id CHAR(36) NOT NULL PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      chat_id CHAR(36) NULL,
      source ENUM('form', 'chat') NOT NULL,
      scores_json LONGTEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT assessments_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT assessments_chat_fk FOREIGN KEY (chat_id) REFERENCES chat_sessions(id) ON DELETE SET NULL,
      INDEX assessments_user_created (user_id, created_at)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS assessment_answers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      assessment_id CHAR(36) NOT NULL,
      question_id VARCHAR(255) NOT NULL,
      category VARCHAR(255),
      criterion VARCHAR(255),
      value VARCHAR(255),
      label TEXT,
      CONSTRAINT assessment_answers_assessment_fk FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS recommendations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      assessment_id CHAR(36) NOT NULL,
      category VARCHAR(255),
      criterion VARCHAR(255),
      priority VARCHAR(255),
      recommendation TEXT NOT NULL,
      CONSTRAINT recommendations_assessment_fk FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,
  ];

  for (const statement of statements) await pool.query(statement);
}

module.exports = { pool, initializeDatabase };
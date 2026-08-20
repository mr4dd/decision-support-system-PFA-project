const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('crypto');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

// using sqlite for testing, will migrate to mariaDB for prod
const { DatabaseSync } = require('node:sqlite');

const scrypt = promisify(scryptCallback);
const databasePath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'auth.sqlite');
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
`);

function validateCredentials(username, password) {
  if (typeof username !== 'string' || !username.trim()) return 'Username is required';
  if (typeof password !== 'string' || !password) return 'Password is required';
  return null;
}

async function createUser(username, password) {
  const validationError = validateCredentials(username, password);
  if (validationError) throw new Error(validationError);

  const normalizedUsername = username.trim();
  const salt = randomBytes(16);
  const passwordHash = await scrypt(password, salt, 64);

  try {
    const result = database.prepare(
      'INSERT INTO users (username, password_hash, password_salt) VALUES (?, ?, ?)'
    ).run(normalizedUsername, passwordHash.toString('hex'), salt.toString('hex'));
    return { id: Number(result.lastInsertRowid), username: normalizedUsername };
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) throw new Error('Username already exists');
    throw error;
  }
}

async function authenticate(username, password) {
  const validationError = validateCredentials(username, password);
  if (validationError) return null;

  const user = database.prepare(
    'SELECT id, username, password_hash, password_salt FROM users WHERE username = ?'
  ).get(username.trim());
  if (!user) return null;

  const expectedHash = Buffer.from(user.password_hash, 'hex');
  const actualHash = await scrypt(password, Buffer.from(user.password_salt, 'hex'), expectedHash.length);
  if (!timingSafeEqual(expectedHash, actualHash)) return null;
  return { id: Number(user.id), username: user.username };
}

function createSession(userId) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  database.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(token, userId, expiresAt);
  return { token, expiresAt };
}

function getUserBySession(token) {
  if (!token) return null;
  const session = database.prepare(`
    SELECT users.id, users.username, sessions.expires_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ?
  `).get(token);
  if (!session) return null;
  if (session.expires_at <= Date.now()) {
    database.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return { id: Number(session.id), username: session.username };
}

function deleteSession(token) {
  if (token) database.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

module.exports = { createUser, authenticate, createSession, getUserBySession, deleteSession };
const { createHash, randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('crypto');
const { promisify } = require('util');
const { pool } = require('./db');

const scrypt = promisify(scryptCallback);
const authSecret = process.env.AUTH_SECRET;

if (!authSecret) throw new Error('AUTH_SECRET is required');

function hashSessionToken(token) {
  return createHash('sha256').update(`${authSecret}:${token}`).digest('hex');
}

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
    const [result] = await pool.execute(
      'INSERT INTO users (username, password_hash, password_salt) VALUES (?, ?, ?)',
      [normalizedUsername, passwordHash.toString('hex'), salt.toString('hex')]
    );
    return { id: Number(result.insertId), username: normalizedUsername };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new Error('Username already exists');
    throw error;
  }
}

async function authenticate(username, password) {
  const validationError = validateCredentials(username, password);
  if (validationError) return null;
  const [rows] = await pool.execute(
    'SELECT id, username, password_hash, password_salt FROM users WHERE username = ?',
    [username.trim()]
  );
  const user = rows[0];
  if (!user) return null;

  const expectedHash = Buffer.from(user.password_hash, 'hex');
  const actualHash = await scrypt(password, Buffer.from(user.password_salt, 'hex'), expectedHash.length);
  if (!timingSafeEqual(expectedHash, actualHash)) return null;
  return { id: Number(user.id), username: user.username };
}

async function createSession(userId) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  await pool.execute('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', [hashSessionToken(token), userId, expiresAt]);
  return { token, expiresAt };
}

async function getUserBySession(token) {
  if (!token) return null;
  const [rows] = await pool.execute(`
    SELECT users.id, users.username, sessions.expires_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ?
  `, [hashSessionToken(token)]);
  const session = rows[0];
  if (!session) return null;
  if (Number(session.expires_at) <= Date.now()) {
    await pool.execute('DELETE FROM sessions WHERE token = ?', [hashSessionToken(token)]);
    return null;
  }
  return { id: Number(session.id), username: session.username };
}

async function deleteSession(token) {
  if (token) await pool.execute('DELETE FROM sessions WHERE token = ?', [hashSessionToken(token)]);
}

module.exports = { createUser, authenticate, createSession, getUserBySession, deleteSession };
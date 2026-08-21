const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const databasePath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'auth.sqlite');
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec('PRAGMA foreign_keys = ON');
database.exec(`
  CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (chat_id, sequence)
  );
  CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chat_id TEXT REFERENCES chat_sessions(id) ON DELETE SET NULL,
    source TEXT NOT NULL CHECK (source IN ('form', 'chat')),
    scores_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS assessment_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    category TEXT,
    criterion TEXT,
    value TEXT,
    label TEXT
  );
  CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    category TEXT,
    criterion TEXT,
    priority TEXT,
    recommendation TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS chat_sessions_user_updated ON chat_sessions(user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS assessments_user_created ON assessments(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS chat_messages_chat_sequence ON chat_messages(chat_id, sequence);
`);

const INITIAL_MESSAGE = `Bonjour ! Je vais vous poser quelques questions simples pour évaluer le niveau de maturité de votre entreprise en matière de cybersécurité. Pas besoin de connaissances techniques, répondez simplement selon ce que vous savez de votre organisation.

On va regrouper les questions en 5 grands thèmes :

Gouvernance — Avez-vous une politique de sécurité, une gestion des risques, et des responsabilités clairement définies ?
Connaissance de votre environnement — Savez-vous quels équipements/logiciels vous utilisez, comment vous gérez les mises à jour, et les risques liés à vos prestataires ?
Protection au quotidien — Mots de passe, double authentification, gestion des accès, chiffrement des données, sensibilisation des équipes.
Détection des menaces — Supervision de vos systèmes et protection antivirus.
Réponse aux incidents et reprise d'activité — Plan en cas d'incident, sauvegardes, et capacité à redémarrer après un problème.

On commence par la gouvernance ?`;

function createChat(userId) {
  const id = randomUUID();
  database.prepare('INSERT INTO chat_sessions (id, user_id) VALUES (?, ?)').run(id, userId);
  appendMessage(id, userId, 'assistant', INITIAL_MESSAGE);
  return { id, createdAt: new Date().toISOString() };
}

function getChat(userId, chatId) {
  const chat = database.prepare(
    'SELECT id, created_at AS createdAt, updated_at AS updatedAt FROM chat_sessions WHERE id = ? AND user_id = ?'
  ).get(chatId, userId);
  if (!chat) return null;
  const messages = database.prepare(
    'SELECT role, content AS text, created_at AS createdAt FROM chat_messages WHERE chat_id = ? ORDER BY sequence'
  ).all(chatId).map((message) => ({ ...message, text: String(message.text) }));
  return { ...chat, messages };
}

function listChats(userId) {
  return database.prepare(`
    SELECT chats.id, chats.created_at AS createdAt, chats.updated_at AS updatedAt,
      (SELECT content FROM chat_messages WHERE chat_id = chats.id ORDER BY sequence LIMIT 1 OFFSET 1) AS preview,
      (SELECT COUNT(*) FROM chat_messages WHERE chat_id = chats.id) AS messageCount
    FROM chat_sessions chats
    WHERE chats.user_id = ?
    ORDER BY chats.updated_at DESC
  `).all(userId);
}

function appendMessage(chatId, userId, role, content) {
  const ownsChat = database.prepare('SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?').get(chatId, userId);
  if (!ownsChat) return null;
  const sequence = database.prepare('SELECT COALESCE(MAX(sequence), 0) + 1 AS next FROM chat_messages WHERE chat_id = ?').get(chatId).next;
  database.prepare('INSERT INTO chat_messages (chat_id, role, content, sequence) VALUES (?, ?, ?, ?)')
    .run(chatId, role, String(content), sequence);
  database.prepare('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(chatId);
  return { role, text: String(content), sequence };
}

function createAssessment(userId, { source, chatId = null, answers = [], scores, recommendations = [] }) {
  const id = randomUUID();
  if (chatId && !database.prepare('SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?').get(chatId, userId)) {
    throw new Error('Chat not found');
  }

  database.prepare('INSERT INTO assessments (id, user_id, chat_id, source, scores_json) VALUES (?, ?, ?, ?, ?)')
    .run(id, userId, chatId, source, JSON.stringify(scores));
  const answerStatement = database.prepare(
    'INSERT INTO assessment_answers (assessment_id, question_id, category, criterion, value, label) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const answer of Array.isArray(answers) ? answers : []) {
    answerStatement.run(id, answer.id, answer.category ?? null, answer.criterion ?? null, answer.value ?? null, answer.label ?? null);
  }
  const recommendationStatement = database.prepare(
    'INSERT INTO recommendations (assessment_id, category, criterion, priority, recommendation) VALUES (?, ?, ?, ?, ?)'
  );
  for (const recommendation of Array.isArray(recommendations) ? recommendations : []) {
    recommendationStatement.run(id, recommendation.category ?? null, recommendation.criterion ?? null, recommendation.priority ?? recommendation.severity ?? null, recommendation.recommendation ?? recommendation.text ?? '');
  }
  return id;
}

function listAssessments(userId) {
  return database.prepare(`
    SELECT id, source, chat_id AS chatId, scores_json AS scoresJson, created_at AS createdAt
    FROM assessments WHERE user_id = ? ORDER BY created_at DESC
  `).all(userId).map((assessment) => ({
    id: assessment.id,
    source: assessment.source,
    chatId: assessment.chatId,
    createdAt: assessment.createdAt,
    scores: JSON.parse(assessment.scoresJson),
  }));
}

function getAssessment(userId, assessmentId) {
  const assessment = database.prepare(`
    SELECT id, source, chat_id AS chatId, scores_json AS scoresJson, created_at AS createdAt
    FROM assessments WHERE id = ? AND user_id = ?
  `).get(assessmentId, userId);
  if (!assessment) return null;
  const recommendations = database.prepare(
    'SELECT category, criterion, priority, recommendation FROM recommendations WHERE assessment_id = ? ORDER BY id'
  ).all(assessmentId);
  const answers = database.prepare(
    'SELECT question_id AS id, category, criterion, value, label FROM assessment_answers WHERE assessment_id = ? ORDER BY id'
  ).all(assessmentId);
  return {
    id: assessment.id,
    source: assessment.source,
    chatId: assessment.chatId,
    createdAt: assessment.createdAt,
    scores: JSON.parse(assessment.scoresJson),
    answers,
    recommendations,
  };
}

module.exports = {
  INITIAL_MESSAGE,
  createChat,
  getChat,
  listChats,
  appendMessage,
  createAssessment,
  listAssessments,
  getAssessment,
};
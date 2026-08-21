const { randomUUID } = require('crypto');
const { pool } = require('./db');

const INITIAL_MESSAGE = `Bonjour ! Je vais vous poser quelques questions simples pour évaluer le niveau de maturité de votre entreprise en matière de cybersécurité. Pas besoin de connaissances techniques, répondez simplement selon ce que vous savez de votre organisation.

On va regrouper les questions en 5 grands thèmes :

Gouvernance — Avez-vous une politique de sécurité, une gestion des risques, et des responsabilités clairement définies ?
Connaissance de votre environnement — Savez-vous quels équipements/logiciels vous utilisez, comment vous gérez les mises à jour, et les risques liés à vos prestataires ?
Protection au quotidien — Mots de passe, double authentification, gestion des accès, chiffrement des données, sensibilisation des équipes.
Détection des menaces — Supervision de vos systèmes et protection antivirus.
Réponse aux incidents et reprise d'activité — Plan en cas d'incident, sauvegardes, et capacité à redémarrer après un problème.

On commence par la gouvernance ?`;

async function createChat(userId) {
  const id = randomUUID();
  await pool.execute('INSERT INTO chat_sessions (id, user_id) VALUES (?, ?)', [id, userId]);
  await appendMessage(id, userId, 'assistant', INITIAL_MESSAGE);
  return { id, createdAt: new Date().toISOString() };
}

async function getChat(userId, chatId) {
  const [chatRows] = await pool.execute('SELECT id, created_at AS createdAt, updated_at AS updatedAt FROM chat_sessions WHERE id = ? AND user_id = ?', [chatId, userId]);
  const chat = chatRows[0];
  if (!chat) return null;
  const [messages] = await pool.execute('SELECT role, content AS text, created_at AS createdAt FROM chat_messages WHERE chat_id = ? ORDER BY sequence_number', [chatId]);
  return { ...chat, messages: messages.map((message) => ({ ...message, text: String(message.text) })) };
}

async function listChats(userId) {
  const [rows] = await pool.execute(`
    SELECT chats.id, chats.created_at AS createdAt, chats.updated_at AS updatedAt,
      (SELECT content FROM chat_messages WHERE chat_id = chats.id ORDER BY sequence_number LIMIT 1 OFFSET 1) AS preview,
      (SELECT COUNT(*) FROM chat_messages WHERE chat_id = chats.id) AS messageCount
    FROM chat_sessions chats WHERE chats.user_id = ? ORDER BY chats.updated_at DESC
  `, [userId]);
  return rows;
}

async function appendMessage(chatId, userId, role, content) {
  const [ownedRows] = await pool.execute('SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?', [chatId, userId]);
  if (!ownedRows[0]) return null;
  const [sequenceRows] = await pool.execute('SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next FROM chat_messages WHERE chat_id = ?', [chatId]);
  const sequence = Number(sequenceRows[0].next);
  await pool.execute('INSERT INTO chat_messages (chat_id, role, content, sequence_number) VALUES (?, ?, ?, ?)', [chatId, role, String(content), sequence]);
  await pool.execute('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [chatId]);
  return { role, text: String(content), sequence };
}

async function createAssessment(userId, { source, chatId = null, answers = [], scores, recommendations = [] }) {
  const id = randomUUID();
  if (chatId) {
    const [chatRows] = await pool.execute('SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?', [chatId, userId]);
    if (!chatRows[0]) throw new Error('Chat not found');
  }
  await pool.execute('INSERT INTO assessments (id, user_id, chat_id, source, scores_json) VALUES (?, ?, ?, ?, ?)', [id, userId, chatId, source, JSON.stringify(scores)]);
  for (const answer of Array.isArray(answers) ? answers : []) {
    await pool.execute('INSERT INTO assessment_answers (assessment_id, question_id, category, criterion, value, label) VALUES (?, ?, ?, ?, ?, ?)', [id, answer.id, answer.category ?? null, answer.criterion ?? null, answer.value ?? null, answer.label ?? null]);
  }
  for (const recommendation of Array.isArray(recommendations) ? recommendations : []) {
    await pool.execute('INSERT INTO recommendations (assessment_id, category, criterion, priority, recommendation) VALUES (?, ?, ?, ?, ?)', [id, recommendation.category ?? null, recommendation.criterion ?? null, recommendation.priority ?? recommendation.severity ?? null, recommendation.recommendation ?? recommendation.text ?? '']);
  }
  return id;
}

async function listAssessments(userId) {
  const [rows] = await pool.execute('SELECT id, source, chat_id AS chatId, scores_json AS scoresJson, created_at AS createdAt FROM assessments WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  return rows.map((assessment) => ({ ...assessment, scores: JSON.parse(assessment.scoresJson) }));
}

async function getAssessment(userId, assessmentId) {
  const [assessmentRows] = await pool.execute('SELECT id, source, chat_id AS chatId, scores_json AS scoresJson, created_at AS createdAt FROM assessments WHERE id = ? AND user_id = ?', [assessmentId, userId]);
  const assessment = assessmentRows[0];
  if (!assessment) return null;
  const [recommendations] = await pool.execute('SELECT category, criterion, priority, recommendation FROM recommendations WHERE assessment_id = ? ORDER BY id', [assessmentId]);
  const [answers] = await pool.execute('SELECT question_id AS id, category, criterion, value, label FROM assessment_answers WHERE assessment_id = ? ORDER BY id', [assessmentId]);
  return { ...assessment, scores: JSON.parse(assessment.scoresJson), answers, recommendations };
}

module.exports = { INITIAL_MESSAGE, createChat, getChat, listChats, appendMessage, createAssessment, listAssessments, getAssessment };
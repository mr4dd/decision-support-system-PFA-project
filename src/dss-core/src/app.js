const express = require('express');
const { randomUUID } = require('crypto');
require('dotenv').config();
const { initializeDatabase } = require('./db');
const { computeScores } = require('./modules/scoring');
const { chat, extract } = require('./modules/AI');
const { createUser, authenticate, createSession, getUserBySession, deleteSession } = require('./auth');
const {
  createChat,
  getChat,
  listChats,
  appendMessage,
  createAssessment,
  listAssessments,
  getAssessment,
} = require('./storage');
const logger = require('./logger');

const extraction_schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      category: { type: 'string' },
      criterion: { type: 'string' },
      value: { type: 'integer' },
      label: { type: 'string' },
    },
    required: ['id', 'category', 'criterion', 'value'],
  },
};
const recommendation_schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      category: { type: 'string' },
      criterion: { type: 'string' },
      priority: { type: 'string' },
      recommendation: { type: 'string' },
    },
    required: ['category', 'criterion', 'priority', 'recommendation'],
  },
};

const app = express();

app.use((req, res, next) => {
  const requestId = req.get('x-request-id') || randomUUID();
  const startedAt = process.hrtime.bigint();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  logger.info('Request started', {
    requestId,
    method: req.method,
    path: req.originalUrl,
    contentLength: req.get('content-length') || 0,
  });

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    });
  });

  next();
});

app.use(express.json());

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(cookieHeader.split(';').filter(Boolean).map((cookie) => {
    const separator = cookie.indexOf('=');
    const name = separator >= 0 ? cookie.slice(0, separator).trim() : cookie.trim();
    const value = separator >= 0 ? cookie.slice(separator + 1).trim() : '';
    return [name, decodeURIComponent(value)];
  }));
}

function setSessionCookie(res, token, maxAge) {
  res.setHeader('Set-Cookie', `session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`);
}

async function requireAuth(req, res, next) {
  const user = await getUserBySession(parseCookies(req.get('cookie')).session);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  req.user = user;
  return next();
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const user = await createUser(req.body?.username, req.body?.password);
    const session = await createSession(user.id);
    setSessionCookie(res, session.token, 7 * 24 * 60 * 60);
    res.status(201).json({ user });
  } catch (error) {
    const statusCode = error.message === 'Username already exists' || error.message.endsWith('is required') ? 400 : 500;
    res.status(statusCode).json({ error: statusCode === 500 ? 'Unable to create account' : error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const user = await authenticate(req.body?.username, req.body?.password);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  const session = await createSession(user.id);
  setSessionCookie(res, session.token, 7 * 24 * 60 * 60);
  return res.json({ user });
});

app.get('/api/auth/me', async (req, res) => {
  const user = await getUserBySession(parseCookies(req.get('cookie')).session);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  return res.json({ user });
});

app.post('/api/auth/logout', async (req, res) => {
  await deleteSession(parseCookies(req.get('cookie')).session);
  setSessionCookie(res, '', 0);
  return res.status(204).end();
});

app.get('/api/history', requireAuth, async (req, res) => {
  res.json({ scores: await listAssessments(req.user.id), chats: await listChats(req.user.id) });
});

app.get('/api/scores/:assessmentId', requireAuth, async (req, res) => {
  const assessment = await getAssessment(req.user.id, req.params.assessmentId);
  if (!assessment) return res.status(404).json({ error: 'Score not found' });
  return res.json(assessment);
});

app.get('/api/chats/:chatId', requireAuth, async (req, res) => {
  const chatSession = await getChat(req.user.id, req.params.chatId);
  if (!chatSession) return res.status(404).json({ error: 'Chat not found' });
  return res.json(chatSession);
});

async function getOrCreateChat(userId, chatId) {
  if (chatId) return getChat(userId, chatId);
  return createChat(userId);
}

app.post('/api/score', requireAuth, async (req, res) => {
  const requestId = req.requestId;
  const answers = req.body.responses ?? req.body;
  logger.info('Score calculation started', {
    requestId,
    answerCount: Array.isArray(answers) ? answers.length : null,
    hasResponsesProperty: Array.isArray(req.body.responses),
  });

  try {
    const scores = computeScores(answers);
    logger.debug('Score calculation completed', {
      requestId,
      categoryCount: Object.keys(scores.categories).length,
      globalScore: scores.global.score,
    });
    const recommendations = await extract(recommendation_schema, scores);

    const assessmentId = await createAssessment(req.user.id, {
      source: 'form',
      answers,
      scores,
      recommendations,
    });

    logger.info('Score response ready', {
      requestId,
      recommendationCount: Array.isArray(recommendations) ? recommendations.length : null,
    });
    res.json({ status: 'ok', assessmentId, response: {scores: scores, recs: recommendations} });
  } catch (err) {
    logger.error('Score request failed', {
      requestId,
      ...logger.errorDetails(err),
    });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', requireAuth, async (req, res) => {
  const requestId = req.requestId;
  const message = req.body?.message;
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }
  logger.info('Chat request received', {
    requestId,
    messageType: typeof message,
    messageLength: typeof message === 'string' ? message.length : null,
    operation: message === 'calculer' ? 'score' : 'chat',
  });

  try {
    const chatSession = await getOrCreateChat(req.user.id, req.body?.chatId);
    if (!chatSession) return res.status(404).json({ error: 'Chat not found' });
    await appendMessage(chatSession.id, req.user.id, 'user', message);
    const currentChat = await getChat(req.user.id, chatSession.id);
    if (message != "calculer") {
      const response = await chat(message, currentChat.messages.slice(0, -1), { requestId, chatId: chatSession.id });
      await appendMessage(chatSession.id, req.user.id, 'assistant', response);

      logger.info('Chat response ready', {
        requestId,
        responseLength: typeof response === 'string' ? response.length : null,
      });
      res.json({ status: 'ok', chatId: chatSession.id, response, type: 'chat' });
    } else {
      logger.info('Chat scoring started', { requestId });
      const structured_data = await extract(extraction_schema, currentChat.messages, { requestId, chatId: chatSession.id });
      const scores = computeScores(structured_data);
      logger.debug('Chat scoring data extracted', {
        requestId,
        answerCount: Array.isArray(structured_data) ? structured_data.length : null,
      });
      const recommendations = await extract(
        recommendation_schema,
        [...currentChat.messages, { role: 'user', text: JSON.stringify(scores) }],
        { requestId, chatId: chatSession.id }
      );

      const assessmentId = await createAssessment(req.user.id, {
        source: 'chat',
        chatId: chatSession.id,
        answers: structured_data,
        scores,
        recommendations,
      });

      logger.info('Chat scoring completed', {
        requestId,
        categoryCount: Object.keys(scores.categories).length,
        globalScore: scores.global.score,
        recommendationCount: Array.isArray(recommendations) ? recommendations.length : null,
      });
      res.json({ status: 'ok', chatId: chatSession.id, assessmentId, response: {scores, recs: recommendations}, type: 'score' });
    }
  } catch (err) {
    logger.error('Chat request failed', {
      requestId,
      operation: message === 'calculer' ? 'score' : 'chat',
      ...logger.errorDetails(err),
    });
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
initializeDatabase()
  .then(() => app.listen(PORT, () => logger.info('Server listening', { port: PORT, logLevel: process.env.LOG_LEVEL || 'info' })))
  .catch((error) => {
    logger.error('Database initialization failed', logger.errorDetails(error));
    process.exitCode = 1;
  });
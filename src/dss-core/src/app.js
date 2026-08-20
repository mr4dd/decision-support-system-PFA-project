const express = require('express');
const { randomUUID } = require('crypto');
require('dotenv').config();
const { computeScores } = require('./modules/scoring');
const { chat, extract } = require('./modules/AI');
const { createUser, authenticate, createSession, getUserBySession, deleteSession } = require('./auth');
const logger = require('./logger');

const extraction_schema = {

}
const recommendation_schema = {

}

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

function requireAuth(req, res, next) {
  const user = getUserBySession(parseCookies(req.get('cookie')).session);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  req.user = user;
  return next();
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const user = await createUser(req.body?.username, req.body?.password);
    const session = createSession(user.id);
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
  const session = createSession(user.id);
  setSessionCookie(res, session.token, 7 * 24 * 60 * 60);
  return res.json({ user });
});

app.get('/api/auth/me', (req, res) => {
  const user = getUserBySession(parseCookies(req.get('cookie')).session);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  return res.json({ user });
});

app.post('/api/auth/logout', (req, res) => {
  deleteSession(parseCookies(req.get('cookie')).session);
  setSessionCookie(res, '', 0);
  return res.status(204).end();
});

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
    // mock recommendations for testing to not hammer API
    const recommendations = [{
      "category": "Identifier",
      "criterion": "asset-inventory",
      "priority": "Élevée",
      "recommendation": "Mettre en place un inventaire centralisé et automatisé des équipements et logiciels (outil de type CMDB ou solution de découverte réseau) afin de garantir une mise à jour continue."
    },
    {
      "category": "Identifier",
      "criterion": "patch-management",
      "priority": "Élevée",
      "recommendation": "Formaliser un processus régulier de gestion des correctifs, idéalement automatisé (WSUS, gestionnaire de patchs), avec suivi des délais d'application selon la criticité des vulnérabilités."
    },
    {
      "category": "Identifier",
      "criterion": "third-party-risk",
      "priority": "Modérée",
      "recommendation": "Structurer une évaluation systématique des prestataires critiques (questionnaire de sécurité, clauses contractuelles) plutôt qu'une appréciation informelle."
    },
    {
      "category": "Protéger",
      "criterion": "passwords",
      "priority": "Modérée",
      "recommendation": "Formaliser et faire appliquer une politique de mots de passe (longueur, complexité, unicité, gestionnaire de mots de passe) plutôt que de s'appuyer sur des pratiques informelles."
    },
    {
      "category": "Protéger",
      "criterion": "mfa",
      "priority": "Élevée",
      "recommendation": "Étendre l'authentification multi-facteurs au-delà des comptes administrateurs, en priorité aux accès distants, messagerie et applications sensibles."
    },
    {
      "category": "Répondre",
      "criterion": "breach-notification",
      "priority": "Élevée",
      "recommendation": "Créer une procédure de notification en cas d'incident (obligations CNIL/RGPD, information des clients) précisant les délais, responsables et modèles de communication."
    },
    {
      "category": "Récupérer",
      "criterion": "bcp-drp",
      "priority": "Modérée",
      "recommendation": "Documenter le plan de continuité et de reprise d'activité (PCA/PRA) et prévoir un premier exercice de test pour valider sa faisabilité."
    }]//await extract(recommendation_schema, scores);

    logger.info('Score response ready', {
      requestId,
      recommendationCount: Array.isArray(recommendations) ? recommendations.length : null,
    });
    res.json({ status: 'ok', response: {scores: scores, recs: recommendations} });
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
  logger.info('Chat request received', {
    requestId,
    messageType: typeof message,
    messageLength: typeof message === 'string' ? message.length : null,
    operation: message === 'calculer' ? 'score' : 'chat',
  });

  try {
    if (message != "calculer") {
      const response = await chat(message, { requestId });

      logger.info('Chat response ready', {
        requestId,
        responseLength: typeof response === 'string' ? response.length : null,
      });
      res.json({status: 'ok', response: response, type: 'chat'})
    } else {
      logger.info('Chat scoring started', { requestId });
      const structured_data = await extract(extraction_schema, [], { requestId });
      const scores = computeScores(structured_data);
      logger.debug('Chat scoring data extracted', {
        requestId,
        answerCount: Array.isArray(structured_data) ? structured_data.length : null,
      });
      const recommendations = await extract(recommendation_schema, [], { requestId });

      logger.info('Chat scoring completed', {
        requestId,
        categoryCount: Object.keys(scores.categories).length,
        globalScore: scores.global.score,
        recommendationCount: Array.isArray(recommendations) ? recommendations.length : null,
      });
      res.json({status: 'ok', response: {scores: scores, recs: recommendations}, type: 'score'})
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
app.listen(PORT, () => logger.info('Server listening', { port: PORT, logLevel: process.env.LOG_LEVEL || 'info' }));
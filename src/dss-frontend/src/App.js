import './App.css';
import { useEffect, useMemo, useState } from 'react';
import Questionnaire from './components/Questionnaire';
import ConversationalUI from './components/ConversationalUI';
import SecuritySetupScore from './components/SecurityScore';
import Login from './components/Login';
import Profile from './components/Profile';
import { questions } from './data/questions';

function normalizeScore(score, maxScore = 3) {
  const numericScore = Number(score ?? 0);
  if (!Number.isFinite(numericScore)) return 0;
  return Math.max(0, Math.min(100, (numericScore / maxScore) * 100));
}

function normalizeSeverity(priority) {
  const normalizedPriority = String(priority ?? '').toLowerCase();
  if (normalizedPriority.includes('élev') || normalizedPriority.includes('high')) return 'high';
  if (normalizedPriority.includes('faibl') || normalizedPriority.includes('low')) return 'low';
  return 'medium';
}

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [answers, setAnswers] = useState({});
  const [mode, setMode] = useState('form');
  const [scoreResult, setScoreResult] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [view, setView] = useState('assessment');
  const [history, setHistory] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setScoreResult(null);
  }

  async function openProfile() {
    const response = await fetch('/api/history');
    if (!response.ok) return;
    setHistory(await response.json());
    setView('profile');
  }

  async function openScore(assessmentId) {
    const response = await fetch(`/api/scores/${assessmentId}`);
    if (!response.ok) return;
    const assessment = await response.json();
    setScoreResult({ response: { scores: assessment.scores, recs: assessment.recommendations }, assessmentId });
    setView('assessment');
  }

  function openChat(chatId) {
    setActiveChatId(chatId);
    setScoreResult(null);
    setMode('conversation');
    setView('assessment');
  }

  const handleAnswerChange = (questionId, value) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const scoreCategories = useMemo(() => {
    if (!scoreResult) return [];
    const scores = scoreResult.response?.scores ?? scoreResult.scores ?? scoreResult.response ?? scoreResult;
    const categories = scores.categories ?? {};
    return Object.entries(categories).map(([name, category]) => ({
      name,
      score: normalizeScore(category?.score, category?.maxScore ?? 3),
    }));
  }, [scoreResult]);

  const overallScore = useMemo(() => {
    if (!scoreResult) return 0;
    const scores = scoreResult.response?.scores ?? scoreResult.scores ?? scoreResult.response ?? scoreResult;
    const global = scores.global ?? {};
    return normalizeScore(global?.score, global?.maxScore ?? 3);
  }, [scoreResult]);

  const recommendations = useMemo(() => {
    if (!scoreResult) return [];
    const rawRecommendations = scoreResult.response?.recs
      ?? scoreResult.recs
      ?? scoreResult.response?.recommendations
      ?? scoreResult.recommendations
      ?? [];

    return Array.isArray(rawRecommendations)
      ? rawRecommendations.map((recommendation) => ({
        category: recommendation.category,
        text: recommendation.text ?? recommendation.recommendation,
        severity: recommendation.severity ?? normalizeSeverity(recommendation.priority),
      }))
      : [];
  }, [scoreResult]);

  if (!authChecked || !user) {
    return <Login onAuthenticated={setUser} />;
  }

  if (view === 'profile') {
    return <div className="App"><Profile history={history} onOpenScore={openScore} onOpenChat={openChat} onBack={() => setView('assessment')} /></div>;
  }

  if (scoreResult) {
    return (
      <div className="App">
        <div className="app-header">
          <span>{user.username}</span>
          <button type="button" className="auth-profile" onClick={openProfile}>Profil</button>
          <button type="button" className="auth-logout" onClick={handleLogout}>Se déconnecter</button>
        </div>
        <div className="survey-container">
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="conversation-submit" onClick={() => setScoreResult(null)}>Réévaluer</button>
          </div>
          <SecuritySetupScore
            categories={scoreCategories}
            overallScore={overallScore}
            recommendations={recommendations}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="app-header">
        <span>{user.username}</span>
        <button type="button" className="auth-profile" onClick={openProfile}>Profil</button>
        <button type="button" className="auth-logout" onClick={handleLogout}>Se déconnecter</button>
      </div>
      <div className="mode-toggle" role="tablist">
        <button
          type="button"
          className={mode === 'form' ? 'toggle active' : 'toggle'}
          onClick={() => setMode('form')}
          role="tab"
          aria-selected={mode === 'form'}
        >
          Formulaire
        </button>
        <button
          type="button"
          className={mode === 'conversation' ? 'toggle active' : 'toggle'}
          onClick={() => setMode('conversation')}
          role="tab"
          aria-selected={mode === 'conversation'}
        >
          Conversation
        </button>
      </div>

      <div className="survey-container">
        {mode === 'form' ? (
          <Questionnaire
            questions={questions}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            onSubmitSuccess={setScoreResult}
          />
        ) : (
          <ConversationalUI
            chatId={activeChatId}
            onChatIdChange={setActiveChatId}
            onScoreResult={setScoreResult}
          />
        )}
      </div>
    </div>
  );
}

export default App;

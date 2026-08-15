import './App.css';
import { useMemo, useState } from 'react';
import Questionnaire from './components/Questionnaire';
import ConversationalUI from './components/ConversationalUI';
import SecuritySetupScore from './components/SecurityScore';
import { questions } from './data/questions';

function normalizeScore(score, maxScore = 3) {
  const numericScore = Number(score ?? 0);
  if (!Number.isFinite(numericScore)) return 0;
  return Math.max(0, Math.min(100, (numericScore / maxScore) * 100));
}

function App() {
  const [answers, setAnswers] = useState({});
  const [mode, setMode] = useState('form');
  const [scoreResult, setScoreResult] = useState(null);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const scoreCategories = useMemo(() => {
    if (!scoreResult) return [];
    const categories = scoreResult.response?.categories ?? scoreResult.categories ?? {};
    return Object.entries(categories).map(([name, category]) => ({
      name,
      score: normalizeScore(category?.score, category?.maxScore ?? 3),
    }));
  }, [scoreResult]);

  const overallScore = useMemo(() => {
    if (!scoreResult) return 0;
    const global = scoreResult.response?.global ?? scoreResult.global ?? {};
    return normalizeScore(global?.score, global?.maxScore ?? 3);
  }, [scoreResult]);

  if (scoreResult) {
    return (
      <div className="App">
        <div className="survey-container">
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="conversation-submit" onClick={() => setScoreResult(null)}>
              Réévaluer
            </button>
          </div>
          <SecuritySetupScore categories={scoreCategories} overallScore={overallScore} />
        </div>
      </div>
    );
  }

  return (
    <div className="App">
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
          <ConversationalUI questions={questions} answers={answers} onAnswerChange={handleAnswerChange} />
        )}
      </div>
    </div>
  );
}

export default App;

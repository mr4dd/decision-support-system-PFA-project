import './App.css';
import { useState } from 'react';
import Questionnaire from './components/Questionnaire';
import ConversationalUI from './components/ConversationalUI';
import { questions } from './data/questions';

function App() {
  const [answers, setAnswers] = useState({});
  const [mode, setMode] = useState('form');

  const handleAnswerChange = (questionId, value) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

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
          <Questionnaire questions={questions} answers={answers} onAnswerChange={handleAnswerChange} />
        ) : (
          <ConversationalUI questions={questions} answers={answers} onAnswerChange={handleAnswerChange} />
        )}
      </div>
    </div>
  );
}

export default App;

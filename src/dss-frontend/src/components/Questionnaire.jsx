import React, { useMemo, useState } from 'react';

export default function Questionnaire({ questions, answers, onAnswerChange, onSubmitSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const allAnswered = useMemo(
    () => questions.every((q) => answers[q.id] !== undefined && answers[q.id] !== ''),
    [questions, answers]
  );

  const buildPayload = () => {
    const responses = questions.map((q) => {
      const value = answers[q.id] ?? null;
      const option = q.scale.options.find((o) => o.value === value);
      return {
        id: q.id,
        category: q.category,
        criterion: q.criterion,
        value,
        label: option ? option.label : null,
      };
    });

    return {
      timestamp: new Date().toISOString(),
      responses,
    };
  };

  const handleSubmit = async (event) => {
    event?.preventDefault();
    if (!allAnswered) {
      setStatusMessage('Please answer all questions before submitting.');
      return;
    }

    const payload = buildPayload();
    setSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setStatusMessage('Submitted successfully.');
      onSubmitSuccess?.(data);
    } catch (err) {
      setStatusMessage(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="questionnaire" onSubmit={handleSubmit}>
      <div className="section-title">Evaluation</div>
      <div className="questions-grid">
        {questions.map((question) => (
          <div key={question.id} className="question-card">
            <div className="question-row">
              <strong>{question.category}</strong>
              <span>{question.criterion}</span>
            </div>
            <p className="scale-text">{question.prompt}</p>
            <select
              className="select-input"
              value={answers[question.id] ?? ''}
              onChange={(event) => onAnswerChange(question.id, event.target.value)}
            >
              <option value="">Sélectionner</option>
              {question.scale.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button type="submit" className="conversation-submit" disabled={!allAnswered || submitting}>
          {submitting ? 'Envoi...' : 'Soumettre'}
        </button>
        {statusMessage && <div style={{ color: submitting ? 'inherit' : '#b91c1c' }}>{statusMessage}</div>}
      </div>
    </form>
  );
}

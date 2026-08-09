import React from 'react';

export default function Questionnaire({ questions, answers, onAnswerChange }) {
  return (
    <section className="questionnaire">
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
    </section>
  );
}

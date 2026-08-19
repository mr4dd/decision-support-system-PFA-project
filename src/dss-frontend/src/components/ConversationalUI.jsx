import React, { useEffect, useRef, useState } from 'react';

const INITIAL_MESSAGE = {
  role: 'assistant',
  text: `Bonjour ! Je vais vous poser quelques questions simples pour évaluer le niveau de maturité de votre entreprise en matière de cybersécurité. Pas besoin de connaissances techniques, répondez simplement selon ce que vous savez de votre organisation.

  On va regrouper les questions en 5 grands thèmes :

  Gouvernance — Avez-vous une politique de sécurité, une gestion des risques, et des responsabilités clairement définies ?
  Connaissance de votre environnement — Savez-vous quels équipements/logiciels vous utilisez, comment vous gérez les mises à jour, et les risques liés à vos prestataires ?
  Protection au quotidien — Mots de passe, double authentification, gestion des accès, chiffrement des données, sensibilisation des équipes.
  Détection des menaces — Supervision de vos systèmes et protection antivirus.
  Réponse aux incidents et reprise d'activité — Plan en cas d'incident, sauvegardes, et capacité à redémarrer après un problème.

  On commence par la gouvernance ?`,
};

export default function ConversationalUI({ onScoreResult }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);

  const userMessageCount = messages.filter((message) => message.role === 'user').length;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);



  const sendMessage = async (message) => {
    setMessages((current) => [...current, { role: 'user', text: message }]);
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Impossible de contacter le serveur.');

      if (data.type === 'score') {
        onScoreResult?.(data);
      } else if (data.response) {
        setMessages((current) => [...current, { role: 'assistant', text: data.response }]);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setInput('');
    sendMessage(trimmed);
  };

  const handleCalculate = () => {
    if (userMessageCount <= 2 || isSending) return;
    sendMessage('calculer');
  };

  return (
    <section className="conversation chat-app">
      <div className="chat-header">
        <div className="chat-header-title">Conversation</div>
      </div>

      <div className="chat-window" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-empty">Commencez à discuter.</div>
        ) : (
          messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
              <div className="chat-bubble">{message.text}</div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="chat-footer">
        <input
          className="conversation-input"
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Entrez un message..."
        />
        <button type="button" className="conversation-submit" onClick={handleSubmit} disabled={isSending}>
          Envoyer
        </button>
        <button
          type="button"
          className="conversation-submit"
          onClick={handleCalculate}
          disabled={userMessageCount <= 2 || isSending}
        >
          Calculer le score
        </button>
        {error && <div role="alert" className="chat-error">{error}</div>}
      </div>
    </section>
  );
}

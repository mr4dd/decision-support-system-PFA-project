import React, { useEffect, useRef, useState } from 'react';

export default function ConversationalUI() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((current) => [...current, { role: 'user', text: trimmed }]);
    setInput('');
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
        <button type="button" className="conversation-submit" onClick={handleSubmit}>
          Envoyer
        </button>
      </div>
    </section>
  );
}

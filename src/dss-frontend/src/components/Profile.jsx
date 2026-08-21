export default function Profile({ history, onOpenScore, onOpenChat, onBack }) {
  const scores = history?.scores ?? [];
  const chats = history?.chats ?? [];

  return (
    <section className="history-page">
      <div className="history-heading">
        <div>
          <p className="auth-kicker">PROFIL</p>
          <h1>Votre historique</h1>
        </div>
        <button type="button" className="auth-switch" onClick={onBack}>Retour</button>
      </div>

      <div className="history-grid">
        <div className="history-section">
          <h2>Scores précédents</h2>
          {scores.length === 0 ? <p className="history-empty">Aucun score enregistré.</p> : scores.map((score) => (
            <button type="button" className="history-item" key={score.id} onClick={() => onOpenScore(score.id)}>
              <span>{score.source === 'chat' ? 'Score de conversation' : 'Évaluation formulaire'}</span>
              <strong>{score.scores?.global?.score ?? '—'} / 3</strong>
              <small>{new Date(score.createdAt).toLocaleString()}</small>
            </button>
          ))}
        </div>

        <div className="history-section">
          <h2>Conversations précédentes</h2>
          {chats.length === 0 ? <p className="history-empty">Aucune conversation enregistrée.</p> : chats.map((chat) => (
            <button type="button" className="history-item" key={chat.id} onClick={() => onOpenChat(chat.id)}>
              <span>Conversation</span>
              <strong>{chat.preview || 'Nouvelle conversation'}</strong>
              <small>{chat.messageCount} message(s) · {new Date(chat.updatedAt).toLocaleString()}</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
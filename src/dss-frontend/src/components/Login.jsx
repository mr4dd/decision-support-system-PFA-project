import { useState } from 'react';

export default function Login({ onAuthenticated }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(isRegistering ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to authenticate');
      onAuthenticated(data.user);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-panel" onSubmit={handleSubmit}>
        <p className="auth-kicker">DSS</p>
        <h1>{isRegistering ? 'Créer un compte' : 'Connexion'}</h1>
        <p className="auth-intro">Accédez à votre espace d’évaluation.</p>

        <label htmlFor="username">Nom d’utilisateur</label>
        <input
          id="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          required
        />

        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={isRegistering ? 'new-password' : 'current-password'}
          required
        />

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Patientez...' : isRegistering ? 'Créer le compte' : 'Se connecter'}
        </button>
        <button
          className="auth-switch"
          type="button"
          onClick={() => { setIsRegistering((current) => !current); setError(''); }}
        >
          {isRegistering ? 'J’ai déjà un compte' : 'Créer un compte'}
        </button>
      </form>
    </main>
  );
}
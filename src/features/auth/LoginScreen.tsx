import { useCallback, useEffect, useRef, useState } from 'react';
import { BrandSpinner } from '../../components/BrandSpinner';
import { LogoMark } from '../../components/LogoMark';
import { getStoredClientId, login, persistClientId } from './authStore';

type LoginPhase =
  | 'idle'
  | 'no-client-id'
  | 'ready'
  | 'logging-in'
  | 'error'
  | 'premium-required';

interface LoginScreenProps {
  onAuthenticated: () => void;
}

export function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const [phase, setPhase] = useState<LoginPhase>('idle');
  const [clientId, setClientId] = useState(getStoredClientId);
  const [errorMessage, setErrorMessage] = useState('');
  const clientIdInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (clientId) {
      setPhase('ready');
    } else {
      setPhase('no-client-id');
      clientIdInputRef.current?.focus();
    }
  }, [clientId]);

  const handleLogin = useCallback(async () => {
    const id = clientId.trim();
    if (!id) {
      setPhase('no-client-id');
      return;
    }

    setPhase('logging-in');
    setErrorMessage('');

    try {
      await login(id);
      setPhase('ready');
      onAuthenticated();
    } catch (err) {
      const msg = typeof err === 'string' ? err : 'Login failed';
      if (msg.includes('premium') || msg.includes('Premium')) {
        setPhase('premium-required');
        setErrorMessage(msg);
      } else {
        setPhase('error');
        setErrorMessage(msg);
      }
    }
  }, [clientId, onAuthenticated]);

  const handleSaveClientId = useCallback(() => {
    const id = clientId.trim();
    if (id) {
      persistClientId(id);
      setPhase('ready');
    }
  }, [clientId]);

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">
          <LogoMark size={44} decorative />
        </div>

        <h1 className="auth-title">Litetify</h1>
        <p className="auth-tagline">Lightweight. Moddable. Yours.</p>

        {phase === 'no-client-id' && (
          <div className="auth-section">
            <p className="auth-desc" id="lt-client-id-desc">
              Enter your Spotify <strong>Client ID</strong> to get started.
            </p>
            <p className="auth-hint">
              Create one at{' '}
              <a
                href="https://developer.spotify.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="auth-link"
              >
                developer.spotify.com/dashboard
              </a>{' '}
              and add redirect URI{' '}
              <code className="auth-code">http://127.0.0.1:14523/callback</code>{' '}
              to your app.
            </p>
            <label htmlFor="lt-client-id" className="sr-only">
              Spotify Client ID
            </label>
            <input
              id="lt-client-id"
              ref={clientIdInputRef}
              className="auth-input"
              type="text"
              autoComplete="off"
              placeholder="Paste your Spotify Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveClientId()}
              aria-describedby="lt-client-id-desc"
              aria-label="Paste your Spotify Client ID"
            />
            <button
              className="auth-btn auth-btn-primary"
              onClick={handleSaveClientId}
            >
              Save
            </button>
          </div>
        )}

        {phase === 'ready' && (
          <div className="auth-section">
            <p className="auth-desc">
              Log in with your Spotify Premium account.
            </p>
            <button className="auth-btn auth-btn-primary" onClick={handleLogin}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Log in with Spotify
            </button>
          </div>
        )}

        {phase === 'logging-in' && (
          <div className="auth-section">
            <BrandSpinner />
            <p className="auth-desc">Opening browser for authentication...</p>
            <p className="auth-hint">
              Authorize Litetify in your browser, then return here.
            </p>
          </div>
        )}

        {phase === 'error' && (
          <div className="auth-section">
            <p className="auth-error">{errorMessage}</p>
            <button
              className="auth-btn auth-btn-primary"
              onClick={() => setPhase('ready')}
            >
              Try again
            </button>
          </div>
        )}

        {phase === 'premium-required' && (
          <div className="auth-section">
            <p className="auth-error">{errorMessage}</p>
            <p className="auth-hint">
              Litetify requires a Spotify Premium subscription.
              <br />
              <a
                href="https://www.spotify.com/premium"
                target="_blank"
                rel="noopener noreferrer"
                className="auth-link"
              >
                Upgrade to Premium
              </a>
            </p>
          </div>
        )}

        <div className="auth-footer">
          <button
            className="auth-btn auth-btn-ghost"
            onClick={() => {
              setClientId('');
              setPhase('no-client-id');
            }}
          >
            Change Client ID
          </button>
        </div>
      </div>
    </main>
  );
}

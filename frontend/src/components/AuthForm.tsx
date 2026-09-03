import { useState } from 'react';
import type { FormEvent } from 'react';
import { AvatarPreview } from './AvatarPreview';
import { loginRequest, registerRequest } from '../services/api';
import { randomSeed } from '../services/avatar';
import { useAuthStore } from '../store/auth';

export function AuthForm() {
  const setSession = useAuthStore((s) => s.setSession);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatarSeed, setAvatarSeed] = useState(() => randomSeed());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result =
        mode === 'login'
          ? await loginRequest(email, password)
          : await registerRequest(email, password, name, avatarSeed);
      setSession(result.token, result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>{mode === 'login' ? 'Log in to SalaLivre' : 'Create your SalaLivre account'}</h1>

        {mode === 'register' && (
          <>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>

            <div className="avatar-picker">
              <AvatarPreview seed={avatarSeed} />
              <div className="avatar-picker-controls">
                <label>
                  Avatar seed
                  <input value={avatarSeed} onChange={(e) => setAvatarSeed(e.target.value)} required />
                </label>
                <button type="button" className="link-button" onClick={() => setAvatarSeed(randomSeed())}>
                  Shuffle
                </button>
              </div>
            </div>
          </>
        )}

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Register'}
        </button>

        <button
          type="button"
          className="link-button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Log in'}
        </button>
      </form>
    </div>
  );
}

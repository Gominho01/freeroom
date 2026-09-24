import { useState } from 'react';
import type { FormEvent } from 'react';
import { AvatarPreview } from './AvatarPreview';
import { loginRequest, registerRequest } from '../services/api';
import { randomSeed } from '../services/avatar';
import { useAuthStore } from '../store/auth';

/** Matches the weight of an SF Symbols-style monochrome icon: an outline,
 * not a filled glyph, colored via currentColor so it inherits the field's
 * text color instead of the accent (this is a utility, not an action). */
function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      {!open && (
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function AuthForm() {
  const setSession = useAuthStore((s) => s.setSession);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatarSeed, setAvatarSeed] = useState(() => randomSeed());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
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

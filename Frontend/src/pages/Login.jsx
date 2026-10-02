import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import VisionCivicLogo from '../components/VisionCivicLogo';
import { toast } from '../components/ui/sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      toast.success(`Welcome back, ${res?.user?.name || 'Operator'}!`);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid email or password. Please verify your credentials.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const res = await loginWithGoogle();
      toast.success(`Welcome, ${res?.user?.name || 'Operator'}!`);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Google sign-in failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[var(--bg-primary)]">
      <div className="glass-panel w-full max-w-md p-8 sm:p-10 relative z-10 border border-[var(--border-subtle)] shadow-2xl rounded-2xl">
        {/* Shield/Eye Civic Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex mb-3">
            <VisionCivicLogo size={56} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)]">Vision Civic</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Urban & Civic Incident Surveillance System
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 mb-5 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="btn-google mb-5 w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-semibold border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="text-sm text-[var(--text-main)]">
            {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
          </span>
        </button>

        <div className="flex items-center my-5 text-xs text-[var(--text-dim)] uppercase tracking-wider">
          <div className="flex-1 h-px bg-[var(--border-subtle)]" />
          <span className="px-3">or email</span>
          <div className="flex-1 h-px bg-[var(--border-subtle)]" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@visioncivic.org"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] text-sm focus:border-[var(--primary)] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] text-sm focus:border-[var(--primary)] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="btn-primary w-full justify-center mt-2 py-3 rounded-lg font-semibold text-sm flex items-center gap-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight size={17} />
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[var(--primary)] font-semibold hover:underline">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, Phone, AlertCircle, ArrowRight, Check, X } from 'lucide-react';
import VisionCivicLogo from '../components/VisionCivicLogo';
import { toast } from '../components/ui/sonner';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);

  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Strong password checks
  const passwordCriteria = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>\-_]/.test(password),
  };

  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      const msg = 'Passwords do not match.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!isPasswordValid) {
      const msg = 'Password does not meet all security requirements.';
      setError(msg);
      toast.warning(msg);
      return;
    }

    setLoading(true);
    try {
      await signup({
        name,
        email,
        mobile_number: mobileNumber,
        password,
      });
      toast.success('Account created successfully! Welcome to Vision Civic.');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create account. Please check your information.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Welcome to Vision Civic!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Google sign-up failed.';
      setError(msg);
      toast.error(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[var(--bg-primary)]">
      <div className="glass-panel w-full max-w-lg p-8 sm:p-10 relative z-10 border border-[var(--border-subtle)] shadow-2xl rounded-2xl">
        {/* Shield/Eye Civic Emblem */}
        <div className="text-center mb-8">
          <div className="inline-flex mb-3">
            <VisionCivicLogo size={52} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)]">Create Operator Account</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Civic Surveillance & Incident Intelligence Access
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
          onClick={handleGoogleSignUp}
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
            {googleLoading ? 'Connecting to Google...' : 'Sign up with Google'}
          </span>
        </button>

        <div className="flex items-center my-5 text-xs text-[var(--text-dim)] uppercase tracking-wider">
          <div className="flex-1 h-px bg-[var(--border-subtle)]" />
          <span className="px-3">or email</span>
          <div className="flex-1 h-px bg-[var(--border-subtle)]" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] text-sm focus:border-[var(--primary)] transition-colors"
              />
            </div>
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
              Mobile Number
            </label>
            <div className="relative">
              <Phone size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
              <input
                type="tel"
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="+1 555 123 4567"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] text-sm focus:border-[var(--primary)] transition-colors"
              />
            </div>
          </div>

          {/* Email */}
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

          {/* Password */}
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

            {/* Password Validation checklist */}
            {password.length > 0 && (
              <div className="mt-2.5 p-3 rounded-lg bg-[var(--bg-surface)] text-xs grid grid-cols-2 gap-1.5 border border-[var(--border-subtle)]">
                <span className={`flex items-center gap-1.5 ${passwordCriteria.length ? 'text-emerald-500' : 'text-[var(--text-dim)]'}`}>
                  {passwordCriteria.length ? <Check size={13} /> : <X size={13} />} 8+ Characters
                </span>
                <span className={`flex items-center gap-1.5 ${passwordCriteria.upper ? 'text-emerald-500' : 'text-[var(--text-dim)]'}`}>
                  {passwordCriteria.upper ? <Check size={13} /> : <X size={13} />} Uppercase (A-Z)
                </span>
                <span className={`flex items-center gap-1.5 ${passwordCriteria.lower ? 'text-emerald-500' : 'text-[var(--text-dim)]'}`}>
                  {passwordCriteria.lower ? <Check size={13} /> : <X size={13} />} Lowercase (a-z)
                </span>
                <span className={`flex items-center gap-1.5 ${passwordCriteria.number ? 'text-emerald-500' : 'text-[var(--text-dim)]'}`}>
                  {passwordCriteria.number ? <Check size={13} /> : <X size={13} />} Number (0-9)
                </span>
                <span className={`flex items-center gap-1.5 col-span-2 ${passwordCriteria.special ? 'text-emerald-500' : 'text-[var(--text-dim)]'}`}>
                  {passwordCriteria.special ? <Check size={13} /> : <X size={13} />} Special Symbol (!@#$%)
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] text-sm focus:border-[var(--primary)] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="btn-primary w-full justify-center mt-3 py-3 rounded-lg font-semibold text-sm flex items-center gap-2"
          >
            <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
            <ArrowRight size={17} />
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Already registered?{' '}
          <Link to="/login" className="text-[var(--primary)] font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

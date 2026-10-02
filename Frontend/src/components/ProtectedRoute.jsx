import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-muted)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse-dot pulse-cyan" style={{ width: 16, height: 16, marginBottom: '1rem' }} />
          <p style={{ fontSize: '0.95rem' }}>Verifying secure session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: '2rem'
      }}>
        <div className="glass-panel" style={{ maxWidth: 500, padding: '2.5rem', textAlign: 'center' }}>
          <ShieldAlert size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Administrator Access Required</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            This section is restricted to Vision Civic system administrators. Contact your operations lead if you require elevated privileges.
          </p>
          <a href="/dashboard" className="btn-primary" style={{ display: 'inline-block' }}>
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}

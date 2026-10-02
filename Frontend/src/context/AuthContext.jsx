import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { signInWithGoogle } from '../services/firebase';
import { toast } from '../components/ui/sonner';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Check auth session on application load
  const checkAuth = async () => {
    try {
      const res = await authApi.getMe();
      setUser(res.data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    // Listen for session expiration events
    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
      toast.warning('Session expired. Please sign in again.');
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    setUser(res.data.user);
    if (res.data.token) {
      setToken(res.data.token);
      localStorage.setItem('vc_ws_token', res.data.token);
    }
    return res.data;
  };

  const signup = async ({ name, email, mobile_number, password }) => {
    const res = await authApi.signup({ name, email, mobile_number, password });
    setUser(res.data.user);
    if (res.data.token) {
      setToken(res.data.token);
      localStorage.setItem('vc_ws_token', res.data.token);
    }
    return res.data;
  };

  const loginWithGoogle = async () => {
    // 1. Popup Google OAuth via Firebase
    const googleResult = await signInWithGoogle();
    // 2. Exchange Google ID token with Vision Civic backend for secure HTTP-only cookie session
    const res = await authApi.googleAuth({
      id_token: googleResult.idToken,
      email: googleResult.user.email,
      name: googleResult.user.name,
      photo_url: googleResult.user.photoURL,
    });
    setUser(res.data.user);
    if (res.data.token) {
      setToken(res.data.token);
      localStorage.setItem('vc_ws_token', res.data.token);
    }
    return res.data;
  };

  const updateProfile = async (profileData) => {
    const res = await authApi.updateProfile(profileData);
    setUser((prev) => ({ ...prev, ...res.data }));
    return res.data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Ignore
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('vc_ws_token');
      toast.info('You have been signed out.');
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin,
        token: token || localStorage.getItem('vc_ws_token'),
        login,
        signup,
        loginWithGoogle,
        updateProfile,
        logout,
        refreshUser: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

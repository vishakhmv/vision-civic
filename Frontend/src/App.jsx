import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Landing from './pages/Landing';
import LiveMonitoring from './pages/LiveMonitoring';
import UploadVideo from './pages/UploadVideo';
import PastEvents from './pages/PastEvents';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import UserManagement from './pages/UserManagement';

import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <AuthProvider>
          <BrowserRouter>
            <Toaster />
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Main App Layout (Public Home & Protected Inner Features) */}
              <Route path="/" element={<MainLayout />}>
                {/* Publicly Accessible Landing Page at http://localhost:5173/ */}
                <Route index element={<Landing />} />
                <Route path="landing" element={<Landing />} />
                <Route path="dashboard" element={<Navigate to="/" replace />} />

                {/* Protected Application Routes (Require Authentication) */}
                <Route
                  path="live-monitoring"
                  element={
                    <ProtectedRoute>
                      <LiveMonitoring />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="upload-video"
                  element={
                    <ProtectedRoute>
                      <UploadVideo />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="past-events"
                  element={
                    <ProtectedRoute>
                      <PastEvents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <ProtectedRoute>
                      <Analytics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Exclusive Route */}
                <Route
                  path="user-management"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

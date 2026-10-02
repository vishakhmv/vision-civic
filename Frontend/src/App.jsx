import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
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

            {/* Protected Application Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="live-monitoring" element={<LiveMonitoring />} />
              <Route path="upload-video" element={<UploadVideo />} />
              <Route path="past-events" element={<PastEvents />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="profile" element={<Profile />} />

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
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </ThemeProvider>
  );
}

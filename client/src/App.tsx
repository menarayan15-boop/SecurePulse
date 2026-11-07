import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Public Landing Page / Dashboard
import { PublicHomePage } from './pages/public/PublicHomePage';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { AccountRecoveryPage } from './pages/auth/AccountRecoveryPage';

// Authenticated Dashboard Pages
import { OverviewPage } from './pages/dashboard/OverviewPage';
import { LoginActivityPage } from './pages/dashboard/LoginActivityPage';
import { TrustedDevicesPage } from './pages/dashboard/TrustedDevicesPage';
import { ActiveSessionsPage } from './pages/dashboard/ActiveSessionsPage';
import { SecurityAlertsPage } from './pages/dashboard/SecurityAlertsPage';
import { SecuritySettingsPage } from './pages/dashboard/SecuritySettingsPage';
import { ProfilePage } from './pages/dashboard/ProfilePage';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* 1. Public Homepage - Default Starting Screen for All Visitors */}
            <Route path="/" element={<PublicHomePage />} />

            {/* 2. Public Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/recover-account" element={<AccountRecoveryPage />} />

            {/* 3. Protected Member Dashboard Routes (Guarded by DashboardLayout) */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<OverviewPage />} />
              <Route path="/activity" element={<LoginActivityPage />} />
              <Route path="/devices" element={<TrustedDevicesPage />} />
              <Route path="/sessions" element={<ActiveSessionsPage />} />
              <Route path="/alerts" element={<SecurityAlertsPage />} />
              <Route path="/security" element={<SecuritySettingsPage />} />
              <Route path="/settings" element={<Navigate to="/security" replace />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* 4. Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

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

// Authenticated Dashboard Pages (Route-level lazy loading for optimal load time)
const OverviewPage = React.lazy(() => import('./pages/dashboard/OverviewPage').then((m) => ({ default: m.OverviewPage })));
const AiRiskAnalysisPage = React.lazy(() => import('./pages/dashboard/AiRiskAnalysisPage').then((m) => ({ default: m.AiRiskAnalysisPage })));
const LoginActivityPage = React.lazy(() => import('./pages/dashboard/LoginActivityPage').then((m) => ({ default: m.LoginActivityPage })));
const ImpossibleTravelPage = React.lazy(() => import('./pages/dashboard/ImpossibleTravelPage').then((m) => ({ default: m.ImpossibleTravelPage })));
const SecurityAlertsPage = React.lazy(() => import('./pages/dashboard/SecurityAlertsPage').then((m) => ({ default: m.SecurityAlertsPage })));
const PasskeysPage = React.lazy(() => import('./pages/dashboard/PasskeysPage').then((m) => ({ default: m.PasskeysPage })));
const AccountProtectionPage = React.lazy(() => import('./pages/dashboard/AccountProtectionPage').then((m) => ({ default: m.AccountProtectionPage })));
const SecurityTimelinePage = React.lazy(() => import('./pages/dashboard/SecurityTimelinePage').then((m) => ({ default: m.SecurityTimelinePage })));
const EmergencyRecoveryPage = React.lazy(() => import('./pages/dashboard/EmergencyRecoveryPage').then((m) => ({ default: m.EmergencyRecoveryPage })));
const TrustedDevicesPage = React.lazy(() => import('./pages/dashboard/TrustedDevicesPage').then((m) => ({ default: m.TrustedDevicesPage })));
const ActiveSessionsPage = React.lazy(() => import('./pages/dashboard/ActiveSessionsPage').then((m) => ({ default: m.ActiveSessionsPage })));
const SecuritySettingsPage = React.lazy(() => import('./pages/dashboard/SecuritySettingsPage').then((m) => ({ default: m.SecuritySettingsPage })));
const ProfilePage = React.lazy(() => import('./pages/dashboard/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SecurityAssistantPage = React.lazy(() => import('./pages/dashboard/SecurityAssistantPage').then((m) => ({ default: m.SecurityAssistantPage })));
const PhishingDetectorPage = React.lazy(() => import('./pages/dashboard/PhishingDetectorPage').then((m) => ({ default: m.PhishingDetectorPage })));
const PasswordHealthPage = React.lazy(() => import('./pages/dashboard/PasswordHealthPage').then((m) => ({ default: m.PasswordHealthPage })));
const SecurityConfirmationPage = React.lazy(() => import('./pages/dashboard/SecurityConfirmationPage').then((m) => ({ default: m.SecurityConfirmationPage })));
const SmartTravelPage = React.lazy(() => import('./pages/dashboard/SmartTravelPage').then((m) => ({ default: m.SmartTravelPage })));
const LearningCenterPage = React.lazy(() => import('./pages/dashboard/LearningCenterPage').then((m) => ({ default: m.LearningCenterPage })));
const PrivacyControlPage = React.lazy(() => import('./pages/dashboard/PrivacyControlPage').then((m) => ({ default: m.PrivacyControlPage })));

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
              <Route path="/assistant" element={<SecurityAssistantPage />} />
              <Route path="/phishing" element={<PhishingDetectorPage />} />
              <Route path="/password-health" element={<PasswordHealthPage />} />
              <Route path="/confirmations" element={<SecurityConfirmationPage />} />
              <Route path="/travel" element={<SmartTravelPage />} />
              <Route path="/learning" element={<LearningCenterPage />} />
              <Route path="/privacy" element={<PrivacyControlPage />} />
              <Route path="/risk-analysis" element={<AiRiskAnalysisPage />} />
              <Route path="/activity" element={<LoginActivityPage />} />
              <Route path="/impossible-travel" element={<ImpossibleTravelPage />} />
              <Route path="/alerts" element={<SecurityAlertsPage />} />
              <Route path="/passkeys" element={<PasskeysPage />} />
              <Route path="/account-protection" element={<AccountProtectionPage />} />
              <Route path="/timeline" element={<SecurityTimelinePage />} />
              <Route path="/emergency-recovery" element={<EmergencyRecoveryPage />} />
              <Route path="/devices" element={<TrustedDevicesPage />} />
              <Route path="/sessions" element={<ActiveSessionsPage />} />
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

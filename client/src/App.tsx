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
import { AiRiskAnalysisPage } from './pages/dashboard/AiRiskAnalysisPage';
import { LoginActivityPage } from './pages/dashboard/LoginActivityPage';
import { ImpossibleTravelPage } from './pages/dashboard/ImpossibleTravelPage';
import { SecurityAlertsPage } from './pages/dashboard/SecurityAlertsPage';
import { PasskeysPage } from './pages/dashboard/PasskeysPage';
import { AccountProtectionPage } from './pages/dashboard/AccountProtectionPage';
import { SecurityTimelinePage } from './pages/dashboard/SecurityTimelinePage';
import { EmergencyRecoveryPage } from './pages/dashboard/EmergencyRecoveryPage';
import { TrustedDevicesPage } from './pages/dashboard/TrustedDevicesPage';
import { ActiveSessionsPage } from './pages/dashboard/ActiveSessionsPage';
import { SecuritySettingsPage } from './pages/dashboard/SecuritySettingsPage';
import { ProfilePage } from './pages/dashboard/ProfilePage';
import { SecurityAssistantPage } from './pages/dashboard/SecurityAssistantPage';
import { PhishingDetectorPage } from './pages/dashboard/PhishingDetectorPage';
import { PasswordHealthPage } from './pages/dashboard/PasswordHealthPage';
import { SecurityConfirmationPage } from './pages/dashboard/SecurityConfirmationPage';
import { SmartTravelPage } from './pages/dashboard/SmartTravelPage';
import { LearningCenterPage } from './pages/dashboard/LearningCenterPage';
import { PrivacyControlPage } from './pages/dashboard/PrivacyControlPage';

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

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Components
import Header from './components/Header';
import ProtectedRoutes from './components/ProtectedRoutes';

// Layout
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Registration from './pages/Registration';
import MFAsetupForm from './pages/MFAsetupForm';
import MFAverifyForm from './pages/MFAverifyForm';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

import AuthProvider from './utils/AuthContext';

/** Wrap content in sidebar + topbar layout */
const WithLayout = ({ children }) => (
  <ProtectedRoutes>
    <DashboardLayout>{children}</DashboardLayout>
  </ProtectedRoutes>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ─── Non-Protected (Auth) Routes ─── */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<><Header /><Registration /></>} />
          <Route path="/login" element={<><Header /><Login /></>} />
          <Route path="/setup-mfa" element={<><Header /><MFAsetupForm /></>} />
          <Route path="/verify-mfa" element={<><Header /><MFAverifyForm /></>} />

          {/* ─── Protected Routes (wrapped in DashboardLayout) ─── */}
          <Route path="/home" element={<WithLayout><Home /></WithLayout>} />
          <Route path="/settings" element={<WithLayout><Settings /></WithLayout>} />
          <Route path="/profile/:userId" element={<WithLayout><Profile /></WithLayout>} />

          {/* ─── Redirect old routes to Home ─── */}
          <Route path="/extract" element={<Navigate to="/home" replace />} />
          <Route path="/extraction-hub" element={<Navigate to="/home" replace />} />
          <Route path="/report-sections" element={<Navigate to="/home" replace />} />
          <Route path="/report-sections/:sectionKey" element={<Navigate to="/home" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

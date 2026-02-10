import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Components
import Header from './components/Header';
import ProtectedRoutes from './components/ProtectedRoutes';

// Layout
import DashboardLayout from './layouts/DashboardLayout';

// Existing pages
import Dashboard from './pages/Dashboard';
import PDFDetail from './pages/PDFDetail';
import CompanyDetails from './pages/CompanyDetails';
import OtherExtraction from './pages/OtherExtraction';
import ShareholderPage from './pages/ShareholderPage';
import InvestorRelationsPage from './pages/InvestorRelationsPage';
import SubsidiaryPage from './pages/SubsidiaryPage';
import Home from './pages/Home';
import Login from './pages/Login';
import Registration from './pages/Registration';
import MFAsetupForm from './pages/MFAsetupForm';
import MFAverifyForm from './pages/MFAverifyForm';
import Profile from './pages/Profile';
import DataExplorer from './pages/DataExplorer';
import ImageExtractor from './pages/ImageExtractor';

// New pages
import ExtractionHub from './pages/ExtractionHub';
import ReportSectionsIndex from './pages/ReportSectionsIndex';
import ReportSectionPage from './pages/ReportSectionPage';
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
          <Route path="/extraction-hub" element={<WithLayout><ExtractionHub /></WithLayout>} />
          <Route path="/report-sections" element={<WithLayout><ReportSectionsIndex /></WithLayout>} />
          <Route path="/report-sections/:sectionKey" element={<WithLayout><ReportSectionPage /></WithLayout>} />
          <Route path="/settings" element={<WithLayout><Settings /></WithLayout>} />

          {/* Existing module routes — unchanged behavior */}
          <Route path="/dashboard" element={<WithLayout><Dashboard /></WithLayout>} />
          <Route path="/data-explorer" element={<WithLayout><DataExplorer /></WithLayout>} />
          <Route path="/image-extractor" element={<WithLayout><ImageExtractor /></WithLayout>} />

          <Route path="/pdf/:pdfId/statements" element={<WithLayout><PDFDetail /></WithLayout>} />
          <Route path="/pdf/:pdfId/company" element={<WithLayout><CompanyDetails /></WithLayout>} />
          <Route path="/pdf/:pdfId/other" element={<WithLayout><OtherExtraction /></WithLayout>} />
          <Route path="/pdf/:pdfId/shareholders" element={<WithLayout><ShareholderPage /></WithLayout>} />
          <Route path="/pdf/:pdfId/investor-relations" element={<WithLayout><InvestorRelationsPage /></WithLayout>} />
          <Route path="/pdf/:pdfId/subsidiary" element={<WithLayout><SubsidiaryPage /></WithLayout>} />
          <Route path="/pdf/:pdfId" element={<WithLayout><PDFDetail /></WithLayout>} />

          <Route path="/profile/:userId" element={<WithLayout><Profile /></WithLayout>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

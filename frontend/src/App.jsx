import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';


//componenets
import Header from './components/Header';
import ProtectedRoutes from './components/ProtectedRoutes';

//pages
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

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Header />
        <Routes>
          {/* Non-Protected Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<Registration />} />
          <Route path="/login" element={<Login />} />
          <Route path="/setup-mfa" element={<MFAsetupForm />} />
          <Route path="/verify-mfa" element={<MFAverifyForm />} />


          {/* Protected Routes */}
          <Route path="/home" element={
            <ProtectedRoutes>
              <Home />
            </ProtectedRoutes>} />

          <Route path="/dashboard" element={
            <ProtectedRoutes>
              <Dashboard />
            </ProtectedRoutes>} />

          <Route path="/pdf/:pdfId/statements" element={
            <ProtectedRoutes>
              <PDFDetail />
            </ProtectedRoutes>} />

          <Route path="/pdf/:pdfId/company" element={
            <ProtectedRoutes>
              <CompanyDetails />
            </ProtectedRoutes>} />

          <Route path="/pdf/:pdfId/other" element={
            <ProtectedRoutes>
              <OtherExtraction />
            </ProtectedRoutes>} />

          <Route path="/pdf/:pdfId/shareholders" element={
            <ProtectedRoutes>
              <ShareholderPage />
            </ProtectedRoutes>} />

          <Route path="/pdf/:pdfId/investor-relations" element={
            <ProtectedRoutes>
              <InvestorRelationsPage />
            </ProtectedRoutes>} />

          <Route path="/pdf/:pdfId/subsidiary" element={
            <ProtectedRoutes>
              <SubsidiaryPage />
            </ProtectedRoutes>} />

          <Route path="/pdf/:pdfId" element={
            <ProtectedRoutes>
              <PDFDetail />
            </ProtectedRoutes>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

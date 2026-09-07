import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CustomerLoginPage from './pages/CustomerLoginPage';
import AnalystLoginPage from './pages/AnalystLoginPage';
import CustomerDashboard from './pages/CustomerDashboard';
import AnalystDashboard from './pages/AnalystDashboard';
import TransactionDetailsPage from './pages/TransactionDetailsPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login/customer" element={<CustomerLoginPage />} />
        <Route path="/login/analyst" element={<AnalystLoginPage />} />

        {/* Protected Customer Routes */}
        <Route
          path="/customer"
          element={
            <ProtectedRoute allowedRole="customer">
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected Analyst Routes */}
        <Route
          path="/analyst"
          element={
            <ProtectedRoute allowedRole="analyst">
              <AnalystDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analyst/transactions/:transactionId"
          element={
            <ProtectedRoute allowedRole="analyst">
              <TransactionDetailsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

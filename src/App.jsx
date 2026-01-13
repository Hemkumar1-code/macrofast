import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DataEntry from './pages/DataEntry';
import AdminDashboard from './pages/AdminDashboard';
import './index.css';

const ProtectedRoute = ({ children, allowedRole }) => {
  const userRole = localStorage.getItem('role');

  if (!userRole) {
    return <Navigate to="/" replace />;
  }

  if (allowedRole && userRole !== allowedRole && userRole !== 'admin') {
    // If user tries to access admin, redirect to entry
    // Admin can access everything usually, but let's be strict if needed
    if (allowedRole === 'admin') return <Navigate to="/entry" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/entry"
          element={
            <ProtectedRoute allowedRole="user">
              <DataEntry />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

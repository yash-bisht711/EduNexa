import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Home from './pages/Home.jsx';
import AuthPage from './pages/AuthPage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import { Layout } from './components/Layout.jsx';

export default function App() {
  const user = useSelector((s) => s.auth?.user);

  return (
    <Routes>
      {/* Public Home & Landing Pages */}
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />

      {/* Authentication */}
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/dashboard" replace /> : <AuthPage register />}
      />

      {/* Dedicated Hidden Admin Login Portal (Manual URL Entry Only) */}
      <Route path="/admin-portal-login" element={<AdminLoginPage />} />
      <Route path="/admin-login" element={<AdminLoginPage />} />

      {/* LMS Dashboard & Learning Platform */}
      <Route
        path="/*"
        element={user ? <Layout /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}

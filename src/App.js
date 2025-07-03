// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import UploadAndSign from './pages/UploadAndSign';
import ViewDocuments from './pages/ViewDocuments';

import Navbar from './Components/Navbar';
import ProtectedRoute from './Components/ProtectedRoute';

import { AuthProvider } from './Context/AuthContext';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
        <Navbar />

        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <UploadAndSign />
              </ProtectedRoute>
            }
          />
          <Route
            path="/view"
            element={
              <ProtectedRoute>
                <ViewDocuments />
              </ProtectedRoute>
            }
          />

          {/* Optional alias for /documents if needed */}
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <ViewDocuments />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

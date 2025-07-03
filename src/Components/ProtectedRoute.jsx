import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../Context/AuthContext';

function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);

  return user ? children : <Navigate to="/login" />;
}

export default ProtectedRoute;

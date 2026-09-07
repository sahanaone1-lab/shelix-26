import React from 'react';
import { Navigate } from 'react-router-dom';
import { getSession } from '../utils/session';

/**
 * ProtectedRoute Guard
 * Ensures only authenticated users with the specified role can access a route.
 * Prevents wrong-role dashboard access by routing users to their legitimate portal.
 */
export default function ProtectedRoute({ allowedRole, children }) {
  const session = getSession();

  // If not logged in at all, direct to the appropriate login page
  if (!session || !session.user) {
    return <Navigate to={allowedRole === 'customer' ? '/login/customer' : '/login/analyst'} replace />;
  }

  // If logged in with wrong role, prevent access and redirect to user's dashboard
  if (session.role !== allowedRole) {
    return <Navigate to={session.role === 'customer' ? '/customer' : '/analyst'} replace />;
  }

  return children;
}

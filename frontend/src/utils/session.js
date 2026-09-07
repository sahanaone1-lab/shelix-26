/**
 * Session and Role Management for FraudLens Frontend
 * Manages simple authentication state and role boundaries.
 */

const SESSION_KEY = 'fraudlens_session';

export function setSession(user, role) {
  try {
    const sessionData = {
      user,
      role,
      authenticatedAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch (e) {
    console.error('Failed to write session:', e);
  }
}

export function getSession() {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to read session:', e);
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.error('Failed to clear session:', e);
  }
}

export function isAuthenticated() {
  const session = getSession();
  return !!session && !!session.user;
}

export function getUserRole() {
  const session = getSession();
  return session ? session.role : null;
}

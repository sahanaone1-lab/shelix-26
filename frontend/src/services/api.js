/**
 * FraudLens API Service Layer
 * Centralized HTTP client for backend communication with robust host fallback
 */

const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
// Strip trailing slashes to avoid double-slash path issues
const API_BASE_URL = rawUrl.replace(/\/+$/, '');

/**
 * Universal fetch wrapper that handles macOS localhost/127.0.0.1 IPv6/IPv4 resolution differences
 * and fallback to local Vite proxy
 */
async function requestApi(endpoint, options = {}) {
  const defaultHeaders = {
    'Accept': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  // List of candidate base URLs to guarantee connection regardless of macOS localhost resolution
  const candidateBases = [
    API_BASE_URL,
    API_BASE_URL.includes('localhost')
      ? API_BASE_URL.replace('localhost', '127.0.0.1')
      : API_BASE_URL.replace('127.0.0.1', 'localhost'),
    '', // Relative URL (routes through Vite dev proxy /api)
  ];

  // Remove duplicates
  const uniqueBases = [...new Set(candidateBases)];

  let lastError = null;
  for (const base of uniqueBases) {
    try {
      const url = `${base}${endpoint}`;
      const response = await fetch(url, config);
      return response;
    } catch (err) {
      lastError = err;
      // Continue to next candidate if network failed
    }
  }

  throw lastError || new Error('Failed to connect to API server');
}

/**
 * Checks backend health status
 * GET /api/health
 */
export async function getHealthStatus() {
  try {
    const response = await requestApi('/api/health', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to connect to backend service',
    };
  }
}

/**
 * Authenticates customer using backend API
 * POST /api/auth/customer/login
 * @param {string} identifier - Customer Email or User ID
 * @param {string} password - Customer Password
 */
export async function loginCustomer(identifier, password) {
  try {
    const response = await requestApi('/api/auth/customer/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || 'Customer authentication failed',
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unable to reach backend authentication service. Ensure backend is running.',
    };
  }
}

/**
 * Authenticates fraud analyst using backend API
 * POST /api/auth/analyst/login
 * @param {string} employeeId - Analyst Employee ID or Email
 * @param {string} password - Analyst Password
 */
export async function loginAnalyst(employeeId, password) {
  try {
    const response = await requestApi('/api/auth/analyst/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ employee_id: employeeId, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || 'Analyst authentication failed',
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unable to reach backend authentication service. Ensure backend is running.',
    };
  }
}

/**
 * Fetch all screened transactions from Supabase
 * GET /api/transactions
 */
export async function getTransactions(riskLevel = null) {
  try {
    const query = riskLevel ? `?risk_level=${encodeURIComponent(riskLevel)}` : '';
    const response = await requestApi(`/api/transactions${query}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to load transactions',
    };
  }
}

/**
 * Fetch a single transaction by ID
 * GET /api/transactions/{id}
 */
export async function getTransactionById(id) {
  try {
    const response = await requestApi(`/api/transactions/${id}`, {
      method: 'GET',
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
  } catch (err) {
    // Continue to fallback
  }

  // Fallback: load all transactions and find matching record
  try {
    const listRes = await getTransactions();
    if (listRes.success && listRes.data) {
      const match = listRes.data.find((t) => t.id === id);
      if (match) {
        return { success: true, data: match };
      }
    }
    return { success: false, error: 'Transaction not found' };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to load transaction details',
    };
  }
}

/**
 * Fetch high-priority suspicious attempts with SHAP explanations
 * GET /api/transactions/suspicious
 */
export async function getSuspiciousAttempts() {
  try {
    const response = await requestApi('/api/transactions/suspicious', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to load suspicious attempts',
    };
  }
}

/**
 * Trigger seeding and screening of sample_100_transactions.csv
 * POST /api/transactions/seed
 */
export async function seedTransactions() {
  try {
    const response = await requestApi('/api/transactions/seed', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to seed transactions',
    };
  }
}

export default {
  getHealthStatus,
  loginCustomer,
  loginAnalyst,
  getTransactions,
  getSuspiciousAttempts,
  seedTransactions,
};

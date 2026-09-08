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

/**
 * Verify transaction integrity against the blockchain ledger
 * GET /api/blockchain/verify/{id}
 */
export async function verifyBlockchainDecision(transactionId) {
  try {
    const response = await requestApi(`/api/blockchain/verify/${transactionId}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Blockchain verification failed',
    };
  }
}

/**
 * Fetch recorded blockchain audit metadata for a transaction
 * GET /api/blockchain/record/{id}
 */
export async function getBlockchainRecord(transactionId) {
  try {
    const response = await requestApi(`/api/blockchain/record/${transactionId}`);
    if (!response.ok) {
      return { success: false, status: response.status };
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to fetch blockchain record',
    };
  }
}

/**
 * Fetch high-level Mule Account Detection KPI summary
 * GET /api/mule/summary
 */
export async function getMuleSummary() {
  try {
    const response = await requestApi('/api/mule/summary');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to fetch mule summary',
    };
  }
}

/**
 * Fetch node-link graph topology for Entity Graph Explorer
 * GET /api/mule/graph?filter={filter}
 */
export async function getMuleGraph(filter = 'ALL') {
  try {
    const response = await requestApi(`/api/mule/graph?filter=${encodeURIComponent(filter)}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to fetch mule graph',
    };
  }
}

/**
 * Fetch list of detected suspected mule accounts
 * GET /api/mule/accounts
 */
export async function getMuleAccounts() {
  try {
    const response = await requestApi('/api/mule/accounts');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to fetch suspected mule accounts',
    };
  }
}

/**
 * Fetch detailed entity metadata, connections, and reasons
 * GET /api/mule/entity/{entityId}
 */
export async function getMuleEntityDetails(entityId) {
  try {
    const response = await requestApi(`/api/mule/entity/${encodeURIComponent(entityId)}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to fetch entity details',
    };
  }
}

/**
 * Fetch Customer Dashboard summary metrics, category expenditure breakdown, and transaction history
 * GET /api/customer/dashboard-summary?customer_id={customerId}
 */
export async function getCustomerDashboardSummary(customerId) {
  try {
    const query = customerId ? `?customer_id=${encodeURIComponent(customerId)}` : '';
    const response = await requestApi(`/api/customer/dashboard-summary${query}`, {
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
      error: error.message || 'Failed to load customer dashboard summary',
    };
  }
}

/**
 * Initiate customer demo transfer
 * POST /api/customer/initiate-transaction
 */
export async function initiateCustomerTransaction(payload) {
  try {
    const response = await requestApi('/api/customer/initiate-transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.detail || 'Transaction failed',
      };
    }
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to initiate customer transaction',
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
  verifyBlockchainDecision,
  getBlockchainRecord,
  getMuleSummary,
  getMuleGraph,
  getMuleAccounts,
  getMuleEntityDetails,
  getCustomerDashboardSummary,
  initiateCustomerTransaction,
};



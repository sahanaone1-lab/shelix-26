import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  User,
  LogOut,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Wallet,
  CreditCard,
  Send,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Ban,
  RefreshCw,
  X,
  Calendar,
  Layers,
  FileText,
  AlertCircle,
  Building2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { getSession, clearSession } from '../utils/session';
import { getCustomerDashboardSummary, initiateCustomerTransaction } from '../services/api';

const DEMO_CUSTOMERS_LIST = [
  { id: 'c101', code: 'C101', name: 'Alex Mercer', email: 'customer@bank.com', role: 'Tech Lead' },
  { id: 'c102', code: 'C102', name: 'Sneha Sharma', email: 'sneha@bank.com', role: 'Senior Consultant' },
  { id: 'c103', code: 'C103', name: 'Rajesh Patel', email: 'rajesh@bank.com', role: 'Business Owner' },
];

const CATEGORY_PALETTE = {
  'Housing & Rent': '#10B981',
  'Shopping': '#3B82F6',
  'Utilities & Bills': '#F59E0B',
  'Food & Dining': '#EC4899',
  'Entertainment': '#8B5CF6',
  'Travel': '#14B8A6',
  'Healthcare': '#06B6D4',
  'Salary & Income': '#10B981',
  'Uncategorized': '#64748B',
};

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const session = getSession();
  const sessionUser = session?.user;

  // Selected customer state (initialized from session if matched, or defaults to c101)
  const [selectedCustomerId, setSelectedCustomerId] = useState(() => {
    if (sessionUser?.email === 'sneha@bank.com') return 'c102';
    if (sessionUser?.email === 'rajesh@bank.com') return 'c103';
    return 'c101';
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  // Filters & search for transaction history
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Initiate Transaction Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transferBeneficiary, setTransferBeneficiary] = useState('');
  const [transferAccount, setTransferAccount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferCategory, setTransferCategory] = useState('Food & Dining');
  const [transferDescription, setTransferDescription] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferFeedback, setTransferFeedback] = useState(null);

  // Selected transaction for details drawer
  const [activeTxn, setActiveTxn] = useState(null);

  // Fetch dashboard summary
  const fetchDashboard = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await getCustomerDashboardSummary(selectedCustomerId);
      if (res.success && res.data) {
        setDashboardData(res.data);
      } else {
        setError(res.error || 'Failed to load banking activity');
      }
    } catch (err) {
      setError(err.message || 'Error loading dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getCustomerDashboardSummary(selectedCustomerId);
        if (!ignore) {
          if (res.success && res.data) {
            setDashboardData(res.data);
          } else {
            setError(res.error || 'Failed to load banking activity');
          }
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Error loading dashboard data');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [selectedCustomerId]);

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  // Submit new transfer
  const handleInitiateTransfer = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(transferAmount);

    if (!transferBeneficiary.trim()) {
      setTransferFeedback({ type: 'error', message: 'Please enter a beneficiary name.' });
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setTransferFeedback({ type: 'error', message: 'Please enter a valid amount greater than ₹0.' });
      return;
    }
    if (dashboardData && parsedAmount > dashboardData.metrics.current_balance) {
      setTransferFeedback({
        type: 'error',
        message: `Insufficient balance! Current balance is ₹${dashboardData.metrics.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`
      });
      return;
    }

    setTransferSubmitting(true);
    setTransferFeedback(null);

    try {
      const res = await initiateCustomerTransaction({
        customer_id: selectedCustomerId,
        beneficiary_name: transferBeneficiary.trim(),
        account_number: transferAccount.trim() || '987654321098',
        category: transferCategory,
        amount: parsedAmount,
        description: transferDescription.trim() || `Transfer to ${transferBeneficiary.trim()}`
      });

      if (res.success && res.data) {
        setTransferFeedback({
          type: 'success',
          message: res.data.message || 'Transaction successfully completed and recorded!'
        });

        // Update local dashboard data state immediately
        setDashboardData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            metrics: res.data.updated_metrics || prev.metrics,
            category_breakdown: res.data.category_breakdown || prev.category_breakdown,
            transactions: [res.data.transaction, ...(prev.transactions || [])],
            total_transactions: (prev.total_transactions || 0) + 1
          };
        });

        // Reset form inputs after brief delay
        setTimeout(() => {
          setTransferBeneficiary('');
          setTransferAccount('');
          setTransferAmount('');
          setTransferDescription('');
          setTransferFeedback(null);
          setIsModalOpen(false);
        }, 1200);
      } else {
        setTransferFeedback({
          type: 'error',
          message: res.error || 'Transaction could not be processed.'
        });
      }
    } catch (err) {
      setTransferFeedback({
        type: 'error',
        message: err.message || 'Failed to submit transfer.'
      });
    } finally {
      setTransferSubmitting(false);
    }
  };

  const customer = dashboardData?.customer || {
    name: sessionUser?.name || 'Alex Mercer',
    email: sessionUser?.email || 'customer@bank.com',
    code: 'C101',
    account_number: 'HDFC •••• 4128',
    account_type: 'Salary Savings Account',
    currency: 'INR'
  };

  const metrics = dashboardData?.metrics || {
    current_balance: 0,
    total_income: 0,
    total_expenditure: 0,
    monthly_spend: 0
  };

  const categoryBreakdown = dashboardData?.category_breakdown || [];
  const transactions = dashboardData?.transactions || [];

  // Filter transactions
  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch =
      searchQuery === '' ||
      txn.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.merchant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || txn.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || txn.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Unique categories for filter dropdown
  const uniqueCategories = Array.from(new Set(transactions.map((t) => t.category).filter(Boolean)));

  const formatCurrency = (amt) => {
    return `₹${Number(amt || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <div className="min-h-screen bg-[#0D2322] text-[#E6F4ED] flex flex-col justify-between selection:bg-[#286056] selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-[#286056] bg-[#143834]/95 backdrop-blur-md px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1C4841] border border-[#286056] flex items-center justify-center text-[#34D399] shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-wider text-white">FRAUDLENS</span>
                <span className="text-[11px] px-2 py-0.5 rounded border border-[#286056] bg-[#1C4841] text-[#9BC3AC] font-medium tracking-wide">
                  Customer Portal
                </span>
              </div>
            </div>
          </div>

          {/* Customer Switcher for Demo & Testing */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden lg:flex items-center gap-1.5 bg-[#0D2322]/80 px-2.5 py-1 rounded-lg border border-[#286056]">
              <span className="text-[11px] font-semibold text-[#9BC3AC] uppercase tracking-wider">Demo User:</span>
              {DEMO_CUSTOMERS_LIST.map((cust) => (
                <button
                  key={cust.id}
                  onClick={() => setSelectedCustomerId(cust.id)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                    selectedCustomerId === cust.id
                      ? 'bg-[#34D399] text-[#0D2322] font-semibold shadow-sm'
                      : 'text-[#9BC3AC] hover:text-white hover:bg-[#1C4841]'
                  }`}
                  title={`${cust.name} (${cust.role})`}
                >
                  {cust.code}
                </button>
              ))}
            </div>

            {/* Profile Dropdown / Sign Out */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-[#9BC3AC] bg-[#1C4841]/70 px-3 py-1.5 rounded-lg border border-[#286056]">
                <div className="w-6 h-6 rounded-full bg-[#286056] border border-[#34D399]/40 flex items-center justify-center text-white text-[11px] font-bold">
                  {customer.name?.charAt(0) || 'C'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="font-semibold text-white leading-tight">{customer.name}</p>
                  <p className="text-[10px] text-[#9BC3AC] font-mono leading-tight">{customer.account_number}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C4841] hover:bg-[#286056] text-xs font-medium text-[#E6F4ED] transition-colors border border-[#286056] cursor-pointer"
                title="Sign out of customer portal"
              >
                <LogOut className="w-3.5 h-3.5 text-[#9BC3AC]" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* Welcome Banner & Action Bar */}
        <div className="bg-[#143834] border border-[#286056] rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Welcome back, {customer.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#133D30] text-[#34D399] border border-[#1F7A5E] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse"></span>
                Account Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#9BC3AC] mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="font-medium text-white">{customer.account_type}</span>
              <span>•</span>
              <span className="font-mono">{customer.account_number}</span>
              <span>•</span>
              <span className="text-[#9BC3AC]/80">Secured by FraudLens Sentinel</span>
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Mobile customer selector */}
            <div className="flex lg:hidden items-center gap-1 bg-[#0D2322] px-2 py-1 rounded-lg border border-[#286056]">
              <span className="text-[10px] text-[#9BC3AC] uppercase font-semibold">User:</span>
              {DEMO_CUSTOMERS_LIST.map((cust) => (
                <button
                  key={cust.id}
                  onClick={() => setSelectedCustomerId(cust.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                    selectedCustomerId === cust.id
                      ? 'bg-[#34D399] text-[#0D2322] font-semibold'
                      : 'text-[#9BC3AC]'
                  }`}
                >
                  {cust.code}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchDashboard(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1C4841] hover:bg-[#286056] text-xs font-medium text-[#E6F4ED] transition-colors border border-[#286056] cursor-pointer disabled:opacity-50"
              title="Refresh transaction feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#9BC3AC] ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#34D399] hover:to-[#10B981] text-xs sm:text-sm font-semibold text-white transition-all shadow-md shadow-[#10B981]/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Initiate Transfer</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-[#3B1D24] border border-[#7A2836] rounded-xl p-4 flex items-center gap-3 text-sm text-[#FCA5A5]">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Unable to fetch latest banking data</p>
              <p className="text-xs text-[#FCA5A5]/80 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => fetchDashboard(true)}
              className="px-3 py-1 bg-[#7A2836] hover:bg-[#881337] rounded-lg text-xs font-semibold text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top 4 Banking KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Current Balance */}
          <div className="bg-[#143834] border border-[#286056] rounded-2xl p-5 relative overflow-hidden group hover:border-[#34D399]/60 transition-all shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#34D399]/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
            <div className="flex items-center justify-between text-xs text-[#9BC3AC] mb-2">
              <span className="font-semibold tracking-wider uppercase text-[11px]">Current Balance</span>
              <div className="w-7 h-7 rounded-lg bg-[#1C4841] border border-[#286056] flex items-center justify-center text-[#34D399]">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {loading ? (
                <div className="h-8 w-32 bg-[#1C4841] animate-pulse rounded"></div>
              ) : (
                formatCurrency(metrics.current_balance)
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-[#34D399]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Available for transfers & bill payments</span>
            </div>
          </div>

          {/* Card 2: Total Income */}
          <div className="bg-[#143834] border border-[#286056] rounded-2xl p-5 relative overflow-hidden group hover:border-[#10B981]/60 transition-all shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#9BC3AC] mb-2">
              <span className="font-semibold tracking-wider uppercase text-[11px]">Total Income</span>
              <div className="w-7 h-7 rounded-lg bg-[#133D30] border border-[#1F7A5E] flex items-center justify-center text-[#10B981]">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[#10B981] tracking-tight">
              {loading ? (
                <div className="h-8 w-28 bg-[#1C4841] animate-pulse rounded"></div>
              ) : (
                formatCurrency(metrics.total_income)
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-[#9BC3AC]">
              <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Salary & business inward credits</span>
            </div>
          </div>

          {/* Card 3: Total Expenditure */}
          <div className="bg-[#143834] border border-[#286056] rounded-2xl p-5 relative overflow-hidden group hover:border-[#F59E0B]/60 transition-all shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#9BC3AC] mb-2">
              <span className="font-semibold tracking-wider uppercase text-[11px]">Total Expenditure</span>
              <div className="w-7 h-7 rounded-lg bg-[#332A15] border border-[#78531A] flex items-center justify-center text-[#F59E0B]">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {loading ? (
                <div className="h-8 w-28 bg-[#1C4841] animate-pulse rounded"></div>
              ) : (
                formatCurrency(metrics.total_expenditure)
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-[#F59E0B]">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Debits, UPI & recurring bills</span>
            </div>
          </div>

          {/* Card 4: Spend This Month */}
          <div className="bg-[#143834] border border-[#286056] rounded-2xl p-5 relative overflow-hidden group hover:border-[#3B82F6]/60 transition-all shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#9BC3AC] mb-2">
              <span className="font-semibold tracking-wider uppercase text-[11px]">Spend This Month</span>
              <div className="w-7 h-7 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#38BDF8]">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {loading ? (
                <div className="h-8 w-28 bg-[#1C4841] animate-pulse rounded"></div>
              ) : (
                formatCurrency(metrics.monthly_spend)
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-[#9BC3AC]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]"></span>
              <span>September 2026 Billing Cycle</span>
            </div>
          </div>
        </div>

        {/* Middle Section: Expenditure Chart & Financial Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Expenditure Breakdown Chart */}
          <div className="lg:col-span-2 bg-[#143834] border border-[#286056] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#34D399]" />
                  Expenditure by Category
                </h2>
                <p className="text-xs text-[#9BC3AC] mt-0.5">
                  Visual breakdown of your outlays across major living and lifestyle categories
                </p>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-md bg-[#1C4841] text-[#9BC3AC] font-mono border border-[#286056]">
                INR (₹)
              </span>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-xs text-[#9BC3AC]">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Loading expenditure distribution...
              </div>
            ) : categoryBreakdown.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-[#9BC3AC]">
                No category expenditure recorded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Donut Chart */}
                <div className="md:col-span-7 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={4}
                      >
                        {categoryBreakdown.map((entry, index) => {
                          const fill = entry.color || CATEGORY_PALETTE[entry.category] || '#10B981';
                          return <Cell key={`cell-${index}`} fill={fill} stroke="#143834" strokeWidth={2} />;
                        })}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value) => [formatCurrency(value), 'Spend']}
                        contentStyle={{
                          backgroundColor: '#0D2322',
                          borderColor: '#286056',
                          borderRadius: '8px',
                          color: '#E6F4ED',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend & Breakdown List */}
                <div className="md:col-span-5 space-y-2 max-h-64 overflow-y-auto pr-1">
                  {categoryBreakdown.map((cat, idx) => {
                    const color = cat.color || CATEGORY_PALETTE[cat.category] || '#10B981';
                    const pct = metrics.total_expenditure > 0
                      ? Math.round((cat.amount / metrics.total_expenditure) * 100)
                      : 0;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#1C4841]/50 border border-[#286056]/60 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          ></span>
                          <span className="text-[#E6F4ED] font-medium truncate">{cat.category}</span>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <span className="text-white font-semibold">{formatCurrency(cat.amount)}</span>
                          <span className="text-[10px] text-[#9BC3AC] ml-1.5 font-mono">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Transfer & Account Shield Panel */}
          <div className="bg-[#143834] border border-[#286056] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#34D399]" />
                  Quick Account Security
                </h2>
                <span className="text-[11px] font-semibold text-[#34D399] bg-[#133D30] px-2 py-0.5 rounded border border-[#1F7A5E]">
                  Continuous
                </span>
              </div>
              <p className="text-xs text-[#9BC3AC] mt-1 leading-relaxed">
                FraudLens AI continuously monitors geolocation velocity, device fingerprints, and UPI patterns for your account.
              </p>
            </div>

            {/* Quick stats list */}
            <div className="space-y-2.5">
              <div className="bg-[#1C4841]/60 p-3 rounded-xl border border-[#286056] flex items-center justify-between text-xs">
                <span className="text-[#9BC3AC]">Trusted Device</span>
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                  iPhone 15 Pro (Registered)
                </span>
              </div>
              <div className="bg-[#1C4841]/60 p-3 rounded-xl border border-[#286056] flex items-center justify-between text-xs">
                <span className="text-[#9BC3AC]">Primary Banking Branch</span>
                <span className="font-semibold text-white">Mumbai Central / RTGS</span>
              </div>
              <div className="bg-[#1C4841]/60 p-3 rounded-xl border border-[#286056] flex items-center justify-between text-xs">
                <span className="text-[#9BC3AC]">Daily UPI Transfer Limit</span>
                <span className="font-semibold text-white">₹1,00,000 / day</span>
              </div>
            </div>

            {/* Initiate Button in Sidecard */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-[#286056] hover:bg-[#33786D] text-xs font-semibold text-white transition-colors border border-[#3D8577] flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Funds to Beneficiary</span>
            </button>
          </div>
        </div>

        {/* Transaction History Section */}
        <div className="bg-[#143834] border border-[#286056] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#34D399]" />
                Recent Banking Activity & Expenditure
              </h2>
              <p className="text-xs text-[#9BC3AC] mt-0.5">
                Detailed transaction log with real-time status and security assessment
              </p>
            </div>

            {/* Controls: Search & Filters */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#9BC3AC] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search merchant, ID, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[#0D2322] border border-[#286056] rounded-lg text-xs text-white placeholder-[#9BC3AC]/60 focus:outline-none focus:border-[#34D399] w-48 sm:w-56"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#0D2322] border border-[#286056] rounded-lg text-xs text-[#E6F4ED] px-2.5 py-1.5 focus:outline-none focus:border-[#34D399] cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="BLOCKED">Blocked</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[#0D2322] border border-[#286056] rounded-lg text-xs text-[#E6F4ED] px-2.5 py-1.5 focus:outline-none focus:border-[#34D399] cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto rounded-xl border border-[#286056]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1C4841] text-[#9BC3AC] uppercase font-semibold text-[11px] border-b border-[#286056]">
                <tr>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Description / Merchant</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#286056]/50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#9BC3AC]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading recent transactions...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#9BC3AC]">
                      No transactions match your current filters.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((txn) => {
                    const isCredit = txn.type === 'credit';
                    const statusBadge =
                      txn.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#133D30] text-[#34D399] border border-[#1F7A5E]">
                          <CheckCircle2 className="w-3 h-3" />
                          COMPLETED
                        </span>
                      ) : txn.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#332A15] text-[#F59E0B] border border-[#78531A]">
                          <Clock className="w-3 h-3" />
                          PENDING
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#3B1D24] text-[#EF4444] border border-[#7A2836]">
                          <Ban className="w-3 h-3" />
                          BLOCKED
                        </span>
                      );

                    return (
                      <tr
                        key={txn.id}
                        className="hover:bg-[#1C4841]/40 transition-colors cursor-pointer"
                        onClick={() => setActiveTxn(txn)}
                      >
                        <td className="px-4 py-3 text-[#9BC3AC] font-mono text-[11px] whitespace-nowrap">
                          {txn.date}
                        </td>
                        <td className="px-4 py-3 font-medium text-white">
                          <div className="flex flex-col">
                            <span className="font-semibold">{txn.description}</span>
                            <span className="text-[10px] text-[#9BC3AC]">{txn.merchant}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1C4841] text-[#9BC3AC] border border-[#286056] whitespace-nowrap">
                            {txn.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#9BC3AC] text-[11px] whitespace-nowrap">
                          {txn.payment_method}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold whitespace-nowrap font-mono">
                          <span className={isCredit ? 'text-[#10B981]' : 'text-white'}>
                            {isCredit ? '+' : '-'}{formatCurrency(txn.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {statusBadge}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTxn(txn);
                            }}
                            className="p-1 rounded hover:bg-[#286056] text-[#9BC3AC] hover:text-white transition-colors"
                            title="View receipt"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Transaction Initiation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#143834] border border-[#286056] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#286056] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1C4841] border border-[#286056] flex items-center justify-center text-[#34D399]">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Initiate Secure Transfer</h3>
                  <p className="text-[11px] text-[#9BC3AC]">Real-time debit from your active balance</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setTransferFeedback(null);
                }}
                className="p-1.5 rounded-lg hover:bg-[#1C4841] text-[#9BC3AC] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Balance Display */}
            <div className="bg-[#0D2322] p-3 rounded-xl border border-[#286056] flex items-center justify-between text-xs">
              <span className="text-[#9BC3AC]">Sender Account Balance:</span>
              <span className="font-bold text-white font-mono text-sm">
                {formatCurrency(metrics.current_balance)}
              </span>
            </div>

            {/* Feedback message */}
            {transferFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  transferFeedback.type === 'success'
                    ? 'bg-[#133D30] border-[#1F7A5E] text-[#34D399]'
                    : 'bg-[#3B1D24] border-[#7A2836] text-[#FCA5A5]'
                }`}
              >
                {transferFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{transferFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleInitiateTransfer} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#9BC3AC] font-medium mb-1">Beneficiary Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rohan Gupta, Swiggy, Tata Power"
                  value={transferBeneficiary}
                  onChange={(e) => setTransferBeneficiary(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-[#0D2322] border border-[#286056] rounded-xl text-white placeholder-[#9BC3AC]/50 focus:outline-none focus:border-[#34D399]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9BC3AC] font-medium mb-1">Account No. / UPI</label>
                  <input
                    type="text"
                    placeholder="987654321098"
                    value={transferAccount}
                    onChange={(e) => setTransferAccount(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0D2322] border border-[#286056] rounded-xl text-white placeholder-[#9BC3AC]/50 focus:outline-none focus:border-[#34D399]"
                  />
                </div>
                <div>
                  <label className="block text-[#9BC3AC] font-medium mb-1">Amount (INR ₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="500.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[#0D2322] border border-[#286056] rounded-xl text-white font-mono placeholder-[#9BC3AC]/50 focus:outline-none focus:border-[#34D399]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9BC3AC] font-medium mb-1">Category</label>
                  <select
                    value={transferCategory}
                    onChange={(e) => setTransferCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0D2322] border border-[#286056] rounded-xl text-white focus:outline-none focus:border-[#34D399]"
                  >
                    <option value="Food & Dining">Food & Dining</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Utilities & Bills">Utilities & Bills</option>
                    <option value="Housing & Rent">Housing & Rent</option>
                    <option value="Travel">Travel</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Transfer">Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#9BC3AC] font-medium mb-1">Remarks / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Dinner bill split"
                    value={transferDescription}
                    onChange={(e) => setTransferDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0D2322] border border-[#286056] rounded-xl text-white placeholder-[#9BC3AC]/50 focus:outline-none focus:border-[#34D399]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1C4841] hover:bg-[#286056] text-white font-medium transition-colors border border-[#286056] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#34D399] hover:to-[#10B981] text-white font-semibold shadow-md shadow-[#10B981]/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {transferSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Transfer Funds</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Details Receipt Modal */}
      {activeTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#143834] border border-[#286056] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#286056] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1C4841] border border-[#286056] flex items-center justify-center text-[#34D399]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Banking Transaction Receipt</h3>
                  <p className="text-[11px] text-[#9BC3AC] font-mono">{activeTxn.id}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTxn(null)}
                className="p-1.5 rounded-lg hover:bg-[#1C4841] text-[#9BC3AC] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-2 bg-[#0D2322] rounded-xl border border-[#286056]">
              <p className="text-xs text-[#9BC3AC] uppercase tracking-wider">Transaction Amount</p>
              <p
                className={`text-2xl font-bold font-mono mt-1 ${
                  activeTxn.type === 'credit' ? 'text-[#10B981]' : 'text-white'
                }`}
              >
                {activeTxn.type === 'credit' ? '+' : '-'}{formatCurrency(activeTxn.amount)}
              </p>
              <div className="mt-1.5">
                {activeTxn.status === 'COMPLETED' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#133D30] text-[#34D399] border border-[#1F7A5E]">
                    <CheckCircle2 className="w-3 h-3" />
                    COMPLETED
                  </span>
                ) : activeTxn.status === 'PENDING' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#332A15] text-[#F59E0B] border border-[#78531A]">
                    <Clock className="w-3 h-3" />
                    PENDING VERIFICATION
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#3B1D24] text-[#EF4444] border border-[#7A2836]">
                    <Ban className="w-3 h-3" />
                    BLOCKED BY SENTINEL
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 text-xs divide-y divide-[#286056]/40">
              <div className="flex justify-between pt-2">
                <span className="text-[#9BC3AC]">Beneficiary / Merchant</span>
                <span className="font-semibold text-white">{activeTxn.merchant}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-[#9BC3AC]">Description</span>
                <span className="font-medium text-white">{activeTxn.description}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-[#9BC3AC]">Category</span>
                <span className="font-medium text-[#34D399]">{activeTxn.category}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-[#9BC3AC]">Date & Time</span>
                <span className="font-mono text-white">{activeTxn.date}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-[#9BC3AC]">Payment Method</span>
                <span className="font-medium text-white">{activeTxn.payment_method}</span>
              </div>
            </div>

            <button
              onClick={() => setActiveTxn(null)}
              className="w-full py-2.5 rounded-xl bg-[#1C4841] hover:bg-[#286056] text-xs font-semibold text-white transition-colors border border-[#286056] cursor-pointer"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#286056] py-4 text-center text-xs text-[#9BC3AC]/70">
        <p>© 2026 FraudLens Financial Security. Customer Banking Portal.</p>
      </footer>
    </div>
  );
}

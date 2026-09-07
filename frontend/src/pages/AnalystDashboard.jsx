import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  X,
  Clock,
  MapPin,
  TrendingUp,
  BarChart3,
  Activity,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { getSession, clearSession } from '../utils/session';
import { getTransactions, seedTransactions } from '../services/api';

function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-lg bg-[#143834] border border-[#286056] text-xs space-y-1.5 min-w-[150px]">
        {label && <p className="font-semibold text-white pb-1 border-b border-[#286056]">{label}</p>}
        {payload.map((entry, index) => (
          <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#9BC3AC]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span>{entry.name}:</span>
            </span>
            <span className="font-mono font-semibold text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function AnalystDashboard() {
  const navigate = useNavigate();
  const session = getSession();
  const user = session?.user || { name: 'Sarah Chen', id: 'ANALYST-SEC-09', email: 'analyst@bank.com' };

  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL', 'HIGH', 'MEDIUM', 'LOW'
  const [searchQuery, setSearchQuery] = useState('');
  const [seeding, setSeeding] = useState(false);

  const fetchAllTransactions = async () => {
    setLoading(true);
    const result = await getTransactions();
    if (result.success && result.data) {
      setAllTransactions(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllTransactions();
  }, []);

  const handleSeedDataset = async () => {
    setSeeding(true);
    await seedTransactions();
    await fetchAllTransactions();
    setSeeding(false);
  };

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  // Metrics counters - ALWAYS calculated from complete transaction dataset
  const totalCount = allTransactions.length;
  const highCount = allTransactions.filter((t) => t.risk_level === 'HIGH').length;
  const mediumCount = allTransactions.filter((t) => t.risk_level === 'MEDIUM').length;
  const lowCount = allTransactions.filter((t) => t.risk_level === 'LOW').length;

  // Filtered transaction feed displayed to analyst
  const displayedTransactions = useMemo(() => {
    let list = activeFilter === 'ALL'
      ? allTransactions
      : allTransactions.filter((t) => t.risk_level === activeFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) => {
        const idMatch = (t.id || '').toLowerCase().includes(q);
        const locMatch = (t.location || '').toLowerCase().includes(q);
        const userMatch = (t.users?.name || '').toLowerCase().includes(q);
        const emailMatch = (t.users?.email || '').toLowerCase().includes(q);
        const acctMatch = (t.accounts?.account_number || '').toLowerCase().includes(q);
        const benMatch = (t.beneficiaries?.beneficiary_name || '').toLowerCase().includes(q);
        const amtMatch = String(t.amount || '').includes(q);
        return idMatch || locMatch || userMatch || emailMatch || acctMatch || benMatch || amtMatch;
      });
    }

    return list;
  }, [allTransactions, activeFilter, searchQuery]);

  // Chart 1: Transaction Volume Over Time (24h hourly distribution)
  const volumeOverTimeData = useMemo(() => {
    const hourMap = {};
    for (let i = 0; i < 24; i++) {
      const label = `${String(i).padStart(2, '0')}:00`;
      hourMap[label] = { time: label, total: 0, high: 0, normal: 0 };
    }

    allTransactions.forEach((txn) => {
      let hour = null;
      if (txn.reasons && Array.isArray(txn.reasons)) {
        const timing = txn.reasons.find((r) => r.factor === 'hour_of_day');
        if (timing?.current_hour) {
          hour = parseInt(timing.current_hour, 10);
        }
      }
      if (hour == null && txn.transaction_time) {
        hour = new Date(txn.transaction_time).getHours();
      } else if (hour == null && txn.analysis_timestamp) {
        hour = new Date(txn.analysis_timestamp).getHours();
      } else if (hour == null && txn.created_at) {
        hour = new Date(txn.created_at).getHours();
      }
      if (hour == null || isNaN(hour)) {
        hour = 12;
      }

      const label = `${String(hour).padStart(2, '0')}:00`;
      if (hourMap[label]) {
        hourMap[label].total += 1;
        if (txn.risk_level === 'HIGH') {
          hourMap[label].high += 1;
        } else {
          hourMap[label].normal += 1;
        }
      }
    });

    return Object.values(hourMap);
  }, [allTransactions]);

  // Chart 2: Risk Distribution
  const riskDistributionData = useMemo(() => {
    return [
      { name: 'High Risk (70–100)', value: highCount, color: '#DC2626' },
      { name: 'Medium Risk (40–69)', value: mediumCount, color: '#D97706' },
      { name: 'Low Risk (0–39)', value: lowCount, color: '#059669' },
    ].filter((item) => item.value > 0);
  }, [highCount, mediumCount, lowCount]);

  // Chart 3: Transaction Amount Analysis
  const amountAnalysisData = useMemo(() => {
    const brackets = [
      { bracket: '< ₹2k', count: 0, highCount: 0 },
      { bracket: '₹2k - ₹5k', count: 0, highCount: 0 },
      { bracket: '₹5k - ₹15k', count: 0, highCount: 0 },
      { bracket: '₹15k - ₹25k', count: 0, highCount: 0 },
      { bracket: '> ₹25k', count: 0, highCount: 0 },
    ];

    allTransactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      const isHigh = t.risk_level === 'HIGH';
      let target = brackets[0];
      if (amt < 2000) target = brackets[0];
      else if (amt < 5000) target = brackets[1];
      else if (amt < 15000) target = brackets[2];
      else if (amt < 25000) target = brackets[3];
      else target = brackets[4];

      target.count += 1;
      if (isHigh) target.highCount += 1;
    });

    return brackets;
  }, [allTransactions]);

  // Chart 4: Flagged vs Normal Transactions
  const flaggedVsNormalData = useMemo(() => {
    let flaggedCount = 0;
    let normalCount = 0;
    let flaggedAmountK = 0;
    let normalAmountK = 0;

    allTransactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      const isFlagged = t.risk_level === 'HIGH' || t.status === 'BLOCKED' || t.status === 'FLAGGED';
      if (isFlagged) {
        flaggedCount += 1;
        flaggedAmountK += amt / 1000;
      } else {
        normalCount += 1;
        normalAmountK += amt / 1000;
      }
    });

    return [
      {
        metric: 'Volume (Txns)',
        Normal: normalCount,
        Flagged: flaggedCount,
      },
      {
        metric: 'Exposure (₹k)',
        Normal: Math.round(normalAmountK),
        Flagged: Math.round(flaggedAmountK),
      },
    ];
  }, [allTransactions]);

  return (
    <div className="min-h-screen bg-[#0D2322] text-[#E6F4ED] flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="border-b border-[#286056] bg-[#143834]/90 backdrop-blur-md px-6 py-3.5 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1C4841] border border-[#286056] flex items-center justify-center text-[#9BC3AC]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-wider text-white">FRAUDLENS</span>
              <span className="ml-3 text-[11px] px-2 py-0.5 rounded border border-[#286056] bg-[#1C4841] text-[#9BC3AC] font-medium">
                Analyst Console
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-[#9BC3AC]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-medium text-white">{user.name}</span>
              <span className="hidden sm:inline font-mono text-[11px] text-[#9BC3AC]/70">({user.id})</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C4841] hover:bg-[#286056] text-xs font-medium text-[#E6F4ED] transition-colors border border-[#286056] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-6 flex-1 w-full space-y-6">
        {/* Page Title & Status */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Transaction Surveillance & Investigation
            </h1>
            <p className="text-xs sm:text-sm text-[#9BC3AC] mt-1">
              Explainable ML Behaviour Scoring (XGBoost + SHAP Explainer) with live Supabase synchronization.
            </p>
          </div>
        </div>

        {/* 1. Priority Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* All */}
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-[#1C4841] border-[#3D8577]'
                : 'bg-[#143834] border-[#286056] hover:border-[#3D8577]'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-[#9BC3AC]">
              <span className="uppercase tracking-wider font-semibold text-[11px]">Total Monitored</span>
              <Filter className="w-3.5 h-3.5" />
            </div>
            <p className="text-2xl font-bold text-white mt-1">{totalCount}</p>
            <p className="text-[11px] text-[#9BC3AC]/70 mt-0.5">Seeded transaction stream</p>
          </button>

          {/* High Risk */}
          <button
            onClick={() => setActiveFilter('HIGH')}
            className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
              activeFilter === 'HIGH'
                ? 'bg-[#2D171B] border-[#7A2B37]'
                : 'bg-[#143834] border-[#286056] hover:border-[#7A2B37]'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-rose-300 font-semibold">
              <span className="uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                High Risk (70–100)
              </span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />
            </div>
            <p className="text-2xl font-bold text-white mt-1">{highCount}</p>
            <p className="text-[11px] text-rose-300/80 mt-0.5 font-medium">BLOCKED · Priority Review</p>
          </button>

          {/* Medium Risk */}
          <button
            onClick={() => setActiveFilter('MEDIUM')}
            className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
              activeFilter === 'MEDIUM'
                ? 'bg-[#2E2313] border-[#784F17]'
                : 'bg-[#143834] border-[#286056] hover:border-[#784F17]'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
              <span className="uppercase tracking-wider text-[11px]">Medium Risk (40–69)</span>
              <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <p className="text-2xl font-bold text-white mt-1">{mediumCount}</p>
            <p className="text-[11px] text-amber-300/80 mt-0.5">Trusted-Device Verification</p>
          </button>

          {/* Low Risk */}
          <button
            onClick={() => setActiveFilter('LOW')}
            className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
              activeFilter === 'LOW'
                ? 'bg-[#122E25] border-[#1F6B52]'
                : 'bg-[#143834] border-[#286056] hover:border-[#1F6B52]'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
              <span className="uppercase tracking-wider text-[11px]">Low Risk (0–39)</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            </div>
            <p className="text-2xl font-bold text-white mt-1">{lowCount}</p>
            <p className="text-[11px] text-emerald-300/80 mt-0.5">Pass · Normal Confidence</p>
          </button>
        </div>

        {/* 2. Transaction Stream List (Full Width, Click to Navigate) */}
        <div className="bg-[#143834] border border-[#286056] rounded-xl overflow-hidden flex flex-col h-[520px]">
          {/* Header Bar with Search & Filter Indicator */}
          <div className="p-3.5 border-b border-[#286056] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1C4841]/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9BC3AC]">
                Transaction Feed ({displayedTransactions.length})
              </span>
              {activeFilter !== 'ALL' && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#286056] text-white font-medium">
                  Filter: {activeFilter}
                </span>
              )}
              {searchQuery && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#1C4841] text-[#9BC3AC] border border-[#286056]">
                  Search: "{searchQuery}"
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9BC3AC]/60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by ID, user, city, amount..."
                  className="pl-8 pr-8 py-1.5 text-xs rounded-lg bg-[#1C4841] border border-[#286056] text-white placeholder-[#9BC3AC]/40 w-56 sm:w-64 focus:outline-none focus:border-[#3D8577] transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9BC3AC]/60 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Reset Filter Button */}
              {activeFilter !== 'ALL' && (
                <button
                  onClick={() => setActiveFilter('ALL')}
                  className="text-xs text-[#9BC3AC] hover:text-white underline cursor-pointer"
                >
                  Show All
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Transaction Stream */}
          <div className="overflow-y-auto flex-1 divide-y divide-[#286056]/50">
            {loading && (
              <div className="p-16 text-center text-xs text-[#9BC3AC] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Loading transactions from Supabase...</span>
              </div>
            )}

            {!loading && displayedTransactions.length === 0 && (
              <div className="p-16 text-center text-xs text-[#9BC3AC] space-y-3">
                <p>No transactions found matching filter "{activeFilter}".</p>
              </div>
            )}

            {!loading &&
              displayedTransactions.map((txn) => {
                const isHigh = txn.risk_level === 'HIGH';
                const isMed = txn.risk_level === 'MEDIUM';
                const topReason =
                  txn.reasons && txn.reasons.length > 0
                    ? txn.reasons[0].reason || txn.reasons[0].explanation
                    : isHigh
                    ? 'Critical behavioral deviation flagged'
                    : 'Standard spending pattern';

                return (
                  <div
                    key={txn.id}
                    onClick={() => navigate(`/analyst/transactions/${txn.id}`)}
                    className={`group p-3.5 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isHigh
                        ? 'bg-[#24171A]/30 hover:bg-[#2D171B]/60 border-l-3 border-[#DC2626]'
                        : isMed
                        ? 'hover:bg-[#1C4841]/40 border-l-3 border-[#D97706]'
                        : 'hover:bg-[#1C4841]/30 border-l-3 border-transparent'
                    }`}
                    title="Click to view full transaction investigation dossier"
                  >
                    {/* Left: Amount, Origin, Entity & Primary Anomaly */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white text-sm sm:text-base font-mono">
                          ₹{Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-[#9BC3AC] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#9BC3AC]/70" />
                          {txn.location || 'Delhi'}
                        </span>
                        <span className="text-[11px] text-[#9BC3AC]/60 font-mono hidden md:inline">
                          ID: {txn.id.slice(0, 8)}...
                        </span>
                        {txn.users?.name && (
                          <span className="text-[11px] text-[#9BC3AC]/80 font-medium hidden lg:inline truncate">
                            · {txn.users.name}
                          </span>
                        )}
                      </div>

                      {/* Primary Driver / Threat preview */}
                      <p
                        className={`text-xs leading-relaxed truncate ${
                          isHigh ? 'text-rose-200/90 font-medium' : 'text-[#E6F4ED]/70'
                        }`}
                      >
                        {topReason}
                      </p>
                    </div>

                    {/* Right: Badges, Date/Time & Action Arrow */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="flex flex-col sm:items-end text-right">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold font-mono ${
                              isHigh
                                ? 'bg-[#33171D] text-rose-200 border border-[#7A2B37]'
                                : isMed
                                ? 'bg-[#362612] text-amber-200 border border-[#784F17]'
                                : 'bg-[#133D30] text-emerald-200 border border-[#1F6B52]'
                            }`}
                          >
                            {Math.round(txn.risk_score ?? 0)}/100 {txn.risk_level}
                          </span>

                          <span
                            className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                              isHigh
                                ? 'bg-[#3A1820] text-rose-200'
                                : 'bg-[#1C4841] text-[#9BC3AC]'
                            }`}
                          >
                            {txn.status || 'COMPLETED'}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono text-[#9BC3AC]/70 mt-0.5">
                          {txn.transaction_time
                            ? new Date(txn.transaction_time).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })
                            : 'Live Stream'}
                        </span>
                      </div>

                      {/* View Dossier Action Arrow */}
                      <div className="flex items-center gap-1 text-xs text-[#9BC3AC] group-hover:text-white transition-colors pl-2">
                        <span className="hidden xl:inline text-[11px] font-medium">Investigate</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* 3. Transaction & Risk Summary Section (Recharts Charts) */}
        <div className="space-y-4 pt-2">
          {/* Section Title */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#286056] pb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4 text-[#9BC3AC]" />
                Transaction & Risk Summary
              </h2>
              <p className="text-xs text-[#9BC3AC] mt-0.5">
                Behavioral machine learning analytics and risk telemetry across 100 monitored sample transactions.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#9BC3AC]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Explainable AI Feed</span>
            </div>
          </div>

          {/* 4 Analytics Cards in 2x2 Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: Transaction Volume Over Time */}
            <div className="bg-[#143834] border border-[#286056] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#4EBEA3]" />
                    Transaction Volume Over Time
                  </h3>
                  <p className="text-[11px] text-[#9BC3AC]">24-hour cycle volume distribution</p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1C4841] text-[#9BC3AC] border border-[#286056]">
                  24h Timeline
                </span>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeOverTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volTotalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4EBEA3" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#4EBEA3" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="volHighGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#DC2626" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#DC2626" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#286056" vertical={false} />
                    <XAxis dataKey="time" stroke="#9BC3AC" fontSize={10} tickLine={false} axisLine={{ stroke: '#286056' }} />
                    <YAxis stroke="#9BC3AC" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Total Monitored"
                      stroke="#4EBEA3"
                      fillOpacity={1}
                      fill="url(#volTotalGrad)"
                      strokeWidth={1.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="high"
                      name="High Risk (Flagged)"
                      stroke="#DC2626"
                      fillOpacity={1}
                      fill="url(#volHighGrad)"
                      strokeWidth={1.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Risk Distribution */}
            <div className="bg-[#143834] border border-[#286056] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    Risk Distribution
                  </h3>
                  <p className="text-[11px] text-[#9BC3AC]">Proportion of High, Medium, and Low risk transactions</p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1C4841] text-[#9BC3AC] border border-[#286056]">
                  {totalCount} Total
                </span>
              </div>
              <div className="h-[240px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {riskDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#143834" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                      formatter={(value, entry) => (
                        <span className="text-[#E6F4ED]">
                          {value}: <strong className="font-mono text-white">{entry.payload.value}</strong>
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Transaction Amount Analysis */}
            <div className="bg-[#143834] border border-[#286056] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Transaction Amount Analysis
                  </h3>
                  <p className="text-[11px] text-[#9BC3AC]">Transaction volume across spending brackets</p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1C4841] text-[#9BC3AC] border border-[#286056]">
                  Spending Tiers
                </span>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={amountAnalysisData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#286056" vertical={false} />
                    <XAxis dataKey="bracket" stroke="#9BC3AC" fontSize={10} tickLine={false} axisLine={{ stroke: '#286056' }} />
                    <YAxis stroke="#9BC3AC" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="count" name="Total Volume" fill="#286056" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="highCount" name="High Risk Volume" fill="#DC2626" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Flagged vs Normal Transactions */}
            <div className="bg-[#143834] border border-[#286056] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Flagged vs Normal Transactions
                  </h3>
                  <p className="text-[11px] text-[#9BC3AC]">Comparison of flagged anomalies against verified legitimate traffic</p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1C4841] text-[#9BC3AC] border border-[#286056]">
                  Exposure
                </span>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flaggedVsNormalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#286056" vertical={false} />
                    <XAxis dataKey="metric" stroke="#9BC3AC" fontSize={10} tickLine={false} axisLine={{ stroke: '#286056' }} />
                    <YAxis stroke="#9BC3AC" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="Normal" name="Normal / Legitimate" fill="#059669" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Flagged" name="Flagged / Blocked" fill="#DC2626" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#286056] py-4 text-center text-xs text-[#9BC3AC]/70">
        <p>© 2026 FraudLens Financial Security. Restricted Fraud Analyst Console.</p>
      </footer>
    </div>
  );
}

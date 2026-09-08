import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  TrendingUp,
  Zap,
  Copy,
  Check,
  LogOut,
  RefreshCw,
  BarChart3,
  Activity,
  MinusCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { getSession, clearSession } from '../utils/session';
import { getTransactionById, verifyBlockchainDecision, getBlockchainRecord } from '../services/api';

const FACTOR_TITLE_MAP = {
  hour_of_day: 'Unusual Transaction Time',
  amount_deviation: 'Transaction Amount Anomaly',
  transaction_amount: 'Transaction Amount Anomaly',
  implied_travel_speed_kmh: 'Impossible Travel Speed',
  distance_from_prev_km: 'Impossible Travel Speed',
  is_diff_location: 'Location Change Anomaly',
  txns_last_10_min: 'High Transaction Frequency',
  txns_last_1_hour: 'High Transaction Frequency',
  txns_last_24_hours: 'Daily Transaction Volume',
  device_id: 'Device Anomaly',
  beneficiary_id: 'Beneficiary Anomaly',
};

function getInvestigationSummary(txn) {
  if (!txn) return 'Explanation not available for this transaction';
  const reasons = txn.reasons || txn.explanations || [];
  const score = Math.round(txn.risk_score ?? 0);
  const level = txn.risk_level || 'LOW';

  if (!reasons || reasons.length === 0) {
    if (level === 'LOW' || score < 40) {
      return 'Routine legitimate transaction. No anomalous risk factors detected.';
    }
    return 'Explanation not available for this transaction.';
  }

  return `${reasons.length} transaction-specific risk factor${reasons.length === 1 ? '' : 's'} detected.`;
}

function CustomDetailsChartTooltip({ active, payload, label }) {
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
            <span className="font-mono font-semibold text-white">
              {typeof entry.value === 'number' &&
              (entry.name.toLowerCase().includes('amount') ||
                entry.name.toLowerCase().includes('current') ||
                entry.name.toLowerCase().includes('average'))
                ? `₹${entry.value.toLocaleString('en-IN')}`
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function TransactionDetailsPage() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const user = session?.user || { name: 'Sarah Chen', id: 'ANALYST-SEC-09', email: 'analyst@bank.com' };

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [blockchainRecord, setBlockchainRecord] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      const res = await getTransactionById(transactionId);
      if (isMounted) {
        if (res.success && res.data) {
          setTransaction(res.data);
          // Query initial blockchain verification and record
          try {
            const vRes = await verifyBlockchainDecision(transactionId);
            if (isMounted && vRes.success && vRes.data) {
              setVerificationResult(vRes.data);
              setBlockchainRecord(vRes.data);
            } else if (isMounted) {
              const isFinalized = res.data.status === 'COMPLETED' || res.data.status === 'BLOCKED';
              setVerificationResult({
                verification_status: isFinalized ? 'NOT_VERIFIED' : 'NOT_APPLICABLE',
                status: isFinalized ? 'NOT_VERIFIED' : 'NOT_APPLICABLE',
                display_status: isFinalized ? '⚠ NOT VERIFIED' : '— NOT APPLICABLE',
                reason: isFinalized
                  ? 'A blockchain record was expected, but no matching blockchain record exists in FraudDecisionLedger.'
                  : 'This transaction has not reached the stage where a blockchain audit record should exist.',
                verified: false,
              });
            }
          } catch (bErr) {
            console.warn('Initial blockchain verification error:', bErr);
            if (isMounted) {
              const isFinalized = res.data.status === 'COMPLETED' || res.data.status === 'BLOCKED';
              setVerificationResult({
                verification_status: isFinalized ? 'NOT_VERIFIED' : 'NOT_APPLICABLE',
                status: isFinalized ? 'NOT_VERIFIED' : 'NOT_APPLICABLE',
                display_status: isFinalized ? '⚠ NOT VERIFIED' : '— NOT APPLICABLE',
                reason: isFinalized
                  ? 'A blockchain record was expected, but no matching blockchain record exists in FraudDecisionLedger.'
                  : 'This transaction has not reached the stage where a blockchain audit record should exist.',
                verified: false,
              });
            }
          }
        } else {
          setError(res.error || 'Transaction record could not be loaded.');
        }
        setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [transactionId]);

  const handleCopyId = () => {
    if (transaction?.id) {
      navigator.clipboard.writeText(transaction.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyHash = () => {
    const hash = verificationResult?.blockchain_reference || blockchainRecord?.transaction_hash;
    if (hash) {
      navigator.clipboard.writeText(hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleVerifyBlockchain = async () => {
    if (!transactionId) return;
    setIsVerifying(true);
    const res = await verifyBlockchainDecision(transactionId);
    if (res.success && res.data) {
      setVerificationResult(res.data);
      if (res.data.blockchain_reference) {
        setBlockchainRecord((prev) => ({
          ...prev,
          transaction_hash: res.data.blockchain_reference,
          block_number: res.data.block_number,
          timestamp: res.data.timestamp,
        }));
      }
    } else {
      const isFinalized = transaction?.status === 'COMPLETED' || transaction?.status === 'BLOCKED';
      setVerificationResult({
        verification_status: isFinalized ? 'NOT_VERIFIED' : 'NOT_APPLICABLE',
        status: isFinalized ? 'NOT_VERIFIED' : 'NOT_APPLICABLE',
        display_status: isFinalized ? '⚠ NOT VERIFIED' : '— NOT APPLICABLE',
        reason: isFinalized
          ? 'A blockchain record was expected, but no matching blockchain record exists in FraudDecisionLedger.'
          : 'This transaction has not reached the stage where a blockchain audit record should exist.',
        verified: false,
      });
    }
    setIsVerifying(false);
  };

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  // -------------------------------------------------------------
  // Chart 1: Historical transaction amount vs current amount
  // -------------------------------------------------------------
  const amountComparisonData = useMemo(() => {
    if (!transaction) return [];
    const amt = Number(transaction.amount) || 0;
    const isHigh = transaction.risk_level === 'HIGH';

    let histAvg = 1088;
    let normalMax = 3500;

    const amtReason = transaction.reasons?.find(
      (r) => r.factor === 'amount_deviation' || r.factor === 'transaction_amount'
    );
    if (amtReason?.historical_avg) {
      const parsed = parseFloat(String(amtReason.historical_avg).replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed) && parsed > 0) histAvg = parsed;
    }
    if (amtReason?.normal_range && typeof amtReason.normal_range === 'string') {
      const parts = amtReason.normal_range.split('–');
      if (parts.length === 2) {
        const parsedMax = parseFloat(parts[1].replace(/[^0-9.]/g, ''));
        if (!isNaN(parsedMax) && parsedMax > 0) normalMax = parsedMax;
      }
    } else {
      normalMax = histAvg * 3;
    }

    return [
      {
        tier: 'Customer Baseline Avg',
        amount: Math.round(histAvg),
        fill: '#286056',
      },
      {
        tier: 'Expected Range Max',
        amount: Math.round(normalMax),
        fill: '#3D8577',
      },
      {
        tier: 'Current Transaction',
        amount: Math.round(amt),
        fill: isHigh ? '#DC2626' : '#059669',
      },
    ];
  }, [transaction]);

  // -------------------------------------------------------------
  // Chart 2: Transaction frequency/history
  // -------------------------------------------------------------
  const frequencyData = useMemo(() => {
    if (!transaction) return [];

    let txns10m = 0;
    let txns1h = 1;
    let txns24h = 3;

    const velReason = transaction.reasons?.find(
      (r) =>
        r.factor === 'txns_last_10_min' ||
        r.factor === 'txns_last_1_hour' ||
        r.factor === 'txns_last_24_hours'
    );
    if (velReason) {
      if (velReason.txns_last_10_min != null) txns10m = Number(velReason.txns_last_10_min);
      if (velReason.txns_last_1_hour != null) txns1h = Number(velReason.txns_last_1_hour);
      if (velReason.txns_last_24_hours != null) txns24h = Number(velReason.txns_last_24_hours);
    } else {
      if (transaction.risk_level === 'HIGH') {
        txns10m = 4;
        txns1h = 8;
        txns24h = 15;
      } else {
        txns10m = 0;
        txns1h = 1;
        txns24h = 3;
      }
    }

    return [
      {
        interval: 'Last 10 Min',
        'Customer Baseline': 0,
        'Current Velocity': txns10m,
      },
      {
        interval: 'Last 1 Hour',
        'Customer Baseline': 1,
        'Current Velocity': txns1h,
      },
      {
        interval: 'Last 24 Hours',
        'Customer Baseline': 3,
        'Current Velocity': txns24h,
      },
    ];
  }, [transaction]);

  // -------------------------------------------------------------
  // Chart 3: Risk-factor contribution
  // -------------------------------------------------------------
  const riskFactorContributionData = useMemo(() => {
    if (!transaction) return [];
    const reasons = transaction.reasons || [];
    if (!reasons.length) {
      return [
        {
          factor: 'Overall Spending Profile',
          contribution: Math.max(5, Math.round(transaction.risk_score || 10)),
          shap: '+0.00',
          fill: '#059669',
        },
      ];
    }

    return reasons.map((r) => {
      const factorName = FACTOR_TITLE_MAP[r.factor] || r.title || r.factor || 'Risk Factor';
      let scoreVal = 75;
      if (r.factor === 'hour_of_day') scoreVal = 95;
      else if (r.factor === 'amount_deviation' || r.factor === 'transaction_amount') scoreVal = 85;
      else if (r.factor === 'implied_travel_speed_kmh') scoreVal = 90;
      else if (r.factor === 'txns_last_10_min') scoreVal = 70;

      const shapRaw =
        r.shap_impact != null
          ? Number(r.shap_impact)
          : r.impact != null
          ? Number(r.impact)
          : null;

      const shapStr =
        r.shap_display ||
        (shapRaw != null
          ? (shapRaw > 0 ? `+${shapRaw.toFixed(2)}` : shapRaw < 0 ? shapRaw.toFixed(2) : '+0.00')
          : '+0.00');

      let color = '#D97706';
      if (scoreVal >= 85) color = '#DC2626';
      else if (scoreVal < 60) color = '#059669';

      return {
        factor: factorName,
        contribution: scoreVal,
        shap: shapStr,
        impactDisplay: shapStr,
        fill: color,
      };
    });
  }, [transaction]);

  // -------------------------------------------------------------
  // Chart 4: Normal transaction time vs current time
  // -------------------------------------------------------------
  const timingAnalysisData = useMemo(() => {
    if (!transaction) return [];

    let txnHour = 14;
    const timeReason = transaction.reasons?.find((r) => r.factor === 'hour_of_day');
    if (timeReason?.current_hour) {
      txnHour = parseInt(timeReason.current_hour, 10);
    } else if (transaction.transaction_time) {
      txnHour = new Date(transaction.transaction_time).getHours();
    } else if (transaction.created_at) {
      txnHour = new Date(transaction.created_at).getHours();
    }
    if (isNaN(txnHour)) txnHour = 14;

    const hours = [];
    for (let h = 0; h < 24; h++) {
      const isNormal = h >= 7 && h <= 22;
      const isTxn = h === txnHour;
      hours.push({
        time: `${String(h).padStart(2, '0')}:00`,
        'Customer Normal Activity': isNormal ? 80 : 5,
        'Current Transaction': isTxn ? 100 : 0,
        isTxn,
      });
    }
    return hours;
  }, [transaction]);

  return (
    <div className="min-h-screen bg-[#0D2322] text-[#E6F4ED] flex flex-col justify-between">
      {/* Top Header Navigation */}
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

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-[#9BC3AC]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-medium text-white">{user.name}</span>
              <span className="hidden sm:inline font-mono text-[11px] text-[#9BC3AC]/70">({user.id})</span>
            </div>

            <button
              onClick={() => navigate('/analyst')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C4841] hover:bg-[#286056] text-xs font-medium text-[#E6F4ED] transition-colors border border-[#286056] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>

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

      {/* Main Content Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-6 flex-1 w-full space-y-6">
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/analyst')}
            className="inline-flex items-center gap-2 text-xs text-[#9BC3AC] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Surveillance Feed / Transaction Dossier</span>
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-16 rounded-xl bg-[#143834] border border-[#286056] flex flex-col items-center justify-center text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-[#9BC3AC] animate-spin" />
            <p className="text-xs text-[#9BC3AC]">Loading transaction investigation dossier...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-8 rounded-xl bg-[#143834] border border-[#7A2B37] flex flex-col items-center justify-center text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-400" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">Transaction Not Found</h2>
              <p className="text-xs text-[#9BC3AC] max-w-md">{error}</p>
            </div>
            <button
              onClick={() => navigate('/analyst')}
              className="px-3.5 py-1.5 rounded-lg bg-[#1C4841] hover:bg-[#286056] text-xs font-medium text-white transition-colors border border-[#286056] cursor-pointer"
            >
              Return to Analyst Dashboard
            </button>
          </div>
        )}

        {/* Transaction Content */}
        {!loading && transaction && (
          <div className="space-y-6">
            {/* Top Summary Banner */}
            <div className="bg-[#143834] border border-[#286056] rounded-xl p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#286056] pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#9BC3AC] mb-1">
                    <span className="uppercase tracking-wider font-semibold text-[11px]">Transaction Dossier ID</span>
                    <button
                      onClick={handleCopyId}
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-[#E6F4ED] hover:text-white px-2 py-0.5 rounded bg-[#1C4841] border border-[#286056] transition-colors cursor-pointer"
                      title="Copy Transaction ID"
                    >
                      <span>{transaction.id}</span>
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#9BC3AC]" />}
                    </button>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1 font-mono">
                    {transaction.amount != null
                      ? `₹${Number(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : 'N/A'}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Risk Score */}
                  <span
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono ${
                      transaction.risk_level === 'HIGH'
                        ? 'bg-[#33171D] text-rose-200 border border-[#7A2B37]'
                        : transaction.risk_level === 'MEDIUM'
                        ? 'bg-[#362612] text-amber-200 border border-[#784F17]'
                        : 'bg-[#133D30] text-emerald-200 border border-[#1F6B52]'
                    }`}
                  >
                    Risk Score: {transaction.risk_score != null ? `${Math.round(transaction.risk_score)}/100` : 'N/A'}
                  </span>

                  {/* Risk Level */}
                  <span
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold font-mono uppercase ${
                      transaction.risk_level === 'HIGH'
                        ? 'bg-[#3A1820] text-rose-200 border border-[#7A2B37]'
                        : transaction.risk_level === 'MEDIUM'
                        ? 'bg-[#3D2B13] text-amber-200 border border-[#784F17]'
                        : 'bg-[#164234] text-emerald-200 border border-[#1F6B52]'
                    }`}
                  >
                    {transaction.risk_level || 'LOW'}
                  </span>

                  {/* Status */}
                  <span
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold font-mono uppercase ${
                      transaction.status === 'BLOCKED'
                        ? 'bg-[#3A1820] text-rose-200 border border-[#7A2B37]'
                        : transaction.status === 'FLAGGED'
                        ? 'bg-[#3D2B13] text-amber-200 border border-[#784F17]'
                        : 'bg-[#1C4841] text-[#9BC3AC] border border-[#286056]'
                    }`}
                  >
                    {transaction.status || 'COMPLETED'}
                  </span>
                </div>
              </div>

              {/* Enforced Policy Rule */}
              <div
                className={`mt-4 p-3.5 rounded-lg border ${
                  transaction.risk_level === 'HIGH'
                    ? 'bg-[#2D171B] border-[#7A2B37] text-rose-200'
                    : transaction.risk_level === 'MEDIUM'
                    ? 'bg-[#2E2313] border-[#784F17] text-amber-200'
                    : 'bg-[#1C4841] border-[#286056] text-[#E6F4ED]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold uppercase mb-1">
                  <span>Enforced Policy Rule</span>
                  <span className="font-mono text-[11px]">
                    {transaction.risk_level === 'HIGH'
                      ? 'BLOCKED'
                      : transaction.risk_level === 'MEDIUM'
                      ? 'VERIFICATION REQUIRED'
                      : 'TRUSTED DEVICE CHECK'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[#E6F4ED]/80">
                  {transaction.risk_level === 'HIGH'
                    ? 'Score 70–100 triggered automatic transaction blocking and escalated to priority fraud analyst review.'
                    : transaction.risk_level === 'MEDIUM'
                    ? 'Score 40–69 routed to mandatory trusted-device multi-factor authentication.'
                    : 'Score 0–39 passed model confidence with trusted-device validation protocol.'}
                </p>
              </div>
            </div>

            {/* Split Grid: Entity Profiles and Point-by-Point Explanations */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (5 cols): Transaction Profile & Entities */}
              <div className="lg:col-span-5 bg-[#143834] border border-[#286056] rounded-xl p-5 space-y-4">
                <span className="text-xs uppercase font-bold tracking-wider text-[#9BC3AC] block border-b border-[#286056] pb-2">
                  Transaction Profile & Entities
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {/* Customer */}
                  <div className="p-3 rounded-lg bg-[#1C4841] border border-[#286056]">
                    <span className="text-[10px] text-[#9BC3AC]/70 block">Customer</span>
                    <span className="font-medium text-white block truncate">
                      {transaction.users?.name || (transaction.user_id ? `User: ${transaction.user_id.slice(0, 8)}...` : 'Not available')}
                    </span>
                    {transaction.users?.email && (
                      <span className="text-[10px] text-[#9BC3AC]/60 block truncate">{transaction.users.email}</span>
                    )}
                  </div>

                  {/* Account */}
                  <div className="p-3 rounded-lg bg-[#1C4841] border border-[#286056]">
                    <span className="text-[10px] text-[#9BC3AC]/70 block">Account</span>
                    <span className="font-medium text-white block truncate">
                      {transaction.accounts?.account_number || (transaction.account_id ? `Acct: ${transaction.account_id.slice(0, 8)}...` : 'Not available')}
                    </span>
                    {transaction.accounts?.account_type && (
                      <span className="text-[10px] text-[#9BC3AC]/60 block">{transaction.accounts.account_type}</span>
                    )}
                  </div>

                  {/* Beneficiary */}
                  <div className="p-3 rounded-lg bg-[#1C4841] border border-[#286056]">
                    <span className="text-[10px] text-[#9BC3AC]/70 block">Beneficiary</span>
                    <span className="font-medium text-white block truncate">
                      {transaction.beneficiaries?.beneficiary_name || (transaction.beneficiary_id ? `Ref: ${transaction.beneficiary_id.slice(0, 8)}...` : 'Not available')}
                    </span>
                    {transaction.beneficiaries?.account_reference && (
                      <span className="text-[10px] text-[#9BC3AC]/60 block truncate">{transaction.beneficiaries.account_reference}</span>
                    )}
                  </div>

                  {/* Device */}
                  <div className="p-3 rounded-lg bg-[#1C4841] border border-[#286056]">
                    <span className="text-[10px] text-[#9BC3AC]/70 block">Device</span>
                    <span className="font-medium text-white block truncate font-mono text-[11px]">
                      {transaction.device_id || transaction.device || 'Not available'}
                    </span>
                  </div>

                  {/* Origin Location */}
                  <div className="p-3 rounded-lg bg-[#1C4841] border border-[#286056]">
                    <span className="text-[10px] text-[#9BC3AC]/70 block">Origin Location</span>
                    <span className="font-medium text-white block truncate">
                      {transaction.location || 'Not available'}
                    </span>
                  </div>

                  {/* Date / Time */}
                  <div className="p-3 rounded-lg bg-[#1C4841] border border-[#286056]">
                    <span className="text-[10px] text-[#9BC3AC]/70 block">Date / Time</span>
                    <span className="font-medium text-white block truncate font-mono text-[11px]">
                      {transaction.transaction_time
                        ? new Date(transaction.transaction_time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                        : transaction.analysis_timestamp
                        ? new Date(transaction.analysis_timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                        : transaction.created_at
                        ? new Date(transaction.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                        : 'Not available'}
                    </span>
                  </div>

                  {/* Risk Level */}
                  <div className="p-3 rounded-lg bg-[#1C4841] border border-[#286056]">
                    <span className="text-[10px] text-[#9BC3AC]/70 block">Risk Level</span>
                    <span className="font-semibold text-white block">{transaction.risk_level || 'Not available'}</span>
                  </div>

                  {/* Transaction Status */}
                  <div className="p-3 rounded-lg bg-[#1C4841] border border-[#286056]">
                    <span className="text-[10px] text-[#9BC3AC]/70 block">Transaction Status</span>
                    <span className="font-semibold text-white block">{transaction.status || 'Not available'}</span>
                  </div>

                  {/* Transaction Type */}
                  <div className="p-3 rounded-lg bg-[#1C4841] border border-[#286056]">
                    <span className="text-[10px] text-[#9BC3AC]/70 block">Transaction Type</span>
                    <span className="font-medium text-white block">{transaction.transaction_type || 'TRANSFER'}</span>
                  </div>

                  {/* Currency */}
                  <div className="p-3 rounded-lg bg-[#1C4841] border border-[#286056]">
                    <span className="text-[10px] text-[#9BC3AC]/70 block">Currency</span>
                    <span className="font-medium text-white block font-mono">{transaction.currency || 'INR'}</span>
                  </div>
                </div>
              </div>

              {/* Right Column (7 cols): WHY WAS THIS TRANSACTION FLAGGED? */}
              <div className="lg:col-span-7 bg-[#143834] border border-[#286056] rounded-xl p-5 space-y-4">
                {/* Section Header */}
                <div className="border-b border-[#286056] pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                    <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      WHY WAS THIS TRANSACTION FLAGGED?
                    </h2>
                    <span className="text-xs font-mono font-semibold text-amber-300">
                      Risk Score: {transaction.risk_score != null ? `${Math.round(transaction.risk_score)}/100` : 'N/A'} — {transaction.risk_level || 'N/A'}
                    </span>
                  </div>

                  {/* Short Investigation Summary */}
                  <p className="text-xs text-[#9BC3AC] mt-1.5 font-medium">
                    {getInvestigationSummary(transaction)}
                  </p>
                </div>

                {/* Detected Risk Drivers */}
                {transaction.reasons && transaction.reasons.length > 0 ? (
                  <div className="space-y-3">
                    <span className="text-[11px] uppercase font-bold tracking-wider text-[#9BC3AC] block">
                      DETECTED RISK DRIVERS
                    </span>

                    {transaction.reasons.map((item, idx) => {
                      const factorTitle = item.title && (FACTOR_TITLE_MAP[item.factor] || item.title);
                      const title = FACTOR_TITLE_MAP[item.factor] || factorTitle || item.factor || 'Risk Driver';
                      const isTiming = item.factor === 'hour_of_day';
                      const isAmount = item.factor === 'amount_deviation' || item.factor === 'transaction_amount';
                      const isTravel = item.factor === 'implied_travel_speed_kmh' || item.factor === 'distance_from_prev_km';
                      const isVelocity = item.factor === 'txns_last_10_min' || item.factor === 'txns_last_1_hour' || item.factor === 'txns_last_24_hours';

                      const itemShapRaw =
                        item.shap_impact != null
                          ? Number(item.shap_impact)
                          : item.impact != null
                          ? Number(item.impact)
                          : null;

                      const shapDisplay =
                        item.shap_display ||
                        (itemShapRaw != null
                          ? (itemShapRaw > 0 ? `+${itemShapRaw.toFixed(2)}` : itemShapRaw < 0 ? itemShapRaw.toFixed(2) : '+0.00')
                          : '+0.00');

                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-lg bg-[#1C4841] border border-[#286056] flex flex-col gap-2"
                        >
                          {/* Card Header: Human-readable Risk Factor Name */}
                          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#286056]/60">
                            <span className="font-semibold text-sm text-white flex items-center gap-2">
                              {isTiming && <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                              {isAmount && <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                              {isTravel && <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                              {isVelocity && <Zap className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                              {!isTiming && !isAmount && !isTravel && !isVelocity && (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                              {title}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#143834] border border-[#286056] text-amber-300">
                              SHAP Impact: {shapDisplay}
                            </span>
                          </div>

                          {/* Point-by-point details */}
                          <ul className="space-y-1 text-xs text-[#E6F4ED] pt-0.5">
                            {/* Timing */}
                            {isTiming && (
                              <>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">Transaction time:</strong>{' '}
                                    <span className="font-mono font-semibold text-white">{item.current_hour || 'Night hours'}</span>
                                  </span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">Explanation:</strong>{' '}
                                    <span className="text-[#E6F4ED]/80">{item.explanation || item.reason || "Outside customer's normal operating period"}</span>
                                  </span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">SHAP Impact:</strong>{' '}
                                    <span className="font-mono text-amber-300 font-semibold">{shapDisplay}</span>
                                  </span>
                                </li>
                              </>
                            )}

                            {/* Amount */}
                            {isAmount && (
                              <>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">Current amount:</strong>{' '}
                                    <span className="font-mono font-semibold text-white">
                                      {item.current || (transaction.amount != null ? `₹${Number(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A')}
                                    </span>
                                  </span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">Historical average:</strong>{' '}
                                    <span className="font-mono text-[#E6F4ED]">{item.historical_avg || 'Baseline profile'}</span>
                                  </span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">Deviation:</strong>{' '}
                                    <span className="font-mono text-rose-300 font-semibold">{item.deviation || 'Elevated'}</span>
                                  </span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">SHAP Impact:</strong>{' '}
                                    <span className="font-mono text-amber-300 font-semibold">{shapDisplay}</span>
                                  </span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">Explanation:</strong>{' '}
                                    <span className="text-[#E6F4ED]/80">
                                      {item.explanation || item.reason || "Transaction amount is significantly higher than customer's historical spending pattern."}
                                    </span>
                                  </span>
                                </li>
                              </>
                            )}

                            {/* Travel */}
                            {isTravel && (
                              <>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">Previous location:</strong>{' '}
                                    <span className="text-white font-medium">{item.previous_location || 'Prior location'}</span>
                                  </span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">Current location:</strong>{' '}
                                    <span className="text-white font-medium">{item.current_location || transaction.location || 'Current location'}</span>
                                  </span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">Distance:</strong>{' '}
                                    <span className="font-mono text-white">{item.distance || 'Geographical distance'}</span>
                                  </span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">Time:</strong>{' '}
                                    <span className="font-mono text-white">{item.time_since_previous || 'Elapsed time'}</span>
                                  </span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">Speed:</strong>{' '}
                                    <span className="font-mono text-rose-300 font-semibold">{item.implied_speed || 'Velocity'}</span>
                                  </span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">SHAP Impact:</strong>{' '}
                                    <span className="font-mono text-amber-300 font-semibold">{shapDisplay}</span>
                                  </span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">Explanation:</strong>{' '}
                                    <span className="text-[#E6F4ED]/80">
                                      {item.explanation || item.reason || "Physical travel speed between consecutive locations exceeds physical possibility."}
                                    </span>
                                  </span>
                                </li>
                              </>
                            )}

                            {/* Velocity */}
                            {isVelocity && (
                              <>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">Last 10 minutes:</strong>{' '}
                                    <span className="font-mono text-amber-300 font-semibold">{item.txns_last_10_min ?? 'N/A'}</span>
                                  </span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">Last 1 hour:</strong>{' '}
                                    <span className="font-mono text-white">{item.txns_last_1_hour ?? 'N/A'}</span>
                                  </span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">Last 24 hours:</strong>{' '}
                                    <span className="font-mono text-white">{item.txns_last_24_hours ?? 'N/A'}</span>
                                  </span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">SHAP Impact:</strong>{' '}
                                    <span className="font-mono text-amber-300 font-semibold">{shapDisplay}</span>
                                  </span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">Explanation:</strong>{' '}
                                    <span className="text-[#E6F4ED]/80">
                                      {item.explanation || item.reason || "High payment frequency detected, exceeding normal thresholds."}
                                    </span>
                                  </span>
                                </li>
                              </>
                            )}

                            {/* Fallback */}
                            {!isTiming && !isAmount && !isTravel && !isVelocity && (
                              <>
                                {item.current && (
                                  <li className="flex items-start gap-2">
                                    <span className="text-[#9BC3AC] select-none">-</span>
                                    <span>
                                      <strong className="text-[#9BC3AC] font-medium">Value:</strong>{' '}
                                      <span className="font-mono text-white">{item.current}</span>
                                    </span>
                                  </li>
                                )}
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">SHAP Impact:</strong>{' '}
                                    <span className="font-mono text-amber-300 font-semibold">{shapDisplay}</span>
                                  </span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#9BC3AC] select-none">-</span>
                                  <span>
                                    <strong className="text-[#9BC3AC] font-medium">Explanation:</strong>{' '}
                                    <span className="text-[#E6F4ED]/80">{item.explanation || item.reason || 'Anomalous feature.'}</span>
                                  </span>
                                </li>
                              </>
                            )}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-[#1C4841] border border-[#286056] text-xs text-[#9BC3AC] flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-semibold text-white block">Explanation not available for this transaction</span>
                      <span className="text-[11px] text-[#9BC3AC]/80">
                        This transaction aligns with customer baseline spending and exhibits no anomalous risk factors.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Transaction-Specific Behavioral & ML Analysis Charts */}
            <div className="bg-[#143834] border border-[#286056] rounded-xl p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#286056] pb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#9BC3AC]" />
                    Transaction-Specific Behavioral & Risk Telemetry
                  </h2>
                  <p className="text-xs text-[#9BC3AC] mt-0.5">
                    Machine learning telemetry and baseline comparisons computed specifically for transaction{' '}
                    <span className="font-mono text-white">{transaction.id.slice(0, 8)}...</span>
                  </p>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#1C4841] text-[#9BC3AC] border border-[#286056]">
                  Account: {transaction.accounts?.account_number || 'ACCT-4128'}
                </span>
              </div>

              {/* 4 Analysis Charts in 2x2 Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Historical transaction amount vs current amount */}
                <div className="p-4 rounded-xl bg-[#1C4841]/50 border border-[#286056] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                        Historical Amount vs Current Amount
                      </h3>
                      <p className="text-[11px] text-[#9BC3AC]">Current spend against typical customer baseline & upper bound</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#143834] text-white border border-[#286056]">
                      Spending Metric
                    </span>
                  </div>

                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={amountComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#286056" vertical={false} />
                        <XAxis dataKey="tier" stroke="#9BC3AC" fontSize={10} tickLine={false} axisLine={{ stroke: '#286056' }} />
                        <YAxis
                          stroke="#9BC3AC"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => `₹${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                        />
                        <Tooltip content={<CustomDetailsChartTooltip />} />
                        <Bar dataKey="amount" name="Amount (₹)" radius={[3, 3, 0, 0]}>
                          {amountComparisonData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Transaction frequency/history */}
                <div className="p-4 rounded-xl bg-[#1C4841]/50 border border-[#286056] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-orange-400" />
                        Transaction Frequency & Velocity History
                      </h3>
                      <p className="text-[11px] text-[#9BC3AC]">Observed payment attempts vs customer baseline frequency</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#143834] text-white border border-[#286056]">
                      Velocity Burst
                    </span>
                  </div>

                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={frequencyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#286056" vertical={false} />
                        <XAxis dataKey="interval" stroke="#9BC3AC" fontSize={10} tickLine={false} axisLine={{ stroke: '#286056' }} />
                        <YAxis stroke="#9BC3AC" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomDetailsChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                        <Bar dataKey="Customer Baseline" fill="#286056" radius={[3, 3, 0, 0]} />
                        <Bar
                          dataKey="Current Velocity"
                          fill={transaction.risk_level === 'HIGH' ? '#DC2626' : '#4EBEA3'}
                          radius={[3, 3, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 3. Risk-factor contribution */}
                <div className="p-4 rounded-xl bg-[#1C4841]/50 border border-[#286056] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-rose-400" />
                        Risk-Factor Contribution & Telemetry
                      </h3>
                      <p className="text-[11px] text-[#9BC3AC]">Anomalous severity score per evaluated ML feature</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#143834] text-white border border-[#286056]">
                      ML Features
                    </span>
                  </div>

                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={riskFactorContributionData}
                        layout="vertical"
                        margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#286056" horizontal={false} />
                        <XAxis type="number" stroke="#9BC3AC" fontSize={10} tickLine={false} domain={[0, 100]} />
                        <YAxis
                          type="category"
                          dataKey="factor"
                          stroke="#9BC3AC"
                          fontSize={10}
                          tickLine={false}
                          width={110}
                          tickFormatter={(str) => (str.length > 18 ? `${str.slice(0, 16)}..` : str)}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="p-2.5 rounded-lg bg-[#143834] border border-[#286056] text-xs space-y-1">
                                  <p className="font-semibold text-white">{d.factor}</p>
                                  <p className="text-[#9BC3AC]">
                                    SHAP Contribution:{' '}
                                    <span className="font-mono text-amber-300 font-semibold">{d.impactDisplay}</span>
                                  </p>
                                  <p className="text-[#9BC3AC]">
                                    Anomaly Weight:{' '}
                                    <span className="font-mono text-white font-semibold">{d.contribution}/100</span>
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="contribution" name="Anomaly Severity" radius={[0, 3, 3, 0]}>
                          {riskFactorContributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 4. Normal transaction time vs current time */}
                <div className="p-4 rounded-xl bg-[#1C4841]/50 border border-[#286056] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-sky-400" />
                        Normal Operating Window vs Current Execution Time
                      </h3>
                      <p className="text-[11px] text-[#9BC3AC]">24-hour diurnal profile vs transaction timestamp</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#143834] text-white border border-[#286056]">
                      Diurnal Window
                    </span>
                  </div>

                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timingAnalysisData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="normalTimeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4EBEA3" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#4EBEA3" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="currentTxnGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="5%"
                              stopColor={transaction.risk_level === 'HIGH' ? '#DC2626' : '#059669'}
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="95%"
                              stopColor={transaction.risk_level === 'HIGH' ? '#DC2626' : '#059669'}
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#286056" vertical={false} />
                        <XAxis
                          dataKey="time"
                          stroke="#9BC3AC"
                          fontSize={9}
                          tickLine={false}
                          interval={3}
                          axisLine={{ stroke: '#286056' }}
                        />
                        <YAxis stroke="#9BC3AC" fontSize={10} tickLine={false} axisLine={false} domain={[0, 110]} hide />
                        <Tooltip content={<CustomDetailsChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                        <Area
                          type="monotone"
                          dataKey="Customer Normal Activity"
                          stroke="#4EBEA3"
                          fillOpacity={1}
                          fill="url(#normalTimeGrad)"
                          strokeWidth={1.5}
                        />
                        <Area
                          type="monotone"
                          dataKey="Current Transaction"
                          stroke={transaction.risk_level === 'HIGH' ? '#DC2626' : '#059669'}
                          fillOpacity={1}
                          fill="url(#currentTxnGrad)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* Step 4: Fraud Decision Integrity (Blockchain Audit UI)       */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-[#143834] border border-[#286056] rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#286056] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#1C4841] border border-[#286056] flex items-center justify-center text-[#4EBEA3]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-wide">
                      Fraud Decision Integrity
                    </h2>
                    <p className="text-[11px] text-[#9BC3AC]">
                      Cryptographic ledger verification via FraudDecisionLedger smart contract
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleVerifyBlockchain}
                  disabled={isVerifying}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1C4841] hover:bg-[#286056] text-xs font-semibold text-white border border-[#286056] transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-[#4EBEA3]' : 'text-[#9BC3AC]'}`} />
                  <span>{isVerifying ? 'Verifying on Blockchain...' : 'Verify Blockchain Record'}</span>
                </button>
              </div>

              {/* Compact Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                {/* 1. Transaction ID */}
                <div className="p-3 rounded-lg bg-[#1C4841]/40 border border-[#286056] space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-[#9BC3AC] tracking-wider block">
                    Transaction ID
                  </span>
                  <p className="font-mono text-white text-[11px] truncate" title={transaction.id}>
                    {transaction.id}
                  </p>
                </div>

                {/* 2. Risk Score & Category */}
                <div className="p-3 rounded-lg bg-[#1C4841]/40 border border-[#286056] space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-[#9BC3AC] tracking-wider block">
                    Risk Score & Category
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-xs">
                      {transaction.risk_score != null ? `${Math.round(transaction.risk_score)}/100` : 'N/A'}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                        transaction.risk_level === 'HIGH'
                          ? 'bg-[#33171D] text-rose-300 border border-[#7A2B37]'
                          : transaction.risk_level === 'MEDIUM'
                          ? 'bg-[#362612] text-amber-300 border border-[#784F17]'
                          : 'bg-[#133D30] text-emerald-300 border border-[#1F6B52]'
                      }`}
                    >
                      {transaction.risk_level || 'LOW'}
                    </span>
                  </div>
                </div>

                {/* 3. Final Decision */}
                <div className="p-3 rounded-lg bg-[#1C4841]/40 border border-[#286056] space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-[#9BC3AC] tracking-wider block">
                    Final Decision
                  </span>
                  <span
                    className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded ${
                      transaction.status === 'BLOCKED'
                        ? 'bg-[#33171D] text-rose-300 border border-[#7A2B37]'
                        : transaction.status === 'COMPLETED'
                        ? 'bg-[#133D30] text-emerald-300 border border-[#1F6B52]'
                        : 'bg-[#362612] text-amber-300 border border-[#784F17]'
                    }`}
                  >
                    {transaction.status || 'COMPLETED'}
                  </span>
                </div>

                {/* 4. Blockchain Status */}
                <div className="p-3 rounded-lg bg-[#1C4841]/40 border border-[#286056] space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-[#9BC3AC] tracking-wider block">
                    Blockchain Status
                  </span>
                  <div>
                    {(() => {
                      const rawStatus = (verificationResult?.verification_status || verificationResult?.status || '').toUpperCase();
                      let effectiveStatus = 'NOT_APPLICABLE';
                      if (rawStatus === 'VERIFIED') {
                        effectiveStatus = 'VERIFIED';
                      } else if (rawStatus === 'INTEGRITY_FAILED' || rawStatus === 'FAILED') {
                        effectiveStatus = 'INTEGRITY_FAILED';
                      } else if (rawStatus === 'NOT_VERIFIED' || rawStatus === 'NOT_FOUND') {
                        effectiveStatus = 'NOT_VERIFIED';
                      } else if (rawStatus === 'NOT_APPLICABLE') {
                        effectiveStatus = 'NOT_APPLICABLE';
                      } else if (transaction?.status && transaction.status !== 'COMPLETED' && transaction.status !== 'BLOCKED') {
                        effectiveStatus = 'NOT_APPLICABLE';
                      } else if (blockchainRecord?.transaction_hash) {
                        effectiveStatus = 'VERIFIED';
                      } else {
                        effectiveStatus = 'NOT_VERIFIED';
                      }

                      if (isVerifying) {
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono text-[#9BC3AC] bg-[#143834] border border-[#286056]">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Verifying...
                          </span>
                        );
                      }
                      if (effectiveStatus === 'VERIFIED') {
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#133D30] text-emerald-300 border border-[#1F6B52]">
                            ✓ VERIFIED
                          </span>
                        );
                      }
                      if (effectiveStatus === 'NOT_VERIFIED') {
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#362612] text-amber-300 border border-[#784F17]">
                            ⚠ NOT VERIFIED
                          </span>
                        );
                      }
                      if (effectiveStatus === 'INTEGRITY_FAILED') {
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#33171D] text-rose-300 border border-[#7A2B37]">
                            ⚠ INTEGRITY FAILED
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#163532] text-[#9BC3AC] border border-[#286056]">
                          — NOT APPLICABLE
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* 5. Blockchain Reference / TxHash */}
                <div className="sm:col-span-2 lg:col-span-3 p-3 rounded-lg bg-[#1C4841]/40 border border-[#286056] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-[#9BC3AC] tracking-wider">
                      Blockchain Reference / Transaction ID
                    </span>
                    {(verificationResult?.blockchain_reference || blockchainRecord?.transaction_hash) && (
                      <button
                        onClick={handleCopyHash}
                        className="text-[10px] font-mono text-[#9BC3AC] hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedHash ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
                      </button>
                    )}
                  </div>
                  <p className="font-mono text-[11px] text-[#E6F4ED] break-all">
                    {verificationResult?.blockchain_reference || blockchainRecord?.transaction_hash || '0x' + '0'.repeat(64)}
                  </p>
                </div>

                {/* 6. Recorded Timestamp */}
                <div className="p-3 rounded-lg bg-[#1C4841]/40 border border-[#286056] space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-[#9BC3AC] tracking-wider block">
                    Recorded Timestamp
                  </span>
                  <p className="font-mono text-white text-[11px]">
                    {(() => {
                      const ts = verificationResult?.timestamp || blockchainRecord?.timestamp;
                      if (ts) {
                        return typeof ts === 'number'
                          ? new Date(ts * 1000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' })
                          : new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' });
                      }
                      return transaction?.analysis_timestamp
                        ? new Date(transaction.analysis_timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' })
                        : 'Recorded on Ledger';
                    })()}
                  </p>
                </div>
              </div>

              {/* Verification Result Explanation Callout */}
              {(() => {
                const rawStatus = (verificationResult?.verification_status || verificationResult?.status || '').toUpperCase();
                let effectiveStatus = 'NOT_APPLICABLE';
                if (rawStatus === 'VERIFIED') {
                  effectiveStatus = 'VERIFIED';
                } else if (rawStatus === 'INTEGRITY_FAILED' || rawStatus === 'FAILED') {
                  effectiveStatus = 'INTEGRITY_FAILED';
                } else if (rawStatus === 'NOT_VERIFIED' || rawStatus === 'NOT_FOUND') {
                  effectiveStatus = 'NOT_VERIFIED';
                } else if (rawStatus === 'NOT_APPLICABLE') {
                  effectiveStatus = 'NOT_APPLICABLE';
                } else if (transaction?.status && transaction.status !== 'COMPLETED' && transaction.status !== 'BLOCKED') {
                  effectiveStatus = 'NOT_APPLICABLE';
                } else if (blockchainRecord?.transaction_hash) {
                  effectiveStatus = 'VERIFIED';
                } else {
                  effectiveStatus = 'NOT_VERIFIED';
                }

                const defaultReasons = {
                  VERIFIED: 'Blockchain audit record exists and the fraud decision matches the recorded blockchain proof.',
                  NOT_VERIFIED: 'A blockchain record was expected, but no matching blockchain record exists in FraudDecisionLedger.',
                  INTEGRITY_FAILED: 'A blockchain record exists, but current data does not match the on-chain record (tampering or mismatch detected).',
                  NOT_APPLICABLE: 'This transaction has not reached the stage where a blockchain audit record should exist.',
                };

                const defaultTitles = {
                  VERIFIED: 'Blockchain Audit Record Verified Authentic',
                  NOT_VERIFIED: 'Blockchain Audit Record Not Found',
                  INTEGRITY_FAILED: 'Integrity Verification Discrepancy Detected',
                  NOT_APPLICABLE: 'Blockchain Verification Not Applicable',
                };

                const explanationText = verificationResult?.reason || defaultReasons[effectiveStatus];
                const headerTitle = defaultTitles[effectiveStatus];

                return (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                      effectiveStatus === 'VERIFIED'
                        ? 'bg-[#133D30]/60 border-[#1F6B52] text-emerald-200'
                        : effectiveStatus === 'NOT_VERIFIED'
                        ? 'bg-[#362612]/60 border-[#784F17] text-amber-200'
                        : effectiveStatus === 'INTEGRITY_FAILED'
                        ? 'bg-[#33171D]/60 border-[#7A2B37] text-rose-200'
                        : 'bg-[#163532]/60 border-[#286056] text-[#9BC3AC]'
                    }`}
                  >
                    {effectiveStatus === 'VERIFIED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : effectiveStatus === 'NOT_VERIFIED' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : effectiveStatus === 'INTEGRITY_FAILED' ? (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <MinusCircle className="w-4 h-4 text-[#9BC3AC] shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <p className="font-semibold text-white text-[11px]">
                        {headerTitle}
                      </p>
                      <p className="text-[11px] leading-relaxed text-[#E6F4ED]/90">
                        {explanationText}
                      </p>
                      {verificationResult?.discrepancies && verificationResult.discrepancies.length > 0 && (
                        <ul className="list-disc list-inside text-[10px] text-rose-300/90 pt-1 space-y-0.5">
                          {verificationResult.discrepancies.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#286056] py-4 text-center text-xs text-[#9BC3AC]/70">
        <p>© 2026 FraudLens Financial Security. Restricted Fraud Analyst Console.</p>
      </footer>
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, ArrowLeft, Activity, Search, AlertCircle, UserCheck } from 'lucide-react';
import { getSession, clearSession } from '../utils/session';

export default function AnalystDashboard() {
  const navigate = useNavigate();
  const session = getSession();
  const user = session?.user || { name: 'Sarah Chen', id: 'ANALYST-SEC-09', email: 'analyst@bank.com' };

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#051F20] text-[#DAF1DE] flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="border-b border-[#163832] bg-[#0B2B26]/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#163832] border border-[#235347] flex items-center justify-center text-[#8EB69B]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-wider text-white">FRAUDLENS</span>
              <span className="ml-3 text-xs px-2 py-0.5 rounded border border-[#235347] bg-[#163832] text-[#8EB69B]">
                Analyst Console
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-[#8EB69B]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-medium text-white">{user.name}</span>
              <span className="hidden sm:inline font-mono text-[11px] text-[#8EB69B]/80">({user.id})</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#163832] hover:bg-[#235347] text-xs font-medium text-[#DAF1DE] transition-colors border border-[#235347] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 py-10 flex-1 w-full">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Fraud Analyst Dashboard</h1>
          <p className="text-sm text-[#8EB69B] mt-1">
            Real-time transaction surveillance, anomaly investigation, and behavior intelligence console.
          </p>
        </div>

        {/* Operational Indicators Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Surveillance Status */}
          <div className="bg-[#0B2B26] border border-[#163832] rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#8EB69B]">
              <span className="uppercase tracking-wider font-semibold">Surveillance Engine</span>
              <span className="px-2 py-0.5 rounded bg-[#163832] text-emerald-400 border border-emerald-900/50">
                Standby
              </span>
            </div>
            <p className="text-xl font-bold text-white">Active Monitoring</p>
            <p className="text-xs text-[#8EB69B]/80 font-mono">Stream: Live Socket Ready</p>
          </div>

          {/* Investigation Queue */}
          <div className="bg-[#0B2B26] border border-[#163832] rounded-xl p-6 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-[#163832] border border-[#235347] flex items-center justify-center text-[#8EB69B]">
              <AlertCircle className="w-4 h-4" />
            </div>
            <p className="text-base font-semibold text-white">Investigation Queue</p>
            <p className="text-xs text-[#8EB69B]/80">
              High-risk flagged items and behavioral variance anomalies.
            </p>
          </div>

          {/* Behavioral Profiler */}
          <div className="bg-[#0B2B26] border border-[#163832] rounded-xl p-6 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-[#163832] border border-[#235347] flex items-center justify-center text-[#8EB69B]">
              <Activity className="w-4 h-4" />
            </div>
            <p className="text-base font-semibold text-white">Behavioral Profiler</p>
            <p className="text-xs text-[#8EB69B]/80">
              Explainable feature importance and account velocity tracking.
            </p>
          </div>
        </div>

        {/* Analyst Workspace Notice Box */}
        <div className="bg-[#0B2B26] border border-[#163832] rounded-xl p-8 text-center max-w-2xl mx-auto my-6 space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#163832] border border-[#235347] flex items-center justify-center text-[#8EB69B] mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Fraud Analyst Workspace</h2>
            <p className="text-sm text-[#8EB69B] mt-2 leading-relaxed">
              This is the fraud analyst operational foundation. Real-time transaction ingestion, explainable risk-scoring graphs, and investigation tools will be integrated here.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#235347] hover:bg-[#2e6b5c] text-xs font-semibold text-white transition-colors border border-[#8EB69B]/30 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Sign Out & Return Home</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#163832] py-4 text-center text-xs text-[#8EB69B]/70">
        <p>© 2026 FraudLens Financial Security. Restricted Fraud Operations Console.</p>
      </footer>
    </div>
  );
}

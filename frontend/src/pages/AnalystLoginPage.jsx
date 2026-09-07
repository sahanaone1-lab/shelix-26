import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, ArrowLeft, KeyRound, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { loginAnalyst } from '../services/api';
import { setSession } from '../utils/session';

export default function AnalystLoginPage() {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState('analyst@bank.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const result = await loginAnalyst(employeeId, password);

    if (result.success && result.data) {
      setSession(result.data.user, 'analyst');
      navigate('/analyst');
    } else {
      setErrorMessage(result.error || 'Authentication failed. Please check your employee credentials.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#051F20] text-[#DAF1DE] flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-[#163832] bg-[#0B2B26]/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-[#163832] border border-[#235347] flex items-center justify-center text-[#8EB69B]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-wider text-white">FRAUDLENS</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-[#8EB69B] hover:text-[#DAF1DE] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Portal Selection</span>
          </Link>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md mx-auto px-6 py-12 w-full flex-1 flex flex-col justify-center">
        <div className="bg-[#0B2B26] border border-[#163832] rounded-2xl p-8 shadow-2xl">
          {/* Card Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#163832] border border-[#235347] flex items-center justify-center text-[#8EB69B] mx-auto mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white">Fraud Analyst Login</h1>
            <p className="text-xs text-[#8EB69B] mt-1">
              Internal risk assessment & investigation terminal
            </p>
          </div>

          {/* Clean Error Alert */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-950/80 border border-rose-800/80 flex items-start gap-3 text-xs text-rose-200 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#8EB69B] mb-2 uppercase tracking-wider">
                Employee ID / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8EB69B]/70">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="analyst@bank.com or SEC-ID"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#163832] border border-[#235347] text-white placeholder-[#8EB69B]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#8EB69B]/50 focus:border-[#8EB69B] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8EB69B] mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8EB69B]/70">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#163832] border border-[#235347] text-white placeholder-[#8EB69B]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#8EB69B]/50 focus:border-[#8EB69B] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-5 rounded-xl bg-[#235347] hover:bg-[#2e6b5c] active:bg-[#1c4339] disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 border border-[#8EB69B]/30 cursor-pointer shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 text-[#8EB69B] animate-spin" />
                  <span>Verifying Terminal Access...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-[#8EB69B]" />
                  <span>Analyst Login</span>
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials Info */}
          <div className="mt-6 pt-5 border-t border-[#163832] text-center space-y-2">
            <div className="inline-block px-3 py-1 rounded bg-[#163832]/60 border border-[#235347]/60 text-[11px] text-[#8EB69B]">
              <span className="text-[#DAF1DE] font-medium">Demo:</span> analyst@bank.com / password123
            </div>
            <p className="text-[11px] text-[#8EB69B]/70">
              Restricted access. All analyst actions are audited and logged for compliance.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#163832] py-4 text-center text-xs text-[#8EB69B]/70">
        <p>© 2026 FraudLens Financial Security. SOC-2 Certified Terminal.</p>
      </footer>
    </div>
  );
}

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
    <div className="min-h-screen bg-[#0D2322] text-[#E6F4ED] flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-[#286056] bg-[#143834]/90 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-[#1C4841] border border-[#286056] flex items-center justify-center text-[#9BC3AC]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-wider text-white">FRAUDLENS</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-[#9BC3AC] hover:text-[#E6F4ED] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Portal Selection</span>
          </Link>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md mx-auto px-6 py-12 w-full flex-1 flex flex-col justify-center">
        <div className="bg-[#143834] border border-[#286056] rounded-xl p-8">
          {/* Card Header */}
          <div className="text-center mb-7">
            <div className="w-11 h-11 rounded-lg bg-[#1C4841] border border-[#286056] flex items-center justify-center text-[#9BC3AC] mx-auto mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white">Fraud Analyst Login</h1>
            <p className="text-xs text-[#9BC3AC] mt-1">
              Internal risk assessment & investigation terminal
            </p>
          </div>

          {/* Restrained Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-[#2D171B] border border-[#7A2B37] flex items-start gap-2.5 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#9BC3AC] mb-1.5 uppercase tracking-wider">
                Employee ID / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9BC3AC]/70">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="analyst@bank.com or SEC-ID"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1C4841] border border-[#286056] text-white placeholder-[#9BC3AC]/40 text-xs sm:text-sm focus:outline-none focus:border-[#3D8577] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#9BC3AC] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9BC3AC]/70">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1C4841] border border-[#286056] text-white placeholder-[#9BC3AC]/40 text-xs sm:text-sm focus:outline-none focus:border-[#3D8577] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-[#286056] hover:bg-[#33786D] active:bg-[#1E5047] disabled:opacity-60 text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 border border-[#3D8577] cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 text-[#9BC3AC] animate-spin" />
                  <span>Verifying Terminal Access...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-[#9BC3AC]" />
                  <span>Analyst Login</span>
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials Info */}
          <div className="mt-6 pt-4 border-t border-[#286056] text-center space-y-2">
            <div className="inline-block px-3 py-1 rounded bg-[#1C4841] border border-[#286056] text-[11px] text-[#9BC3AC]">
              <span className="text-white font-medium">Demo:</span> analyst@bank.com / password123
            </div>
            <p className="text-[11px] text-[#9BC3AC]/70">
              Restricted access. All analyst actions are audited and logged for compliance.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#286056] py-4 text-center text-xs text-[#9BC3AC]/70">
        <p>© 2026 FraudLens Financial Security. SOC-2 Certified Terminal.</p>
      </footer>
    </div>
  );
}

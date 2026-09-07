import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ShieldCheck, ArrowRight, Lock } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#051F20] text-[#DAF1DE] flex flex-col justify-between">
      {/* Top Brand Bar */}
      <header className="border-b border-[#163832] bg-[#0B2B26]/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#163832] border border-[#235347] flex items-center justify-center text-[#8EB69B]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-wider text-white">FRAUDLENS</span>
              <span className="hidden sm:inline-block ml-3 text-xs px-2.5 py-0.5 rounded border border-[#235347] bg-[#163832] text-[#8EB69B]">
                Bank-Grade Security
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#8EB69B]">
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden md:inline">End-to-End Encrypted Portal</span>
          </div>
        </div>
      </header>

      {/* Main Entry Section */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        {/* Hero Title & Description */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B2B26] border border-[#235347] text-xs text-[#8EB69B] mb-4">
            <span className="w-2 h-2 rounded-full bg-[#8EB69B] animate-pulse"></span>
            Financial Security Platform
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
            FRAUDLENS
          </h1>
          <p className="text-lg sm:text-xl font-medium text-[#8EB69B] mb-4">
            Explainable Behaviour-Based Financial Fraud Detection
          </p>
          <p className="text-sm text-[#DAF1DE]/80 leading-relaxed">
            Protect transactions. Detect suspicious behaviour. Investigate financial fraud.
          </p>
        </div>

        {/* Two Separate Login Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
          {/* Customer / User Card */}
          <div className="bg-[#0B2B26] border border-[#163832] hover:border-[#235347] rounded-2xl p-8 flex flex-col justify-between transition-all duration-200 shadow-xl hover:shadow-2xl hover:shadow-[#051F20]/50 group">
            <div>
              <div className="w-14 h-14 rounded-xl bg-[#163832] border border-[#235347] flex items-center justify-center text-[#8EB69B] mb-6 group-hover:scale-105 transition-transform">
                <User className="w-7 h-7" />
              </div>
              <div className="mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#8EB69B]">
                  Customer / User
                </span>
                <h2 className="text-2xl font-bold text-white mt-1">
                  Customer Portal
                </h2>
              </div>
              <p className="text-sm text-[#DAF1DE]/75 leading-relaxed mb-6">
                Access your account and initiate transactions.
              </p>
            </div>

            <div>
              <button
                onClick={() => navigate('/login/customer')}
                className="w-full py-3.5 px-5 rounded-xl bg-[#235347] hover:bg-[#2e6b5c] active:bg-[#1c4339] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 border border-[#8EB69B]/30 cursor-pointer shadow-md"
              >
                <span>Customer Login</span>
                <ArrowRight className="w-4 h-4 text-[#8EB69B] group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Fraud Analyst Card */}
          <div className="bg-[#0B2B26] border border-[#163832] hover:border-[#235347] rounded-2xl p-8 flex flex-col justify-between transition-all duration-200 shadow-xl hover:shadow-2xl hover:shadow-[#051F20]/50 group">
            <div>
              <div className="w-14 h-14 rounded-xl bg-[#163832] border border-[#235347] flex items-center justify-center text-[#8EB69B] mb-6 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#8EB69B]">
                  Security Operations
                </span>
                <h2 className="text-2xl font-bold text-white mt-1">
                  Fraud Analyst
                </h2>
              </div>
              <p className="text-sm text-[#DAF1DE]/75 leading-relaxed mb-6">
                Monitor transactions and investigate suspicious activity.
              </p>
            </div>

            <div>
              <button
                onClick={() => navigate('/login/analyst')}
                className="w-full py-3.5 px-5 rounded-xl bg-[#235347] hover:bg-[#2e6b5c] active:bg-[#1c4339] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 border border-[#8EB69B]/30 cursor-pointer shadow-md"
              >
                <span>Analyst Login</span>
                <ArrowRight className="w-4 h-4 text-[#8EB69B] group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#163832] py-4 text-center text-xs text-[#8EB69B]/70">
        <p>© 2026 FraudLens Financial Security. Authorized Personnel and Customers Only.</p>
      </footer>
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ShieldCheck, ArrowRight, Lock } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0D2322] text-[#E6F4ED] flex flex-col justify-between">
      {/* Top Brand Bar */}
      <header className="border-b border-[#286056] bg-[#143834]/90 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1C4841] border border-[#286056] flex items-center justify-center text-[#9BC3AC]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-wider text-white">FRAUDLENS</span>
              <span className="hidden sm:inline-block ml-3 text-[11px] px-2 py-0.5 rounded border border-[#286056] bg-[#1C4841] text-[#9BC3AC] font-medium">
                Bank-Grade Security
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#9BC3AC]">
            <Lock className="w-3.5 h-3.5 text-[#9BC3AC]" />
            <span className="hidden md:inline font-medium">End-to-End Encrypted Portal</span>
          </div>
        </div>
      </header>

      {/* Main Entry Section */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        {/* Hero Title & Description */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#143834] border border-[#286056] text-xs text-[#9BC3AC] mb-4 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#9BC3AC]"></span>
            Financial Security Platform
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
            FRAUDLENS
          </h1>
          <p className="text-base sm:text-lg font-medium text-[#9BC3AC] mb-3">
            Explainable Behaviour-Based Financial Fraud Detection
          </p>
          <p className="text-sm text-[#E6F4ED]/80 leading-relaxed">
            Protect transactions. Detect suspicious behaviour. Investigate financial fraud.
          </p>
        </div>

        {/* Two Separate Login Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
          {/* Customer / User Card */}
          <div className="bg-[#143834] border border-[#286056] hover:border-[#3D8577] rounded-xl p-7 flex flex-col justify-between transition-colors">
            <div>
              <div className="w-11 h-11 rounded-lg bg-[#1C4841] border border-[#286056] flex items-center justify-center text-[#9BC3AC] mb-5">
                <User className="w-5 h-5" />
              </div>
              <div className="mb-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#9BC3AC]">
                  Customer / User
                </span>
                <h2 className="text-xl font-bold text-white mt-1">
                  Customer Portal
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#E6F4ED]/80 leading-relaxed mb-6">
                Access your account and initiate transactions.
              </p>
            </div>

            <div>
              <button
                onClick={() => navigate('/login/customer')}
                className="w-full py-3 px-4 rounded-lg bg-[#1C4841] hover:bg-[#286056] active:bg-[#153B35] text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 border border-[#286056] hover:border-[#3D8577] cursor-pointer"
              >
                <span>Customer Login</span>
                <ArrowRight className="w-4 h-4 text-[#9BC3AC]" />
              </button>
            </div>
          </div>

          {/* Fraud Analyst Card */}
          <div className="bg-[#143834] border border-[#286056] hover:border-[#3D8577] rounded-xl p-7 flex flex-col justify-between transition-colors">
            <div>
              <div className="w-11 h-11 rounded-lg bg-[#1C4841] border border-[#286056] flex items-center justify-center text-[#9BC3AC] mb-5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="mb-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#9BC3AC]">
                  Security Operations
                </span>
                <h2 className="text-xl font-bold text-white mt-1">
                  Fraud Analyst
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#E6F4ED]/80 leading-relaxed mb-6">
                Monitor transactions and investigate suspicious activity.
              </p>
            </div>

            <div>
              <button
                onClick={() => navigate('/login/analyst')}
                className="w-full py-3 px-4 rounded-lg bg-[#286056] hover:bg-[#33786D] active:bg-[#1E5047] text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 border border-[#3D8577] cursor-pointer"
              >
                <span>Analyst Login</span>
                <ArrowRight className="w-4 h-4 text-[#9BC3AC]" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#286056] py-4 text-center text-xs text-[#9BC3AC]/70">
        <p>© 2026 FraudLens Financial Security. Authorized Personnel and Customers Only.</p>
      </footer>
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, ShieldCheck, ArrowLeft, CreditCard, Send } from 'lucide-react';
import { getSession, clearSession } from '../utils/session';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const session = getSession();
  const user = session?.user || { name: 'Customer', email: 'customer@bank.com', id: 'CUST-4128' };

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0D2322] text-[#E6F4ED] flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="border-b border-[#286056] bg-[#143834]/90 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1C4841] border border-[#286056] flex items-center justify-center text-[#9BC3AC]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-wider text-white">FRAUDLENS</span>
              <span className="ml-3 text-[11px] px-2 py-0.5 rounded border border-[#286056] bg-[#1C4841] text-[#9BC3AC] font-medium">
                Customer Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-[#9BC3AC]">
              <div className="w-6 h-6 rounded-full bg-[#1C4841] border border-[#286056] flex items-center justify-center text-white text-[11px]">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="hidden sm:inline font-medium text-white">{user.name || user.email}</span>
              <span className="hidden md:inline text-[11px] text-[#9BC3AC]/70">({user.email})</span>
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

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Customer Portal</h1>
          <p className="text-xs sm:text-sm text-[#9BC3AC] mt-1">
            Welcome back, {user.name}. Manage your accounts, review activity, and initiate secure transfers.
          </p>
        </div>

        {/* Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {/* Account Status */}
          <div className="bg-[#143834] border border-[#286056] rounded-xl p-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#9BC3AC]">
              <span className="uppercase tracking-wider font-semibold text-[11px]">Account Status</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#133D30] text-[#34D399] border border-[#1F7A5E]">
                Protected
              </span>
            </div>
            <p className="text-lg font-bold text-white">Standard Checking</p>
            <p className="text-xs text-[#9BC3AC]/80 font-mono">Account No: •••• •••• 4128</p>
          </div>

          {/* Quick Action 1 */}
          <div className="bg-[#143834] border border-[#286056] rounded-xl p-5 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1C4841] border border-[#286056] flex items-center justify-center text-[#9BC3AC]">
              <Send className="w-4 h-4" />
            </div>
            <p className="text-sm font-semibold text-white">Initiate Transaction</p>
            <p className="text-xs text-[#9BC3AC]/80 leading-relaxed">
              Transfer funds securely with continuous behavioural verification.
            </p>
          </div>

          {/* Quick Action 2 */}
          <div className="bg-[#143834] border border-[#286056] rounded-xl p-5 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1C4841] border border-[#286056] flex items-center justify-center text-[#9BC3AC]">
              <CreditCard className="w-4 h-4" />
            </div>
            <p className="text-sm font-semibold text-white">Card Controls</p>
            <p className="text-xs text-[#9BC3AC]/80 leading-relaxed">
              Manage real-time limits and geo-security locks on cards.
            </p>
          </div>
        </div>

        {/* Portal Notice Box */}
        <div className="bg-[#143834] border border-[#286056] rounded-xl p-6 text-center max-w-xl mx-auto my-6 space-y-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#1C4841] border border-[#286056] flex items-center justify-center text-[#9BC3AC] mx-auto">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Customer Portal Workspace</h2>
            <p className="text-xs sm:text-sm text-[#9BC3AC] mt-1.5 leading-relaxed">
              This is the customer portal foundation. Transaction initiation workflows, behavioral verification checkpoints, and account views will be integrated here.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#286056] hover:bg-[#33786D] text-xs font-medium text-white transition-colors border border-[#3D8577] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Sign Out & Return Home</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#286056] py-4 text-center text-xs text-[#9BC3AC]/70">
        <p>© 2026 FraudLens Financial Security. Customer Portal.</p>
      </footer>
    </div>
  );
}

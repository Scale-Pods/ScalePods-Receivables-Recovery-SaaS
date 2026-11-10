import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-zinc-800 bg-[#05060A] text-zinc-400 py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-zinc-800/80">
          
          {/* Brand Col */}
          <div className="col-span-2 space-y-3">
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-[0.18em] text-white font-sans leading-tight">
                RECOVR
              </span>
              <span className="text-[10px] font-mono tracking-wider text-zinc-400 leading-none mt-1">
                Powered by{' '}
                <a
                  href="https://www.scalepods.co/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-purple-400 hover:text-purple-300 hover:underline transition-colors"
                >
                  ScalePods
                </a>
              </span>
            </div>
            
            <p className="text-xs sm:text-sm text-zinc-400 max-w-sm leading-relaxed">
              Autonomous B2B Receivables Recovery Platform. Helping CFOs and credit control teams recover locked cash flow without awkward calls or customer relationship damage.
            </p>

            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-zinc-500">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>SOC2 Type II • ISO 27001 Certified • RBI Compliant</span>
            </div>
          </div>

          {/* Product Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#engine" className="hover:text-white transition-colors">21-Day Engine</a></li>
              <li><a href="#channels" className="hover:text-white transition-colors">WhatsApp Cloud API</a></li>
              <li><a href="#channels" className="hover:text-white transition-colors">Voice AI Call Agent</a></li>
              <li><a href="#engine" className="hover:text-white transition-colors">Day 22 Escalation</a></li>
              <li><a href="#comparison" className="hover:text-white transition-colors">Enterprise Benchmark</a></li>
            </ul>
          </div>

          {/* Integrations Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Integrations
            </h4>
            <ul className="space-y-2 text-xs">
              <li><span className="text-zinc-500">Automated Ledger Sync</span></li>
              <li><span className="text-zinc-500">Zoho Books Connector</span></li>
              <li><span className="text-zinc-500">Razorpay Virtual Accounts</span></li>
              <li><span className="text-zinc-500">SAP & Oracle ERP</span></li>
              <li><span className="text-zinc-500">MSME Samadhaan Portal</span></li>
            </ul>
          </div>

          {/* Legal & Security Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Security & Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#faq" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Data Processing Addendum</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Section 138 Compliance</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">RBI Fair Practices Code</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
          <div>
            © {new Date().getFullYear()} RECOVR Technologies Pvt Ltd. All rights reserved.
          </div>
          <div className="flex items-center gap-2">
            <span>Built for Modern Indian & Global Finance Teams</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

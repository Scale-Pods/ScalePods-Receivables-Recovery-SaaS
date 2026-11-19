import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  CheckCircle2, 
  AlertTriangle, 
  LogOut, 
  RefreshCw,
  Info
} from 'lucide-react';
import { 
  EmailIntegration, 
  getEmailIntegration, 
  getGoogleAuthUrl, 
  disconnectEmailIntegration 
} from '../../lib/emailIntegration';

interface EmailIntegrationCardProps {
  customerUid?: string;
  onToast?: (type: 'success' | 'warning' | 'info', title: string, message?: string) => void;
}

export const EmailIntegrationCard: React.FC<EmailIntegrationCardProps> = ({
  customerUid = 'local_user',
  onToast,
}) => {
  const [integration, setIntegration] = useState<EmailIntegration | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [showConfigNotice, setShowConfigNotice] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const data = await getEmailIntegration(customerUid);
      if (mounted) {
        setIntegration(data);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [customerUid]);

  const handleConnectGoogle = () => {
    setIsConnecting(true);
    const { url, error } = getGoogleAuthUrl(customerUid);

    if (error || !url) {
      setIsConnecting(false);
      setShowConfigNotice(true);
      if (onToast) {
        onToast('warning', 'Google OAuth Setup Required', error || 'Missing Google Client ID in .env');
      }
      return;
    }

    // Redirect to Google OAuth Consent Screen
    window.location.href = url;
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect this mailbox? Automated recovery emails will pause until reconnected.')) {
      return;
    }
    setLoading(true);
    await disconnectEmailIntegration(customerUid);
    setIntegration(null);
    setLoading(false);
    if (onToast) {
      onToast('info', 'Mailbox Disconnected', 'Google Workspace integration was successfully removed.');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#0E0F16] p-5 sm:p-6 shadow-sm transition-all">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-zinc-800/80">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 dark:from-purple-900/30 dark:to-indigo-900/30 border border-purple-200/50 dark:border-purple-800/50 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
              Outreach Mailbox Integration
            </h4>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {loading ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
              <RefreshCw className="w-3 h-3 animate-spin" /> Checking...
            </span>
          ) : integration?.is_active ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected & Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              Not Connected
            </span>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="py-5">
        {integration?.is_active ? (
          /* CONNECTED STATE */
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Google 4-Color Icon */}
              <div className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 shadow-xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                    Google Workspace
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-xs font-mono font-medium text-purple-600 dark:text-purple-400">
                  {integration.connected_email}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleDisconnect}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        ) : (
          /* DISCONNECTED STATE */
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                onClick={handleConnectGoogle}
                disabled={isConnecting}
                className="inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 shadow-sm transition-all cursor-pointer"
              >
                {/* Official Google G Logo */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isConnecting ? 'Redirecting to Google...' : 'Connect Google Workspace'}</span>
              </button>

              <button
                onClick={() => setShowConfigNotice((prev) => !prev)}
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 inline-flex items-center gap-1 self-center"
              >
                <Info className="w-3.5 h-3.5" />
                <span>OAuth Configuration Guide</span>
              </button>
            </div>
          </div>
        )}

        {/* Configuration Notice Accordion */}
        {showConfigNotice && (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Required Environment Configuration for Google OAuth</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
              To enable 1-click Google Workspace connection, add your OAuth Client ID into your <code className="px-1 py-0.5 rounded bg-amber-500/20 font-mono">.env</code>:
            </p>
            <pre className="p-2.5 rounded-lg bg-black/80 text-amber-300 font-mono text-[11px] overflow-x-auto">
{`VITE_GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
VITE_GOOGLE_CLIENT_SECRET="your-client-secret"`}
            </pre>
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              Make sure you have added <code className="font-mono">{window.location.origin}/auth/callback/google</code> to your Google Cloud Console <strong>Authorized redirect URIs</strong>.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, Mail, ShieldCheck } from 'lucide-react';
import { exchangeGoogleAuthCode } from '../lib/emailIntegration';

interface OAuthCallbackHandlerProps {
  onComplete: () => void;
}

export const OAuthCallbackHandler: React.FC<OAuthCallbackHandlerProps> = ({ onComplete }) => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState<string>('Exchanging authorization code with Google...');
  const [connectedEmail, setConnectedEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function handleExchange() {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state'); // customerUid passed through state
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      // 1. Check for errors returned directly by Google
      if (error) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(
            error === 'access_denied'
              ? 'Access was denied or cancelled during Google authorization.'
              : errorDescription || error
          );
        }
        return;
      }

      // 2. Validate code
      if (!code) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage('No authorization code was returned by Google.');
        }
        return;
      }

      // 3. Perform code exchange
      try {
        if (isMounted) {
          setMessage('Validating credentials & saving encrypted refresh token to Supabase...');
        }

        const customerUid = state || 'local_user';
        const redirectUri = `${window.location.origin}/auth/callback/google`;

        const res = await exchangeGoogleAuthCode({
          code,
          customerUid,
          redirectUri,
        });

        if (!isMounted) return;

        if (res.success) {
          setStatus('success');
          setConnectedEmail(res.email || 'accounts@workspace');
          // Auto redirect to dashboard after 2.5s
          setTimeout(() => {
            onComplete();
          }, 2500);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Failed to complete Google OAuth exchange.');
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err.message || 'Unexpected error during OAuth token exchange.');
        }
      }
    }

    handleExchange();

    return () => {
      isMounted = false;
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-[#F8F9FD] dark:bg-[#07080D] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0D0E15] p-6 sm:p-8 shadow-2xl text-center">
        
        {/* PROCESSING STATE */}
        {status === 'processing' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-center mx-auto text-purple-600 dark:text-purple-400">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Connecting Google Workspace
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                {message}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
              <span>Scope: https://www.googleapis.com/auth/gmail.send</span>
            </div>
          </div>
        )}

        {/* SUCCESS STATE */}
        {status === 'success' && (
          <div className="space-y-5 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Mailbox Connected Successfully!
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                Your autonomous recovery notices will now be dispatched natively from:
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-xs font-mono font-bold text-purple-600 dark:text-purple-300">
                <Mail className="w-3.5 h-3.5" />
                <span>{connectedEmail}</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400">
              Redirecting to your dashboard in a moment...
            </p>

            <button
              onClick={onComplete}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white text-xs font-semibold shadow-md shadow-purple-600/30 transition-all cursor-pointer"
            >
              <span>Go to Dashboard Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'error' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Connection Failed
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-200 dark:border-rose-900 leading-relaxed font-mono text-[11px]">
                {errorMessage}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={onComplete}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <span>Return to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

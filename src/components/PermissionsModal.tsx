import React from 'react';
import { Camera, Mic, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type PermissionState, type BrowserType, BROWSER_INSTRUCTIONS } from '@/hooks/use-permissions';

interface PermissionsModalProps {
  state: PermissionState;
  error: string | null;
  browser: BrowserType;
  onRequest: () => void;
}

export function PermissionsModal({ state, error, browser, onRequest }: PermissionsModalProps) {
  const instructions = BROWSER_INSTRUCTIONS[browser];

  if (state === 'granted') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-sm mx-4 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/30 to-primary/5 p-6 text-center border-b border-white/10">
          <div className="flex justify-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
              <Camera className="w-7 h-7 text-primary" />
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
              <Mic className="w-7 h-7 text-primary" />
            </div>
          </div>
          <h2 className="text-xl font-serif font-semibold text-white mb-1">
            {state === 'denied' ? 'Permissions Blocked' : 'Camera & Microphone'}
          </h2>
          <p className="text-sm text-white/60 font-light">
            {state === 'denied'
              ? 'Access was denied. Follow the steps below to unblock.'
              : state === 'error'
              ? error || 'Something went wrong.'
              : 'LoveCall needs access to connect you with your partner.'}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          {state === 'denied' && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-sm font-semibold text-amber-400">{instructions.title}</span>
              </div>
              <ol className="flex flex-col gap-2">
                {instructions.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                    <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/50 shrink-0 mt-0.5 font-mono text-[10px]">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {state === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          {(state === 'idle' || state === 'requesting') && (
            <ul className="flex flex-col gap-3">
              {[
                { icon: <CheckCircle2 className="w-4 h-4 text-green-400" />, text: 'Private, P2P encrypted call' },
                { icon: <CheckCircle2 className="w-4 h-4 text-green-400" />, text: 'No recording, no storage' },
                { icon: <CheckCircle2 className="w-4 h-4 text-green-400" />, text: 'AR effects run locally on your device' },
              ].map(({ icon, text }, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-white/70">
                  {icon}
                  {text}
                </li>
              ))}
            </ul>
          )}

          {state === 'denied' ? (
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl border-white/10 text-white hover:bg-white/10"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh After Enabling
            </Button>
          ) : (
            <Button
              className="w-full h-12 rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_30px_rgba(225,29,72,0.5)] transition-all"
              onClick={onRequest}
              disabled={state === 'requesting'}
            >
              {state === 'requesting' ? (
                <>
                  <div className="w-4 h-4 mr-2 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Waiting for permission...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Allow Camera & Microphone
                </>
              )}
            </Button>
          )}

          <p className="text-center text-xs text-white/30">
            Your browser will show a permission prompt above.
          </p>
        </div>
      </div>
    </div>
  );
}

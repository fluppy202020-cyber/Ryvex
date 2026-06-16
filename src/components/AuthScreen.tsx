import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, User, ShieldAlert, KeyRound, Gamepad2, Compass, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function AuthScreen() {
  const { loginWithGoogle, loginWithEmail, signupWithEmail, resetPassword } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    setAuthLoading(true);

    if (isForgotPassword) {
      if (!email) {
        setErr('Please enter your email to proceed.');
        setAuthLoading(false);
        return;
      }
      try {
        await resetPassword(email);
        setMsg('Recovery link sent! Please inspect your email inbox.');
      } catch (error: any) {
        setErr(error.message || 'Failed to dispatch password recovery email.');
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    if (!email || !password) {
      setErr('Please complete all credential fields.');
      setAuthLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        if (!username || username.trim().length < 3) {
          setErr('Username must comprise at least 3 characters.');
          setAuthLoading(false);
          return;
        }
        await signupWithEmail(email, password, username.trim());
      }
    } catch (error: any) {
      setErr(error.message || 'Authentication error. Please retry.');
    } finally {
      setErr('');
      setAuthLoading(false);
    }
  };

  const triggerGoogleAuth = async () => {
    setErr('');
    setMsg('');
    setAuthLoading(true);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      setErr(error.message || 'Google account pairing failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-obsidian text-zinc-100 flex flex-col items-center justify-center p-4 selection:bg-ryvex-cyan selection:text-obsidian">
      {/* Background ambient decorative nodes */}
      <div className="absolute inset-0 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.05] pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm bg-charcoal border border-zinc-850 p-7 rounded-2xl shadow-2xl relative overflow-hidden"
      >
        {/* Neon accent top ribbon */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-ryvex-cyan via-amber-400 to-ryvex-cyan"></div>
        
        {/* Brand identity */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-zinc-950 px-4 py-2 border border-zinc-900 rounded-xl mb-3">
            <Gamepad2 className="w-5 h-5 text-ryvex-cyan" />
            <span className="font-display font-black text-lg tracking-widest text-white">RYVEX</span>
          </div>
          <p className="font-mono text-[9px] tracking-[0.2em] text-zinc-500 uppercase font-black">Compete • Win • Conquer</p>
        </div>

        {/* Section heading */}
        <h2 className="font-display font-bold text-center text-sm text-zinc-200 tracking-wide uppercase mb-6">
          {isForgotPassword ? 'PASSWORD RECOVERY' : isLogin ? 'SIGN IN COMPETITOR' : 'CREATE ARENA ACCOUNT'}
        </h2>

        {err && (
          <div className="mb-4 bg-red-950/20 border border-red-900/40 p-3 rounded-xl text-[11px] flex items-start gap-2.5 text-red-300">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span className="leading-relaxed">{err}</span>
          </div>
        )}

        {msg && (
          <div className="mb-4 bg-emerald-950/20 border border-emerald-900/40 p-3 rounded-xl text-[11px] flex items-start gap-2.5 text-emerald-300">
            <Compass className="w-4 h-4 shrink-0 mt-0.5 animate-spin text-ryvex-cyan" />
            <span className="leading-relaxed">{msg}</span>
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {!isLogin && !isForgotPassword && (
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Competitor GamerTag</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-550" />
                <input
                  type="text"
                  placeholder="e.g. Shroud"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-ryvex-cyan transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Registered Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-550" />
              <input
                type="email"
                placeholder="you@domain.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-900 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-ryvex-cyan transition-colors"
              />
            </div>
          </div>

          {!isForgotPassword && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Password</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setErr(''); setMsg(''); }}
                    className="text-[10px] text-ryvex-cyan hover:underline hover:text-cyan-400 focus:outline-none"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-550" />
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-ryvex-cyan transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full bg-ryvex-cyan hover:brightness-110 text-obsidian font-display font-black py-3 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {authLoading ? (
              <span className="w-4.5 h-4.5 border-2 border-obsidian border-t-transparent rounded-full animate-spin"></span>
            ) : isForgotPassword ? (
              'RECOVER CREDENTIALS'
            ) : isLogin ? (
              'SIGN IN ARENA'
            ) : (
              'DEPLOY COMPETITOR PROFILE'
            )}
          </button>
        </form>

        {isForgotPassword ? (
          <div className="text-center mt-4">
            <button
              onClick={() => { setIsForgotPassword(false); setErr(''); setMsg(''); }}
              className="text-xs text-zinc-400 hover:text-zinc-200 underline"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-zinc-900"></div>
              <span className="flex-shrink mx-4 text-[9px] text-zinc-550 font-mono font-bold tracking-widest">OR</span>
              <div className="flex-grow border-t border-zinc-900"></div>
            </div>

            <button
              onClick={triggerGoogleAuth}
              disabled={authLoading}
              className="w-full bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 text-zinc-200 font-display font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Google Account Partner Login</span>
            </button>

            <div className="text-center mt-6">
              <p className="text-xs text-zinc-400">
                {isLogin ? "New to the arena?" : "Already registered?"}{' '}
                <button
                  onClick={() => { setIsLogin(!isLogin); setErr(''); setMsg(''); }}
                  className="text-ryvex-cyan hover:underline font-bold"
                >
                  {isLogin ? 'Create Ryvex Profile' : 'Sign In Here'}
                </button>
              </p>
            </div>
          </>
        )}

        {/* Secure notice info */}
        <div className="mt-8 pt-4 border-t border-zinc-900 text-[9px] text-zinc-500 leading-relaxed font-mono">
          <p className="flex items-start gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-zinc-405 shrink-0" />
            <span>
              Registered accounts are bound securely to standard Google structures. Credentials are fully shielded.
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

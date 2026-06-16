import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Coins, Play, Timer, History, ShieldAlert, BadgePlus, AlertCircle, ArrowRightLeft, Sparkles } from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CoinTransaction } from '../types';

export default function AdEarnView() {
  const { user, watchVideoAd, firebaseUser } = useAuth();
  
  const [adLoading, setAdLoading] = useState(false);
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [adSuccessMsg, setAdSuccessMsg] = useState<string | null>(null);
  const [adError, setAdError] = useState<string | null>(null);
  const [ledgerLogs, setLedgerLogs] = useState<CoinTransaction[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);

  // Load ledger history in real-time
  useEffect(() => {
    if (!firebaseUser) return;
    
    setLoadingLedger(true);
    const qLedger = query(
      collection(db, 'transactions'),
      where('userId', '==', firebaseUser.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(qLedger, (snapshot) => {
      const logs: CoinTransaction[] = [];
      snapshot.forEach((doc) => {
        logs.push(doc.data() as CoinTransaction);
      });
      setLedgerLogs(logs);
      setLoadingLedger(false);
    }, (error) => {
      console.error("Ledger query error", error);
      setLoadingLedger(false);
    });

    return () => unsub();
  }, [firebaseUser]);

  // Evaluate cooldown timers on ticks
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const tickCooldown = () => {
      if (!user || !user.lastVideoAd) {
        setCooldownSecs(0);
        return;
      }

      const lastAd = new Date(user.lastVideoAd);
      const now = new Date();
      const diffMs = now.getTime() - lastAd.getTime();
      const cooldownMs = 10 * 1000; // 10 seconds cooldown between ads
      const remainingMs = cooldownMs - diffMs;

      if (remainingMs > 0) {
        setCooldownSecs(Math.ceil(remainingMs / 1000));
      } else {
        setCooldownSecs(0);
      }
    };

    tickCooldown();
    interval = setInterval(tickCooldown, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const triggerAdWatch = async () => {
    if (adLoading || cooldownSecs > 0) return;
    setAdError(null);
    setAdSuccessMsg(null);
    setAdLoading(true);

    try {
      await watchVideoAd();
      setAdSuccessMsg('Commercial stream complete! +0.7 Ryvex Coins credited.');
      setTimeout(() => setAdSuccessMsg(null), 4000);
    } catch (err: any) {
      setAdError(err.message || 'Ad dispatch failed. Please retry.');
    } finally {
      setAdLoading(false);
    }
  };

  const adCount = user?.adWatchCountToday || 0;
  const remainingAds = Math.max(0, 10 - adCount);

  return (
    <div className="space-y-6" id="earn-coins-view">
      {/* Title Header */}
      <div className="flex justify-between items-center bg-zinc-900/40 p-5 rounded-2xl border border-zinc-900">
        <div>
          <h2 className="font-display font-bold text-xl uppercase tracking-tight text-white flex items-center gap-2">
            <Coins className="w-5.25 h-5.25 text-ryvex-cyan" />
            <span>Earn Coin Tokens</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Watch short promotional clips from gaming sponsor streams to fuel your match entries.</p>
        </div>
      </div>

      {/* Rewarded Ads card panel */}
      <div className="bg-charcoal border border-zinc-850/90 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex justify-between items-center pb-5 border-b border-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-850">
              <Play className="w-5 h-5 text-ryvex-cyan animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-zinc-300">Sponsor Ads Lounge</h3>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">Est. return payload: +0.7 / watching</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-zinc-500 font-mono uppercase font-bold tracking-wider">EARNED TODAY</p>
            <span className="font-mono font-black text-sm text-ryvex-cyan mt-0.5 block">
              {Number(adCount * 0.7).toFixed(1)} / 7.0 RP
            </span>
          </div>
        </div>

        {adSuccessMsg && (
          <div className="mt-4 bg-emerald-950/20 border border-emerald-900/40 p-4 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <BadgePlus className="w-4 h-4 text-emerald-400" />
            <span>{adSuccessMsg}</span>
          </div>
        )}

        {adError && (
          <div className="mt-4 bg-red-950/20 border border-red-900/40 p-4 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{adError}</span>
          </div>
        )}

        {/* Ad Viewer action */}
        <div className="mt-5 bg-zinc-950/80 border border-zinc-900 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-cyan-950/40 border border-cyan-900/30 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-ryvex-cyan animate-bounce" />
          </div>
          <h4 className="font-display font-bold text-sm text-zinc-100 mb-1.5">Stream Sponsor Commercial Clip</h4>
          <p className="text-xs text-zinc-500 max-w-xs mb-6">
            Help finance the prize pools of our matches by playing daily sponsor commercials. Limit 10 per day.
          </p>

          {/* Progress Tracker bar */}
          <div className="w-full max-w-xs bg-zinc-900 h-2 rounded-full overflow-hidden mb-6 border border-zinc-850">
            <div 
              className="bg-ryvex-cyan h-full transition-all duration-300"
              style={{ width: `${(adCount / 10) * 100}%` }}
            />
          </div>

          <div className="flex justify-around w-full max-w-sm mb-6 text-xs text-zinc-400 bg-zinc-900/40 border border-zinc-900 py-3 rounded-lg">
            <div>
              <p className="text-[9px] text-zinc-500 uppercase font-mono tracking-wider">Daily Progress</p>
              <p className="font-bold text-zinc-200 mt-0.5">{adCount} / 10 Clips</p>
            </div>
            <div className="border-r border-zinc-800"></div>
            <div>
              <p className="text-[9px] text-zinc-500 uppercase font-mono tracking-wider">Available Slots</p>
              <p className="font-bold text-zinc-200 mt-0.5">{remainingAds} Left</p>
            </div>
          </div>

          {cooldownSecs > 0 ? (
            <button
              disabled
              className="w-full max-w-xs bg-zinc-900 border border-zinc-850 text-zinc-550 font-display font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2"
            >
              <Timer className="w-4 h-4 text-amber-500 animate-spin" />
              <span>SPONSOR CD: WAIT {cooldownSecs}s</span>
            </button>
          ) : adCount >= 10 ? (
            <button
              disabled
              className="w-full max-w-xs bg-zinc-900 border border-red-950 text-zinc-650 font-display font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>COUPON LIMIT FULLY CLAIMED</span>
            </button>
          ) : (
            <button
              onClick={triggerAdWatch}
              disabled={adLoading}
              className="w-full max-w-xs bg-ryvex-cyan hover:brightness-110 text-obsidian font-display font-black py-4 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-cyan-950/20 flex items-center justify-center gap-2"
            >
              {adLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-obsidian border-t-transparent rounded-full animate-spin"></div>
                  <span>INITIALIZING MEDIA PROTOCOLS...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-obsidian fill-current" />
                  <span>PLAY PROMO STREAM (+0.7 CP)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Transaction log panel */}
      <div className="bg-charcoal border border-zinc-850/90 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5 border-b border-zinc-900/60 pb-3">
          <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800">
            <History className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-zinc-300">Coins Ledger History</h3>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">Durable audit ledger of core credits transactions.</p>
          </div>
        </div>

        {loadingLedger ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-zinc-905 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : ledgerLogs.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-zinc-850 rounded-xl text-zinc-550 text-xs font-medium">
            No transactions currently found in wallet records.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
            {ledgerLogs.map((log) => {
              const isGain = log.amount > 0;
              const formattedDate = new Date(log.createdAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div 
                  key={log.transactionId}
                  className="bg-zinc-950/50 border border-zinc-900 p-3.5 rounded-xl flex justify-between items-center hover:bg-zinc-950 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <h4 className="text-xs font-bold text-zinc-300 capitalize truncate">
                      {log.description || log.type.replaceAll('_', ' ')}
                    </h4>
                    <span className="text-[9px] text-zinc-550 font-mono font-medium block mt-0.5">
                      {formattedDate} • ID: {log.transactionId.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`font-mono font-black text-xs ${isGain ? 'text-emerald-500 bg-emerald-950/30 border border-emerald-900/20' : 'text-rose-500 bg-rose-950/30 border border-rose-900/20'} px-2.5 py-0.5 rounded-full block`}>
                      {isGain ? '+' : ''}{log.amount.toFixed(1)} CP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

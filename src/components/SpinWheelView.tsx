import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Gift, Compass, Trophy, Timer, CheckCircle, RefreshCw, Sparkles, Trophy as TrophyIcon, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SpinHistory } from '../types';

// Slices definitions with professional dark-first theme styling
const WHEEL_SECTOR_PRIZES = [
  { amount: 1, label: '1 Coin', color: '#18181b', stroke: '#27272a' },
  { amount: 5, label: '5 Coins', color: '#083344', stroke: '#06b6d4' },
  { amount: 2, label: '2 Coins', color: '#27272a', stroke: '#3f3f46' },
  { amount: 10, label: '10 Coins', color: '#78350f', stroke: '#f59e0b' },
  { amount: 3, label: '3 Coins', color: '#18181b', stroke: '#27272a' },
  { amount: 50, label: '50 RYVEX', color: '#1e1b4b', stroke: '#fbbf24' }, // Ultra Rare
  { amount: 20, label: '20 Coins', color: '#022c22', stroke: '#10b981' }  // Rare
];

export default function SpinWheelView() {
  const { user, spinWheel, firebaseUser } = useAuth();
  
  const [spinning, setSpinning] = useState(false);
  const [winDialog, setWinDialog] = useState<number | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [timeRemainingStr, setTimeRemainingStr] = useState<string | null>(null);
  const [cooldownSecs, setCooldownSecs] = useState<number>(0);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [myHistory, setMyHistory] = useState<SpinHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Load spin history in real-time
  useEffect(() => {
    if (!firebaseUser) return;
    
    setLoadingHistory(true);
    const qSpins = query(
      collection(db, 'spins'),
      where('userId', '==', firebaseUser.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsub = onSnapshot(qSpins, (snapshot) => {
      const logs: SpinHistory[] = [];
      snapshot.forEach((doc) => {
        logs.push(doc.data() as SpinHistory);
      });
      setMyHistory(logs);
      setLoadingHistory(false);
    }, (error) => {
      console.error("Spins query error", error);
      setLoadingHistory(false);
    });

    return () => unsub();
  }, [firebaseUser]);

  // Check spin cooldown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const evalCooldown = () => {
      if (!user || !user.lastSpinWheel) {
        setTimeRemainingStr(null);
        setCooldownSecs(0);
        return;
      }

      const lastSpin = new Date(user.lastSpinWheel);
      const now = new Date();
      const diffMs = now.getTime() - lastSpin.getTime();
      const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours
      const remainingMs = cooldownMs - diffMs;

      if (remainingMs > 0) {
        setCooldownSecs(Math.floor(remainingMs / 1000));
        
        const hrs = Math.floor(remainingMs / (1000 * 60 * 60));
        const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);
        
        setTimeRemainingStr(`${hrs}h ${mins}m ${secs}s`);
      } else {
        setTimeRemainingStr(null);
        setCooldownSecs(0);
      }
    };

    evalCooldown();
    interval = setInterval(evalCooldown, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const triggerSpin = async () => {
    if (spinning || cooldownSecs > 0) return;
    setSpinError(null);
    setSpinning(true);

    try {
      const wonAmount = await spinWheel();

      const sectorIdx = WHEEL_SECTOR_PRIZES.findIndex(p => p.amount === wonAmount);
      const adjustedIdx = sectorIdx !== -1 ? sectorIdx : 0;
      
      const sectorAngle = 360 / 7;
      const targetSectorAngle = adjustedIdx * sectorAngle;
      
      const currentRoundOffset = 360 * 8; // 8 full spins for speed
      const finalAngle = currentRoundOffset + (360 - targetSectorAngle);
      
      setWheelRotation(finalAngle);

      setTimeout(() => {
        setSpinning(false);
        setWinDialog(wonAmount);
      }, 5100);

    } catch (err: any) {
      setSpinning(false);
      setSpinError(err.message || 'Verification rejected spin. Try again.');
      setWheelRotation(0);
    }
  };

  const closeSplash = () => {
    setWinDialog(null);
    setWheelRotation(0);
  };

  return (
    <div className="space-y-6 text-zinc-100" id="lucky-spin-panel">
      {/* Title Header area */}
      <div className="flex justify-between items-center bg-zinc-900/40 p-5 rounded-2xl border border-zinc-900">
        <div>
          <h2 className="font-display font-bold text-xl uppercase tracking-tight text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-ryvex-cyan" />
            <span>Lucky Spin Wheel</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Claim 1 free spin every 24 hours. Boost your tournament credits!</p>
        </div>
      </div>

      {spinError && (
        <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          <span>{spinError}</span>
        </div>
      )}

      {/* Main Wheel Arena Layout container */}
      <div className="bg-charcoal border border-zinc-805/90 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center">
        {/* Subtle background ambient lights */}
        <div className="absolute inset-0 bg-radial-gradient(ellipse_at_center,rgba(6,182,212,0.06),transparent_70%) pointer-events-none" />
        <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Wheel layout */}
        <div className="relative w-80 h-80 rounded-full flex items-center justify-center select-none bg-zinc-950 p-2 border border-zinc-800/80 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
          {/* LED bulbs surrounding the spinner */}
          <div className="absolute inset-1 rounded-full border border-zinc-800 pointer-events-none"></div>
          <div className={`absolute inset-0 rounded-full border-2 border-dashed border-ryvex-cyan/40 pointer-events-none ${spinning ? 'animate-spin' : ''}`} style={{ animationDuration: spinning ? '1.5s' : '12s' }}></div>

          {/* Premium Pointer Pin */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
            <div className="w-7 h-9 bg-gradient-to-b from-amber-400 to-amber-650 rounded-b-lg flex items-center justify-center border border-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
            </div>
            {/* Pointer pin shadow */}
            <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[16px] border-t-amber-650 -mt-1"></div>
          </div>

          {/* Slices container */}
          <div 
            className="w-full h-full rounded-full overflow-hidden transition-transform duration-5000"
            style={{ 
              transform: `rotate(${wheelRotation}deg)`,
              transition: spinning ? 'transform 5.1s cubic-bezier(0.12, 0.88, 0.22, 1)' : 'none'
            }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {WHEEL_SECTOR_PRIZES.map((piece, i) => {
                const totalSegments = 7;
                const angleDegree = 360 / totalSegments;
                const r = 96;
                
                const startAngle = i * angleDegree;
                const endAngle = (i + 1) * angleDegree;
                
                const radStart = (startAngle - 90) * Math.PI / 180;
                const radEnd = (endAngle - 90) * Math.PI / 180;
                
                const x1 = 100 + r * Math.cos(radStart);
                const y1 = 100 + r * Math.sin(radStart);
                const x2 = 100 + r * Math.cos(radEnd);
                const y2 = 100 + r * Math.sin(radEnd);

                const pathData = `M 100 100 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

                const textAngle = startAngle + angleDegree / 2 - 90;
                const textRad = textAngle * Math.PI / 180;
                const textDist = 62;
                const tx = 100 + textDist * Math.cos(textRad);
                const ty = 100 + textDist * Math.sin(textRad);

                const isJackpot = piece.amount === 50;

                return (
                  <g key={i}>
                    {/* Slice */}
                    <path 
                      d={pathData} 
                      fill={piece.color} 
                      stroke="#09090b" 
                      strokeWidth="2"
                    />
                    
                    {/* Gloss border divider */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={piece.stroke}
                      strokeWidth="1"
                      className="opacity-40"
                    />

                    {/* Rich text slanted labels */}
                    <text
                      x={tx}
                      y={ty}
                      fill={isJackpot ? '#f59e0b' : '#f4f4f5'}
                      fontSize={isJackpot ? '9.5' : '8'}
                      fontWeight={isJackpot ? '800' : '600'}
                      fontFamily="Space Grotesk, sans-serif"
                      textAnchor="middle"
                      transform={`rotate(${textAngle + 90}, ${tx}, ${ty})`}
                    >
                      {piece.label}
                    </text>
                  </g>
                );
              })}
              
              {/* Outer border shield */}
              <circle cx="100" cy="100" r="97.5" fill="none" stroke="#27272a" strokeWidth="3" />
              
              {/* Center premium Hub */}
              <circle cx="100" cy="100" r="18" fill="#18181b" stroke="#3f3f46" strokeWidth="2.5" />
              <circle cx="100" cy="100" r="10" fill="#09090b" />
              <circle cx="100" cy="100" r="5" fill="#06b6d4" className="animate-pulse" />
            </svg>
          </div>
        </div>

        {/* Dynamic Launch and Timer Trigger Card */}
        <div className="mt-8 text-center w-full max-w-sm z-10">
          {cooldownSecs > 0 ? (
            <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 flex flex-col justify-center items-center">
              <span className="text-zinc-400 text-xs flex items-center gap-1.5 mb-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full font-mono">
                <Timer className="w-3.5 h-3.5 text-ryvex-cyan animate-pulse" />
                <span>Next Free Spin In</span>
              </span>
              <p className="font-mono text-xl font-bold tracking-wider text-ryvex-cyan">{timeRemainingStr}</p>
            </div>
          ) : (
            <button
              onClick={triggerSpin}
              disabled={spinning}
              className="w-full bg-gradient-to-r from-ryvex-cyan to-cyan-500 text-obsidian font-display font-black tracking-wide py-4 px-6 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-cyan-950/20 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-wait"
            >
              {spinning ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-obsidian" />
                  <span>COMMITTING SPIN TRANSACTION...</span>
                </>
              ) : (
                <>
                  <Compass className="w-5 h-5 text-obsidian animate-bounce" />
                  <span>SPIN LUCKY WHEEL (FREE)</span>
                </>
              )}
            </button>
          )}

          <div className="mt-4 flex justify-between px-2 text-[10px] text-zinc-500 font-mono">
            <span>RARE: 20 Coins (2.5%)</span>
            <span>•</span>
            <span className="text-amber-500 font-extrabold flex items-center gap-1">
              <Sparkles className="w-3 h-3 animate-pulse" />
              <span>MYTHIC: 50 Coins (0.5%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Real-Time Spin Ledger Logs */}
      <div className="bg-charcoal border border-zinc-900 rounded-2xl p-5">
        <h3 className="font-display font-bold text-xs uppercase text-zinc-400 tracking-wide mb-3 flex items-center gap-1.5">
          <ArrowRightLeft className="w-4 h-4 text-zinc-500" />
          <span>My Recent Spins Ledger</span>
        </h3>
        {loadingHistory ? (
          <div className="space-y-2">
            <div className="h-10 bg-zinc-900/50 rounded-lg animate-pulse"></div>
            <div className="h-10 bg-zinc-900/50 rounded-lg animate-pulse"></div>
          </div>
        ) : myHistory.length === 0 ? (
          <p className="text-center py-6 text-xs text-zinc-500 italic">No spins recorded. Spin the wheel above to take your first trial!</p>
        ) : (
          <div className="space-y-2">
            {myHistory.map((spin) => {
              const formattedDate = new Date(spin.createdAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              return (
                <div key={spin.spinId} className="bg-zinc-950/80 border border-zinc-900 px-4 py-3 rounded-xl flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-ryvex-cyan"></div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-300">Reward Dispatched</h4>
                      <p className="text-[9px] text-zinc-500 font-mono mt-0.5">{formattedDate}</p>
                    </div>
                  </div>
                  <span className="font-mono font-black text-xs text-ryvex-cyan bg-cyan-950/40 border border-cyan-900 px-3 py-1 rounded-full">
                    +{spin.rewardAmount} Coins
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Splendid Celebration Overlay Dialog */}
      <AnimatePresence>
        {winDialog !== null && (
          <div className="fixed inset-0 bg-obsidian/95 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              className="w-full max-w-sm bg-charcoal border border-zinc-800 rounded-2xl p-6 text-center relative overflow-hidden shadow-2xl"
            >
              {/* Top premium metallic border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ryvex-cyan via-amber-400 to-emerald-500"></div>

              {/* Sparkles background effect */}
              <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>

              <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-300 shadow-lg shadow-amber-950/30">
                <TrophyIcon className="w-8 h-8 text-black" />
              </div>

              <span className="bg-zinc-950 border border-zinc-850 text-[10px] text-amber-500 py-1 px-4 rounded-full tracking-widest font-mono font-bold uppercase">
                Victory Claim Blocked
              </span>
              
              <h3 className="font-display font-black text-2xl mt-3 text-white">REWARD GRANTED!</h3>
              
              <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                Your spin request has been processed successfully by the platform ledger system.
              </p>
              
              <div className="my-5 inline-block bg-zinc-950 border border-zinc-800 px-6 py-3 rounded-xl shadow-inner">
                <p className="text-[9px] text-zinc-400 uppercase font-mono tracking-widest">Payout Dispatched</p>
                <h4 className="font-display font-black text-3xl text-amber-400 mt-1">+{winDialog} COINS</h4>
              </div>

              <p className="text-[10px] text-zinc-500 font-mono leading-relaxed max-w-xs mx-auto">
                Commitment confirmed securely on the platform. Join tournament rosters to earn wins and Crowns!
              </p>

              <button
                onClick={closeSplash}
                className="mt-6 w-full bg-ryvex-cyan hover:brightness-110 text-obsidian font-display font-black text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4 text-obsidian" />
                <span>COLLECT REWARD LEDGER</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

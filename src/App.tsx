import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './components/AuthScreen';
import SpinWheelView from './components/SpinWheelView';
import LeaderboardView from './components/LeaderboardView';
import AdEarnView from './components/AdEarnView';
import AdminDesk from './components/AdminDesk';
import { 
  Gamepad2, 
  Coins, 
  Trophy, 
  Gift, 
  User, 
  Sliders, 
  Plus, 
  Grid, 
  Clock, 
  Bell, 
  Check, 
  Info, 
  HelpCircle, 
  LogOut, 
  AlertCircle, 
  Calendar, 
  Search, 
  TrendingUp,
  X,
  Play,
  MessageSquare,
  BookOpen,
  Sparkles,
  Send,
  Wifi,
  Battery,
  ChevronRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { Tournament } from './types';

// Synthesize retro futuristic gaming alert tones using browser web audio oscillator
function playStartSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };
    playTone(880, audioCtx.currentTime, 0.15);
    playTone(1320, audioCtx.currentTime + 0.12, 0.3);
  } catch (err) {}
}

function TournamentCountdown({ scheduledTime, status }: { scheduledTime: string; status: string }) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (status !== 'upcoming') return;

    const updateTimer = () => {
      const diff = new Date(scheduledTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('STARTING NOW');
        return;
      }

      const totalSecs = Math.floor(diff / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [scheduledTime, status]);

  if (status !== 'upcoming') return null;

  const isCritical = timeLeft.includes('s') || timeLeft === 'STARTING NOW';

  return (
    <div className={`font-mono text-[9px] px-2 py-0.5 rounded border inline-block whitespace-nowrap tracking-wider ${
      timeLeft === 'STARTING NOW'
        ? 'bg-red-950/80 border-red-800 text-red-400 animate-pulse font-extrabold'
        : isCritical
        ? 'bg-amber-950/60 border-amber-800/80 text-amber-500 font-bold'
        : 'bg-zinc-950 border-zinc-900 text-zinc-400'
    }`}>
      ⏱️ {timeLeft}
    </div>
  );
}

function Dashboard() {
  const { 
    user, 
    tournaments, 
    announcements, 
    claimDailyBonus
  } = useAuth();

  const [claiming, setClaiming] = useState(false);
  const [claimingMsg, setClaimingMsg] = useState<string | null>(null);
  const [claimingErr, setClaimingErr] = useState<string | null>(null);
  const [canClaimDaily, setCanClaimDaily] = useState(true);

  useEffect(() => {
    if (user && user.lastDailyBonus) {
      const lastReset = new Date(user.lastDailyBonus);
      const now = new Date();
      const diffMs = now.getTime() - lastReset.getTime();
      setCanClaimDaily(diffMs >= 24 * 60 * 60 * 1000);
    } else {
      setCanClaimDaily(true);
    }
  }, [user]);

  const handleClaimDaily = async () => {
    if (claiming || !canClaimDaily) return;
    setClaiming(true);
    setClaimingErr(null);
    setClaimingMsg(null);
    try {
      await claimDailyBonus();
      setClaimingMsg('Daily reward! +2.0 CP successfully credited.');
      setCanClaimDaily(false);
      setTimeout(() => setClaimingMsg(null), 4000);
    } catch (err: any) {
      setClaimingErr(err.message || 'Verification failed.');
    } finally {
      setClaiming(false);
    }
  };

  const activeTournaments = tournaments.filter(t => t.status === 'upcoming' || t.status === 'live');
  const finishedTournaments = tournaments.filter(t => t.status === 'completed');

  // Calculate competitor level tier based on wins & participation counts
  const totalWins = user?.winsCount || 0;
  const totalGames = user?.joinedCount || 0;
  const experienceVal = (totalWins * 12) + (totalGames * 3);
  const calculatedLevel = Math.max(1, Math.floor(Math.sqrt(experienceVal)) + 1);

  return (
    <div className="space-y-5" id="dashboard-view">
      {/* Broadcast alert marquee banner */}
      {announcements.length > 0 && (
        <div className="bg-gradient-to-r from-ryvex-cyan/15 to-zinc-950 border border-ryvex-cyan/20 p-3.5 rounded-xl flex items-start gap-3 text-xs text-zinc-350">
          <Info className="w-4 h-4 text-ryvex-cyan mt-0.5 shrink-0 pulse-live" />
          <div className="min-w-0">
            <span className="font-mono text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">BROADCAST ALERTS</span>
            <p className="mt-0.5 font-sans text-zinc-200 text-[11px] leading-relaxed">
              {announcements[0].title}: {announcements[0].message}
            </p>
          </div>
        </div>
      )}

      {/* Competitor Welcome Row */}
      <div className="bg-gradient-to-br from-charcoal to-zinc-950 border border-zinc-850 p-5 rounded-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[8px] bg-zinc-950 border border-zinc-900 text-zinc-400 py-1 px-2 rounded-full font-mono tracking-widest font-bold">
              ARENA ID • #{user?.uid ? user.uid.slice(-6).toUpperCase() : 'RYVEX'}
            </span>
            <h2 className="font-display font-black text-xl text-white tracking-tight mt-1">
              Welcome, {user?.username || 'Challenger'}
            </h2>
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
              <Cpu className="w-3.5 h-3.5 text-ryvex-cyan" />
              <span className="font-mono text-[10px] text-zinc-500 font-bold uppercase">Level {calculatedLevel} Elite Operative</span>
            </div>
          </div>
          
          <div className="bg-zinc-950 border border-zinc-900 p-3 rounded-xl text-center min-w-[70px]">
            <Coins className="w-4 h-4 text-ryvex-cyan mx-auto mb-1 animate-pulse" />
            <p className="text-[8px] text-zinc-500 tracking-wider font-mono uppercase font-black">Balances</p>
            <h4 className="font-mono font-black text-xs text-ryvex-cyan mt-0.5">
              {user?.coins ? user.coins.toFixed(1) : '10.0'} CP
            </h4>
          </div>
        </div>

        {/* User stats widget */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-zinc-900 text-center">
          <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900 flex items-center justify-between px-3">
            <div className="text-left">
              <span className="text-zinc-500 text-[8px] font-mono uppercase block font-bold">Championship wins</span>
              <span className="font-mono font-bold text-xs text-white">{totalWins} Matches</span>
            </div>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900 flex items-center justify-between px-3">
            <div className="text-left">
              <span className="text-zinc-500 text-[8px] font-mono uppercase block font-bold">Arena Battles</span>
              <span className="font-mono font-bold text-xs text-white">{totalGames} Games</span>
            </div>
            <Gamepad2 className="w-4 h-4 text-ryvex-cyan" />
          </div>
        </div>
      </div>

      {/* Daily Tasks Module */}
      <div className="bg-charcoal border border-zinc-850 p-4 rounded-xl space-y-3">
        <h3 className="font-display font-bold text-xs text-zinc-400 uppercase tracking-wide">Daily Match-Up Checklists</h3>
        
        {claimingErr && (
          <p className="text-[10px] text-red-400">{claimingErr}</p>
        )}

        <div className="bg-zinc-950/80 border border-zinc-900 p-3.5 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${canClaimDaily ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-900 border-zinc-850'}`}>
              <Gift className={`w-4 h-4 ${canClaimDaily ? 'text-amber-500 animate-bounce' : 'text-zinc-650'}`} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-200">Daily Bonus Allowance</h4>
              <p className="text-[9px] text-zinc-500 font-mono mt-0.5">+2.0 Coins • Claimable daily</p>
            </div>
          </div>

          {claimingMsg && (
            <span className="text-[9px] text-emerald-500 animate-pulse">{claimingMsg}</span>
          )}

          {canClaimDaily ? (
            <button
              onClick={handleClaimDaily}
              disabled={claiming}
              className="bg-zinc-900 hover:bg-zinc-800 text-amber-500 border border-amber-500/30 text-[10px] font-bold py-1.5 px-3 rounded-lg transition-colors cursor-pointer font-display"
            >
              {claiming ? 'CLAIMING...' : 'CLAIM NOW'}
            </button>
          ) : (
            <span className="text-zinc-600 text-[9px] font-semibold bg-zinc-900 px-2.5 py-1 rounded border border-zinc-850 font-mono uppercase tracking-wider">
              CLAIMED
            </span>
          )}
        </div>
      </div>

      {/* Featured matches showcase */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-xs text-zinc-400 uppercase tracking-wider">Featured Arenas</h3>
        {activeTournaments.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-zinc-850 rounded-2xl bg-charcoal text-zinc-550 text-xs text-zinc-500">
            No live rosters are active. Administrators will coordinate lobbies soon.
          </div>
        ) : (
          <div className="space-y-3">
            {activeTournaments.slice(0, 2).map((tour) => {
              const registeredCount = tour.participantIds?.length || 0;
              const slotsRemain = tour.maxParticipants - registeredCount;
              const isLive = tour.status === 'live';

              return (
                <div key={tour.tournamentId} className="bg-zinc-900/40 border border-zinc-850/80 rounded-xl overflow-hidden flex flex-col justify-between">
                  <div className="relative h-20 w-full overflow-hidden">
                    <img src={tour.bannerUrl} alt="" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold tracking-wider text-ryvex-cyan font-mono uppercase bg-cyan-950/40 border border-cyan-900/30 px-2 py-0.5 rounded">
                        {tour.game}
                      </span>
                      {isLive && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-red-550 rounded-full animate-ping"></span>
                          <span className="text-[9px] text-red-500 font-bold font-mono uppercase">LOBBY LIVE</span>
                        </span>
                      )}
                    </div>
                    <h4 className="font-display font-bold text-sm text-white">{tour.title}</h4>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      MAP: {tour.gameMap} • Entry required: {tour.entryFee} coins
                    </p>
                  </div>

                  <div className="bg-zinc-950 p-3 border-t border-zinc-900/50 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-zinc-400">
                      SLOTS RESERVED: <strong className="text-zinc-200">{registeredCount} / {tour.maxParticipants}</strong>
                    </span>
                    <span className="text-amber-500 font-bold uppercase">
                      Prize pool: {tour.prizePool} CP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed winners cards */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-xs text-zinc-400 uppercase tracking-wider">Recent Champions</h3>
        {finishedTournaments.length === 0 ? (
          <p className="text-center py-6 border border-dashed border-zinc-850 rounded-xl text-xs text-zinc-550 italic bg-charcoal">
            Winners podium is empty. Finish a tournament to award Crowns.
          </p>
        ) : (
          <div className="space-y-2">
            {finishedTournaments.slice(0, 3).map((tour) => (
              <div key={tour.tournamentId} className="bg-zinc-955 border border-zinc-900 p-4 rounded-xl flex justify-between items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-zinc-300 truncate">{tour.title}</h4>
                  <div className="flex items-center gap-1.5 mt-1 font-mono text-[9px]">
                    <span className="text-zinc-500">WINNER:</span>
                    <span className="text-amber-500 font-bold">{tour.winnerName}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-black text-xs text-amber-500 bg-amber-950/20 border border-amber-900/20 px-2.5 py-0.5 rounded-full">
                    +{tour.prizePool} Coins Awarded
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Dedicated Tournament Detail Screen (Features rules + real-time Chat room)
function TournamentDetailView({ tournament, onBack }: { tournament: Tournament; onBack: () => void }) {
  const { user, firebaseUser, joinTournament, leaveTournament } = useAuth();
  const [activeTab, setActiveTab] = useState<'rules' | 'chat'>('rules');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Chat logics
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMsgText, setNewMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tournament?.tournamentId) return;

    const qChat = query(
      collection(db, 'tournaments', tournament.tournamentId, 'chat'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsub = onSnapshot(qChat, (snap) => {
      const list: any[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setChatMessages(list);
    }, (err) => {
      console.error("Chat streaming error:", err);
    });

    return () => unsub();
  }, [tournament?.tournamentId]);

  // Scroll messages to bottom
  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const isRegistered = user && tournament.participantIds?.includes(user?.uid);
  const slotFillCount = tournament.participantIds?.length || 0;
  const slotsTotal = tournament.maxParticipants;
  const vacantSlots = slotsTotal - slotFillCount;
  const isCompleted = tournament.status === 'completed';

  const handleJoin = async () => {
    setActionError(null);
    setActionLoading(true);
    try {
      await joinTournament(tournament.tournamentId);
    } catch (err: any) {
      setActionError(err.message || 'Operation failed. Verify requirements.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    setActionError(null);
    setActionLoading(true);
    try {
      await leaveTournament(tournament.tournamentId);
      setConfirmLeave(false);
    } catch (err: any) {
      setActionError(err.message || 'Withdrawal canceled.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgText.trim() || sendingMsg || !user) return;
    setSendingMsg(true);

    try {
      const msgId = 'chat_' + Math.random().toString(36).substring(2, 11);
      const docRef = doc(db, 'tournaments', tournament.tournamentId, 'chat', msgId);
      
      const payload = {
        userId: user.uid,
        username: user.username,
        text: newMsgText.trim(),
        createdAt: new Date().toISOString()
      };

      await setDoc(docRef, payload);
      setNewMsgText('');
    } catch (err: any) {
      console.error("Failed to post communications chat:", err);
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className="space-y-5 h-full flex flex-col bg-charcoal rounded-2xl border border-zinc-850 overflow-hidden relative" id="tournament-detail">
      {/* Top Hero header with transparent gradients */}
      <div className="relative h-44 w-full shrink-0">
        <img src={tournament.bannerUrl} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-charcoal via-charcoal/40 to-transparent"></div>
        
        {/* Close triggers */}
        <button 
          onClick={onBack}
          className="absolute left-4 top-4 bg-zinc-950 p-2.5 rounded-full border border-zinc-850 hover:bg-zinc-900 text-zinc-300"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="absolute bottom-4 left-4 right-4">
          <span className="text-[10px] font-bold text-zinc-400 font-mono tracking-wider uppercase mb-1 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-md inline-block">
            {tournament.game}
          </span>
          <h2 className="font-display font-black text-lg text-white tracking-tight leading-tight mt-1">{tournament.title}</h2>
        </div>
      </div>

      {actionError && (
        <div className="px-4 shrink-0">
          <div className="bg-red-950/20 border border-red-900/40 p-3 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{actionError}</span>
          </div>
        </div>
      )}

      {/* Tabs list (RULES VS REALTIME CHAT) */}
      <div className="px-4 shrink-0">
        <div className="flex bg-zinc-950 border border-zinc-900 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold font-display transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'rules' ? 'bg-zinc-900 text-white border border-zinc-805' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Rules & Lobbies</span>
          </button>
          
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold font-display transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
              activeTab === 'chat' ? 'bg-zinc-900 text-white border border-zinc-805' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Arena Chat Room</span>
            {!isRegistered && (
              <span className="text-[8px] bg-red-950/60 border border-red-900 text-red-400 px-1.5 rounded scale-[0.85]">LOCK</span>
            )}
          </button>
        </div>
      </div>

      {/* Main tab context body */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-20">
        {activeTab === 'rules' ? (
          <div className="space-y-4">
            {/* Lobbies metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-zinc-950/45 p-3 rounded-xl border border-zinc-900">
                <p className="text-[9px] text-zinc-550 font-bold uppercase">Prize Pool</p>
                <div className="flex items-center gap-1 mt-1 text-sm font-black text-amber-500">
                  <Trophy className="w-4 h-4" />
                  <span>{tournament.prizePool} CP</span>
                </div>
              </div>
              <div className="bg-zinc-950/45 p-3 rounded-xl border border-zinc-900">
                <p className="text-[9px] text-zinc-550 font-bold uppercase">Entry Coins</p>
                <div className="flex items-center gap-1 mt-1 text-sm font-black text-ryvex-cyan">
                  <Coins className="w-4 h-4" />
                  <span>{tournament.entryFee} CP</span>
                </div>
              </div>
            </div>

            {/* Map & Maps format specs */}
            <div className="bg-zinc-950/30 border border-zinc-900 rounded-xl p-4 space-y-2.5">
              <h4 className="text-zinc-400 text-[10px] font-mono font-bold uppercase tracking-wider">Combat Specifications</h4>
              <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                <div>
                  <span className="text-zinc-500 text-[10px] font-mono block">ARENA MAP</span>
                  <span className="font-bold text-zinc-200 mt-0.5 block capitalize">{tournament.gameMap}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] font-mono block">START SCHEDULED</span>
                  <span className="font-bold text-zinc-200 mt-0.5 block">
                    {new Date(tournament.scheduledTime).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-900 flex justify-between items-center bg-zinc-950 -mx-4 -mb-4 p-3.5 rounded-b-xl border border-zinc-900">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">START COUNTDOWN</span>
                <TournamentCountdown scheduledTime={tournament.scheduledTime} status={tournament.status} />
              </div>
            </div>

            {/* Complete Rulebooks */}
            <div className="bg-zinc-950/30 border border-zinc-900 rounded-xl p-4">
              <h4 className="text-zinc-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">Arena Official Rulebook</h4>
              <p className="text-xs text-zinc-450 leading-relaxed font-mono whitespace-pre-wrap">{tournament.rules}</p>
            </div>

            {/* Competitor rosters chips */}
            {tournament.participantNames && tournament.participantNames.length > 0 && (
              <div className="bg-zinc-950/30 border border-zinc-900 rounded-xl p-4 space-y-2.5">
                <h4 className="text-zinc-400 text-[10px] font-mono font-bold uppercase tracking-wider">Registered Roster</h4>
                <div className="flex flex-wrap gap-2">
                  {tournament.participantNames.map((name, i) => (
                    <span key={i} className="bg-zinc-950 border border-zinc-900 px-3 py-1 rounded-full text-[10px] font-bold text-zinc-300 flex items-center gap-1.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* CHAT ROOM (REAL-TIME COMMUNICATION) */
          <div className="flex flex-col h-[320px] bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden">
            {!isRegistered ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 gap-3">
                <MessageSquare className="w-10 h-10 text-zinc-700" />
                <h4 className="font-bold text-xs text-zinc-300">Roster Communication Locked</h4>
                <p className="text-[10px] leading-relaxed max-w-xs">
                  Only players registered in the roster lobby are permitted access to real-time chat tools.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between h-full bg-zinc-950">
                {/* Scrollable chat flow */}
                <div className="flex-1 p-3 overflow-y-auto space-y-3 no-scrollbar max-h-[250px]">
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-[10px] text-zinc-600 font-mono py-12">No communication logged. Send a hello text to begin!</p>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = user?.uid === msg.userId;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <span className="text-[9px] text-zinc-500 font-mono tracking-wide px-1 mb-0.5 block">{msg.username}</span>
                          <div className={`p-2.5 max-w-[80%] rounded-xl text-xs font-sans shadow-md border ${
                            isMe 
                              ? 'bg-zinc-900 border-zinc-800 rounded-br-none text-zinc-100' 
                              : 'bg-zinc-950 border-zinc-900 rounded-bl-none text-zinc-200'
                          }`}>
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef}></div>
                </div>

                {/* Secure submission widget */}
                <form onSubmit={handleSendChat} className="bg-zinc-950 border-t border-zinc-900 p-2 flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="Enter chat details lobby..."
                    value={newMsgText}
                    onChange={(e) => setNewMsgText(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-850 px-3 py-2 text-xs text-white placeholder-zinc-550 focus:outline-none"
                  />
                  <button 
                    type="submit"
                    disabled={sendingMsg}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-805 text-ryvex-cyan rounded-lg scroll-smooth cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FIXED PINNED STICKY BOTTOM RESERVATION ACTIONS */}
      {!isCompleted && tournament.status === 'upcoming' && (
        <div className="absolute bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-905 p-3 flex justify-between items-center z-10 shrink-0">
          <span className="text-[10px] text-zinc-400 font-mono tracking-wider">
            SLOTS: <strong className="text-zinc-200">{slotFillCount}/{slotsTotal}</strong> ({vacantSlots} vacant)
          </span>

          {isRegistered ? (
            confirmLeave ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold text-zinc-400 py-1.5 px-3.5 rounded-lg transition-colors cursor-pointer"
                >
                  STAY
                </button>
                <button
                  onClick={handleLeave}
                  disabled={actionLoading}
                  className="bg-red-650 hover:bg-red-700 text-white text-[10px] font-bold py-1.5 px-3.5 rounded-lg transition-colors cursor-pointer"
                >
                  {actionLoading ? 'LEAVING...' : 'YES, LEAVE'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmLeave(true)}
                className="bg-zinc-900 hover:bg-zinc-850 border border-red-950 text-red-400 text-[10px] font-bold py-1.5 px-4 rounded-lg cursor-pointer"
              >
                LEAVE ROSTER
              </button>
            )
          ) : (
            <button
              onClick={handleJoin}
              disabled={actionLoading || vacantSlots <= 0}
              className="bg-ryvex-cyan hover:brightness-115 text-obsidian text-[10px] font-black font-display py-2 px-5 rounded-lg cursor-pointer transition-all disabled:opacity-50"
            >
              {actionLoading ? 'REGISTERING...' : vacantSlots <= 0 ? 'ROSTER FULL' : `JOIN ARENA (-${tournament.entryFee} CP)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TournamentsView() {
  const { user, tournaments, createTournamentByPlayer } = useAuth();
  
  const [activeTab, setActiveTab2] = useState<'upcoming' | 'live' | 'completed'>('upcoming');
  const [categoryChip, setCategoryChip] = useState<'All' | 'Valorant' | 'BGMI' | 'Free Fire' | 'COD' | 'Apex'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom hosted modal Form state
  const [createOpen, setCreateOpen2] = useState(false);
  const [newTitle, setNewTitle2] = useState('');
  const [newGame, setNewGame2] = useState('Valorant Mobile');
  const [newMap, setNewMap2] = useState('Haven');
  const [newEntryFee, setNewEntryFee2] = useState(10);
  const [newPrize, setNewPrize2] = useState(150);
  const [newMaxParticipants, setNewMaxParticipants2] = useState(16);
  const [newRules, setNewRules2] = useState('1. Hackers are permanently banned.\n2. Arrive 10 minutes prior.\n3. Verify scores via support tickets.');
  const [newScheduled, setNewScheduled2] = useState('');
  const [newBanner, setNewBanner2] = useState('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop');
  
  const [loadingCreation, setLoadingCreation2] = useState(false);
  const [actionError2, setActionError2] = useState<string | null>(null);

  // Detail panel anchor
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  const handleHostTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newScheduled) {
      setActionError2('Please fill in title and match start schedules.');
      return;
    }
    
    setLoadingCreation2(true);
    setActionError2(null);
    try {
      await createTournamentByPlayer({
        title: newTitle,
        game: newGame,
        gameMap: newMap,
        entryFee: Number(newEntryFee),
        prizePool: Number(newPrize),
        maxParticipants: Number(newMaxParticipants),
        rules: newRules,
        scheduledTime: new Date(newScheduled).toISOString(),
        bannerUrl: newBanner,
        status: 'upcoming'
      });
      setCreateOpen2(false);
      setNewTitle2('');
      setNewScheduled2('');
    } catch (err: any) {
      setActionError2(err.message || 'Do you have at least 200 Coins? Matches require a security deposit.');
    } finally {
      setLoadingCreation2(false);
    }
  };

  const filteredMatches = tournaments.filter(t => {
    const matchesQuery = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.game.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = t.status === activeTab;
    const matchesChip = categoryChip === 'All' || t.game.toLowerCase().includes(categoryChip.toLowerCase());
    return matchesQuery && matchesTab && matchesChip;
  });

  return (
    <div className="space-y-4 h-full flex flex-col" id="tournaments-view">
      {/* Detail panel renderer */}
      {selectedTournament ? (
        <TournamentDetailView 
          tournament={selectedTournament} 
          onBack={() => {
            // Hot refresh selection link to keep details synchronized
            setSelectedTournament(null);
          }} 
        />
      ) : (
        <>
          {/* Header row */}
          <div className="flex justify-between items-center bg-zinc-900/40 p-4 rounded-xl border border-zinc-900 shrink-0">
            <div>
              <h2 className="font-display font-bold text-sm uppercase tracking-wider text-zinc-100 flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4 text-ryvex-cyan" />
                <span>Tournaments Hub</span>
              </h2>
            </div>
            
            <button
              onClick={() => {
                setActionError2(null);
                setCreateOpen2(true);
              }}
              className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-805 text-ryvex-cyan text-[10px] font-black py-1.5 px-3.5 rounded-lg transition-colors cursor-pointer font-sans"
            >
              <Plus className="w-3.5 h-3.5 text-ryvex-cyan" />
              <span>HOST LOBBY (200)</span>
            </button>
          </div>

          {actionError2 && (
            <div className="bg-red-950/20 border border-red-900/40 p-3 rounded-xl text-xs text-red-300">
              {actionError2}
            </div>
          )}

          {/* Search bar & filter controls */}
          <div className="space-y-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search matching title or game..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-10 py-2 text-xs text-white placeholder-zinc-550 focus:outline-none"
              />
            </div>

            {/* Category Chips Horizontal scroll */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {(['All', 'Valorant', 'BGMI', 'Free Fire', 'COD', 'Apex'] as const).map((chip) => (
                <button
                  key={chip}
                  onClick={() => setCategoryChip(chip)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-mono font-bold border transition-colors cursor-pointer shrink-0 ${
                    categoryChip === chip
                      ? 'bg-zinc-905 border-zinc-800 text-ryvex-cyan'
                      : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-350'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Tabs Filter */}
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-900">
              {(['upcoming', 'live', 'completed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setActiveTab2(status)}
                  className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer ${
                    activeTab === status ? 'bg-zinc-900 border border-zinc-800 text-white shadow-xl' : 'text-zinc-550 hover:text-zinc-350'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Matches List */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 max-h-[380px] pb-24 pr-1">
            {filteredMatches.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-zinc-850 rounded-2xl bg-charcoal text-zinc-550 italic text-xs">
                No lobbies found matching filters.
              </div>
            ) : (
              filteredMatches.map((match) => {
                const isRegistered = user && match.participantIds?.includes(user?.uid);
                const slotsRegistered = match.participantIds?.length || 0;
                const totalSlots = match.maxParticipants;
                const isCompleted = match.status === 'completed';

                return (
                  <div 
                    key={match.tournamentId}
                    onClick={() => setSelectedTournament(match)}
                    className="bg-charcoal border border-zinc-850 rounded-xl overflow-hidden hover:border-zinc-700 transition-all flex flex-col justify-between shadow-lg cursor-pointer"
                  >
                    <div className="relative h-24 w-full overflow-hidden">
                      <img src={match.bannerUrl} alt="" className="w-full h-full object-cover opacity-85" />
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-charcoal via-charcoal/20 to-transparent"></div>
                      
                      {/* Cost Pill */}
                      <span className="absolute bottom-3 right-3 text-[10px] font-mono font-black text-ryvex-cyan bg-zinc-950 border border-zinc-850 px-2.5 py-0.5 rounded-full shadow-lg">
                        {match.entryFee} Coins
                      </span>
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="flex justify-between items-center text-[9px] font-mono font-bold">
                        <span className="text-zinc-550 tracking-wide uppercase">{match.game} • {match.gameMap}</span>
                        {isRegistered && (
                          <span className="text-emerald-500 bg-emerald-950/40 border border-emerald-900 px-1.5 py-0.5 rounded tracking-widest text-[8px] font-black uppercase">REGISTERED</span>
                        )}
                      </div>
                      
                      <h4 className="font-display font-bold text-xs text-white leading-tight">{match.title}</h4>
                    </div>

                    <div className="bg-zinc-950 px-4 py-2.5 border-t border-zinc-900 flex justify-between items-center text-[10px] font-mono shrink-0">
                      <span className="text-zinc-400">
                        SLOTS FILLED: <strong className="text-zinc-200">{slotsRegistered}/{totalSlots}</strong>
                      </span>
                      <span className="text-amber-500 font-bold uppercase shrink-0">
                        Prize: {match.prizePool} CP
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Host Tournament Area Modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-obsidian/95 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-sm bg-charcoal border border-zinc-800 rounded-2xl p-5 shadow-2xl relative my-8">
            <button 
              onClick={() => { setCreateOpen2(false); setActionError2(null); }}
              className="absolute right-4 top-4 p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="font-display font-black text-sm text-zinc-100 uppercase tracking-tight flex items-center gap-1.5">
              <Plus className="w-4.5 h-4.5 text-ryvex-cyan" />
              <span>Create Match Room</span>
            </h3>
            <p className="text-[10px] text-zinc-450 mt-1 mb-4 leading-relaxed font-mono">
              Creating a custom tournament costs <strong className="text-ryvex-cyan">200 Coins Ledger</strong> as deposit and automatical registration!
            </p>

            <form onSubmit={handleHostTournament} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Tournament Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ryvex Valorant Open"
                  value={newTitle}
                  onChange={(e) => setNewTitle2(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-ryvex-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Category</label>
                  <select
                    value={newGame}
                    onChange={(e) => setNewGame2(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Valorant Mobile">Valorant</option>
                    <option value="BGMI">BGMI</option>
                    <option value="Free Fire">Free Fire</option>
                    <option value="COD Mobile">CODM</option>
                    <option value="Apex Legends">Apex</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Combat Map</label>
                  <input
                    type="text"
                    required
                    placeholder="Haven, Miramar"
                    value={newMap}
                    onChange={(e) => setNewMap2(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Entry (5-20)</label>
                  <input
                    type="number"
                    min="5"
                    max="20"
                    required
                    value={newEntryFee}
                    onChange={(e) => setNewEntryFee2(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Prize pool (CP)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newPrize}
                    onChange={(e) => setNewPrize2(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Slots</label>
                  <input
                    type="number"
                    min="2"
                    max="100"
                    required
                    value={newMaxParticipants}
                    onChange={(e) => setNewMaxParticipants2(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Match Star Scheduled</label>
                <input
                  type="datetime-local"
                  required
                  value={newScheduled}
                  onChange={(e) => setNewScheduled2(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Rulebook directions</label>
                <textarea
                  rows={2}
                  required
                  value={newRules}
                  onChange={(e) => setNewRules2(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loadingCreation}
                className="w-full bg-ryvex-cyan hover:brightness-110 text-obsidian font-display font-black py-3 rounded-xl text-xs transition-colors cursor-pointer"
              >
                {loadingCreation ? 'DEPLOYING CODES...' : 'DEPLOY MATCH (-200 CP)'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileView() {
  const { user, logout, submitBugReport } = useAuth();
  
  // Bug report States
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDetails, setTicketDetails] = useState('');
  const [success, setSuccess] = useState(false);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketDetails) return;
    try {
      await submitBugReport(ticketSubject, ticketDetails);
      setSuccess(true);
      setTicketSubject('');
      setTicketDetails('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {}
  };

  // Profile levels tier matchingwins counts
  const totalWins = user?.winsCount || 0;
  const totalGames = user?.joinedCount || 0;
  const expValue = (totalWins * 12) + (totalGames * 3);
  const userLevel = Math.max(1, Math.floor(Math.sqrt(expValue)) + 1);

  return (
    <div className="space-y-5 text-zinc-100 font-sans" id="profile-view">
      {/* Title Header */}
      <div className="flex justify-between items-center bg-zinc-900/40 p-5 rounded-2xl border border-zinc-900">
        <div>
          <h2 className="font-display font-bold text-xl uppercase tracking-tight text-white flex items-center gap-2">
            <User className="w-5.25 h-5.25 text-ryvex-cyan" />
            <span>My Profile</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Manage credentials, audit wins, and submit support tickets.</p>
        </div>
      </div>

      {/* Competitor Card Header */}
      <div className="bg-charcoal border border-zinc-850 p-6 rounded-2xl flex flex-col items-center text-center relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>

        <img
          src={user?.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user?.username}`}
          alt=""
          referrerPolicy="no-referrer"
          className="w-20 h-20 rounded-full bg-zinc-950 object-cover border-2 border-ryvex-cyan shadow-lg mb-3"
        />
        <h3 className="font-display font-bold text-lg text-white">{user?.username}</h3>
        <p className="text-xs text-zinc-550 font-mono tracking-wide">{user?.email}</p>

        {/* Level badge */}
        <div className="mt-3.5 bg-zinc-950 border border-zinc-900 px-4 py-1.5 rounded-full flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span className="font-mono text-[10px] font-black text-amber-500 uppercase tracking-widest">Level {userLevel} Elite Operative</span>
        </div>

        {/* Account stats cards row */}
        <div className="grid grid-cols-2 gap-3 w-full mt-6 text-xs text-left">
          <div className="bg-zinc-950 border border-zinc-900 p-3.5 rounded-xl">
            <Coins className="w-4 h-4 text-ryvex-cyan mb-1.5" />
            <p className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider font-mono">My Wallet coin balance</p>
            <p className="font-mono font-black text-sm text-zinc-200 mt-1">{user?.coins ? user.coins.toFixed(1) : '10.0'} CP</p>
          </div>
          <div className="bg-zinc-950 border border-zinc-900 p-3.5 rounded-xl">
            <Trophy className="w-4 h-4 text-amber-500 mb-1.5" />
            <p className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider font-mono">Championship wins</p>
            <p className="font-mono font-black text-sm text-zinc-200 mt-1">{totalWins} Match crowns</p>
          </div>
        </div>
      </div>

      {/* Support escalation area */}
      <div className="bg-charcoal border border-zinc-850 p-6 rounded-2xl">
        <h3 className="font-display font-semibold text-xs text-zinc-350 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-ryvex-cyan" />
          <span>Post Escalation Support Ticket</span>
        </h3>
        <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed font-mono">
          Logs detailed queries regarding missing coin credit balances directly inside super administrative databases.
        </p>

        {success && (
          <div className="mb-4 bg-emerald-950/20 border border-emerald-950/45 p-4 rounded-xl text-xs text-emerald-300 text-center font-bold">
            Escalation logged in database registers! Admin will audit.
          </div>
        )}

        <form onSubmit={handleCreateReport} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Subject Headline</label>
            <input
              type="text"
              required
              placeholder="e.g. Ad complete but CP credit missing"
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-zinc-250 placeholder-zinc-650 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Incident Context</label>
            <textarea
              rows={3}
              required
              placeholder="Include maps, approximate clocks..."
              value={ticketDetails}
              onChange={(e) => setTicketDetails(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-zinc-250 placeholder-zinc-650 focus:outline-none focus:border-ryvex-cyan"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 text-ryvex-cyan font-display font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer text-center"
          >
            DISPATCH SECURE INCIDENT REPORT
          </button>
        </form>
      </div>

      {/* Sign out options */}
      <div className="bg-charcoal border border-zinc-850 p-4 rounded-2xl flex justify-between items-center bg-zinc-950/40 relative">
        <div>
          <h4 className="text-xs font-bold text-zinc-300">Rosters Profile Sessions</h4>
          <span className="text-[8px] text-zinc-550 font-mono uppercase tracking-widest font-bold mt-1 block">Active login verified securely</span>
        </div>
        <button
          onClick={() => logout()}
          className="bg-zinc-950 hover:bg-zinc-900 border border-red-950/50 text-red-400 text-xs px-4 py-2 rounded-xl transition-all font-sans font-bold cursor-pointer flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>SIGN OUT</span>
        </button>
      </div>
    </div>
  );
}

function NotificationsView() {
  const { myNotifications, markNotificationRead } = useAuth();

  const handleRead = async (id: string, currentlyRead: boolean) => {
    if (currentlyRead) return;
    try {
      await markNotificationRead(id);
    } catch (e) {}
  };

  return (
    <div className="space-y-5" id="notifications-view">
      {/* Title Header */}
      <div className="flex justify-between items-center bg-zinc-900/40 p-5 rounded-2xl border border-zinc-900">
        <div>
          <h2 className="font-display font-bold text-xl uppercase tracking-tight text-white flex items-center gap-2">
            <Bell className="w-5.25 h-5.25 text-ryvex-cyan" />
            <span>Alert Center</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Check critical match schedules notifications and administrative ledger claims.</p>
        </div>
      </div>

      {myNotifications.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-zinc-850 rounded-2xl bg-charcoal text-zinc-550 text-xs italic">
          No notifications recorded in your inbox yet. Upcoming tournaments alerts appear here.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[450px] overflow-y-auto no-scrollbar pr-1">
          {myNotifications.map((noti) => {
            const formattedTime = new Date(noti.createdAt).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div 
                key={noti.notificationId}
                onClick={() => handleRead(noti.notificationId, noti.read)}
                className={`p-4 rounded-xl border flex gap-3.5 cursor-pointer transition-all ${
                  noti.read 
                    ? 'bg-zinc-950/40 border-zinc-900 opacity-60 hover:opacity-100' 
                    : 'bg-zinc-900/80 border-ryvex-cyan/40 shadow-lg'
                }`}
              >
                <div className="p-2 bg-zinc-950 rounded-lg h-9 w-9 flex items-center justify-center border border-zinc-900 shrink-0">
                  <Bell className={`w-4 h-4 ${noti.read ? 'text-zinc-600' : 'text-ryvex-cyan animate-pulse'}`} />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-xs font-bold leading-tight ${noti.read ? 'text-zinc-400' : 'text-zinc-200 font-extrabold'}`}>
                      {noti.title}
                    </h4>
                    {!noti.read && (
                      <span className="w-1.5 h-1.5 bg-ryvex-cyan rounded-full"></span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-450 leading-relaxed font-sans">{noti.message}</p>
                  <p className="text-[9px] text-zinc-550 font-mono mt-0.5">{formattedTime}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MainAppLayout() {
  const { user, loading, isAdmin, myNotifications, tournaments } = useAuth();
  const [activeScreen, setActiveScreen] = useState<'home' | 'tournaments' | 'spin' | 'earn' | 'leaderboards' | 'profile' | 'admin' | 'notifications'>('home');

  // Request browser notifications permissions
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Background real-time timer checking upcoming registered lobbies
  const [notifiedTournaments, setNotifiedTournaments] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ryvex_notified_tourneys') || '[]');
    } catch {
      return [];
    }
  });

  const [activeToast, setActiveToast] = useState<{
    id: string;
    title: string;
    message: string;
    bannerUrl?: string;
  } | null>(null);

  useEffect(() => {
    if (!user || tournaments.length === 0) return;

    const checkTournaments = () => {
      let updatedNotified = [...notifiedTournaments];
      let triggered = false;

      tournaments.forEach((t) => {
        if (t.status === 'upcoming' && t.participantIds?.includes(user.uid)) {
          const startTime = new Date(t.scheduledTime).getTime();
          
          if (startTime <= Date.now()) {
            if (!updatedNotified.includes(t.tournamentId)) {
              updatedNotified.push(t.tournamentId);
              triggered = true;

              playStartSound();

              setActiveToast({
                id: t.tournamentId,
                title: '⚔️ ARENA MATCH STARTING NOW!',
                message: `"${t.title}" is beginning! Open details straight to check the lobby codes!`,
                bannerUrl: t.bannerUrl
              });

              if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                  new window.Notification(`⚔️ RYVEX Match Starting!`, {
                    body: `"${t.title}" is starting now! ready up.`,
                    icon: t.bannerUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200&auto=format&fit=crop'
                  });
                }
              }
            }
          }
        }
      });

      if (triggered) {
        setNotifiedTournaments(updatedNotified);
        localStorage.setItem('ryvex_notified_tourneys', JSON.stringify(updatedNotified));
      }
    };

    const interval = setInterval(checkTournaments, 3000);
    return () => clearInterval(interval);
  }, [tournaments, user, notifiedTournaments]);

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center text-zinc-200">
        <Gamepad2 className="w-12 h-12 text-ryvex-cyan animate-pulse mb-4" />
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Connecting Ryvex Networks...</p>
        <div className="w-32 bg-zinc-900 h-1.25 rounded-full overflow-hidden mt-6 border border-zinc-850">
          <div className="bg-ryvex-cyan h-full w-2/3 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const unreadCount = myNotifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex justify-center items-center py-0 md:py-8 font-sans antialiased overflow-hidden">
      {/* Background ambient decorative nodes */}
      <div className="absolute inset-0 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none"></div>

      {/* Extreme mobile shell frame wrapper simulating high end device bezel */}
      <div className="w-full max-w-sm md:h-[780px] bg-obsidian border-0 md:border-[10px] md:border-zinc-900 rounded-none md:rounded-[42px] flex flex-col overflow-hidden relative shadow-[0_0_80px_rgba(0,0,0,0.8)]">
        
        {/* Device simulated dynamic Island notch header */}
        <div className="hidden md:flex bg-zinc-950 px-6 py-2.5 justify-between items-center text-[10px] text-zinc-500 font-mono font-bold shrink-0 relative border-b border-zinc-900">
          <div className="flex items-center gap-1">
            <span>9:41 AM</span>
          </div>
          {/* Dynamic Notch pill */}
          <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-24 h-5 bg-black rounded-full border border-zinc-850/40 z-30" />
          <div className="flex items-center gap-2">
            <Wifi className="w-3 h-3 text-zinc-500" />
            <Battery className="w-4 h-4 text-zinc-500" />
          </div>
        </div>

        {/* IN-DEVICE DYNAMIC OVERLAY TRIGGER NOTICE */}
        <AnimatePresence>
          {activeToast && (
            <motion.div
              initial={{ opacity: 0, y: -80, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -80, scale: 0.95 }}
              className="absolute top-4 left-4 right-4 bg-zinc-950 border-2 border-ryvex-cyan shadow-2xl p-3.5 rounded-2xl z-50 flex gap-3.5 backdrop-blur-md"
            >
              <div className="flex-1 min-w-0">
                <h4 className="text-zinc-100 font-display font-black text-[10px] tracking-wider uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-550 animate-ping"></span>
                  <span>{activeToast.title}</span>
                </h4>
                <p className="text-[10px] text-zinc-400 font-mono mt-1.5 leading-relaxed">
                  {activeToast.message}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => {
                      setActiveScreen('tournaments');
                      setActiveToast(null);
                    }}
                    className="bg-ryvex-cyan text-obsidian text-[10px] font-black font-display py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                  >
                    ENTER ARENA
                  </button>
                  <button
                    onClick={() => setActiveToast(null)}
                    className="text-zinc-500 hover:text-zinc-355 text-[10px] font-bold px-2 py-1 font-mono"
                  >
                    DISMISS
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top brand header bar */}
        <header className="bg-charcoal border-b border-zinc-900/60 p-4.5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-ryvex-cyan" />
            <h1 className="font-display font-black tracking-widest text-zinc-100 text-sm">RYVEX</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Quick CP Indicators row */}
            <div 
              onClick={() => setActiveScreen('earn')}
              className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-full cursor-pointer transition-colors"
            >
              <Coins className="w-3.5 h-3.5 text-ryvex-cyan" />
              <span className="font-mono text-xs font-black text-ryvex-cyan">
                {user?.coins ? user.coins.toFixed(1) : '10.0'} CP
              </span>
            </div>

            {/* Notification button */}
            <button 
              onClick={() => setActiveScreen('notifications')}
              className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-850 text-zinc-500 hover:text-zinc-200 relative cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-ryvex-cyan text-obsidian text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Central Router Context Renders */}
        <main className="flex-1 overflow-y-auto no-scrollbar p-5 bg-obsidian">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScreen}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeScreen === 'home' && <Dashboard />}
              {activeScreen === 'tournaments' && <TournamentsView />}
              {activeScreen === 'spin' && <SpinWheelView />}
              {activeScreen === 'earn' && <AdEarnView />}
              {activeScreen === 'leaderboards' && <LeaderboardView />}
              {activeScreen === 'profile' && <ProfileView />}
              {activeScreen === 'notifications' && <NotificationsView />}
              {activeScreen === 'admin' && isAdmin && <AdminDesk />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Dynamic Navigation row mimicking real smartphone tactile bar */}
        <nav className="absolute bottom-0 left-0 right-0 bg-charcoal/95 backdrop-blur-md border-t border-zinc-900/40 p-2 flex justify-around items-center z-10 shrink-0">
          <button
            onClick={() => setActiveScreen('home')}
            className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeScreen === 'home' ? 'text-ryvex-cyan' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span className="text-[8px] font-mono font-bold tracking-wide mt-1 uppercase">Home</span>
          </button>

          <button
            onClick={() => {
              // Clear detail anchors inside tournament screens on nav changes
              setActiveScreen('tournaments');
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeScreen === 'tournaments' ? 'text-ryvex-cyan' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span className="text-[8px] font-mono font-bold tracking-wide mt-1 uppercase">Tourneys</span>
          </button>

          <button
            onClick={() => setActiveScreen('spin')}
            className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeScreen === 'spin' ? 'text-ryvex-cyan' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span className="text-[8px] font-mono font-bold tracking-wide mt-1 uppercase">Spin</span>
          </button>

          <button
            onClick={() => setActiveScreen('earn')}
            className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeScreen === 'earn' ? 'text-ryvex-cyan' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span className="text-[8px] font-mono font-bold tracking-wide mt-1 uppercase">Earn</span>
          </button>

          <button
            onClick={() => setActiveScreen('leaderboards')}
            className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeScreen === 'leaderboards' ? 'text-ryvex-cyan' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span className="text-[8px] font-mono font-bold tracking-wide mt-1 uppercase">Leader</span>
          </button>

          <button
            onClick={() => setActiveScreen('profile')}
            className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeScreen === 'profile' ? 'text-ryvex-cyan' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="text-[8px] font-mono font-bold tracking-wide mt-1 uppercase">Profile</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveScreen('admin')}
              className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl transition-all cursor-pointer ${
                activeScreen === 'admin' ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Sliders className="w-4 h-4 text-amber-500" />
              <span className="text-[8px] font-mono font-bold tracking-wide mt-1 uppercase text-amber-550">Admin</span>
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppLayout />
    </AuthProvider>
  );
}

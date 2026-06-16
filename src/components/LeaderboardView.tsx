import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Coins, Award, Users, Star, ArrowUpRight, Crown, Medal, Search } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppUser } from '../types';

export default function LeaderboardView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'coins' | 'wins'>('coins');
  const [rankedList, setRankedList] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Load rankings list directly from users collection based on active mode
  useEffect(() => {
    setLoading(true);
    const qCol = collection(db, 'users');
    const orderField = activeTab === 'coins' ? 'coins' : 'winsCount';
    const qRank = query(qCol, orderBy(orderField, 'desc'), limit(50));

    const unsub = onSnapshot(qRank, (snapshot) => {
      const list: AppUser[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as AppUser);
      });
      setRankedList(list);
      setLoading(false);
    }, (error) => {
      console.error("Leaderboard subscription error", error);
      setLoading(false);
    });

    return () => unsub();
  }, [activeTab]);

  const getMyPositionIndex = () => {
    if (!user) return -1;
    return rankedList.findIndex(u => u.uid === user.uid);
  };

  const myPosIndex = getMyPositionIndex();
  const myPositionNumber = myPosIndex !== -1 ? myPosIndex + 1 : null;

  // Split top 3 for podium layout
  const top1 = rankedList[0] || null;
  const top2 = rankedList[1] || null;
  const top3 = rankedList[2] || null;
  const restList = rankedList.slice(3);

  return (
    <div className="space-y-6 text-zinc-100" id="leaderboards-panel">
      {/* Tab Selectors & Mini Title Section */}
      <div className="flex flex-col gap-4 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-900">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-display font-black text-xl uppercase tracking-tight text-white flex items-center gap-2">
              <Trophy className="w-5.5 h-5.5 text-amber-500 animate-pulse" />
              <span>Championship Rankings</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Hall of Fame. Climb the ranks to prove yourself as a top esports competitor.</p>
          </div>
        </div>

        {/* Switching Modes row */}
        <div className="flex bg-zinc-950 p-1.5 rounded-xl border border-zinc-850">
          <button
            onClick={() => setActiveTab('coins')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold font-display transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'coins' ? 'bg-zinc-800 text-ryvex-cyan border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Coins Ledger</span>
          </button>
          <button
            onClick={() => setActiveTab('wins')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold font-display transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'wins' ? 'bg-zinc-800 text-amber-500 border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Championship Wins</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 py-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl animate-pulse">
              <div className="flex items-center gap-3 w-1/3">
                <div className="w-8 h-8 bg-zinc-800 rounded-full" />
                <div className="w-20 h-4 bg-zinc-800 rounded" />
              </div>
              <div className="w-12 h-4 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : rankedList.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-850 rounded-2xl bg-charcoal">
          <Users className="w-12 h-12 text-zinc-650 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No competitors are currently ranked in this category.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* THE SEAMLESS PODIUM LAYOUT */}
          <div className="relative pt-12 pb-4 px-2 bg-charcoal border border-zinc-850/80 rounded-2xl flex items-end justify-center gap-2.5 shadow-2xl overflow-hidden min-h-[220px]">
            {/* Subtle light effects behind podium columns */}
            <div className="absolute inset-0 bg-radial-gradient(ellipse_at_bottom,rgba(6,182,212,0.04),transparent_65%) pointer-events-none" />

            {/* 2nd Place Column (Left) */}
            {top2 && (
              <div className="flex flex-col items-center flex-1 z-10">
                <div className="relative mb-3">
                  <img
                    src={top2.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${top2.username}`}
                    alt={top2.username}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full bg-zinc-900 border-2 border-zinc-400 p-0.5 object-cover"
                  />
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-zinc-400 font-bold bg-zinc-900 px-1 border border-zinc-700 rounded text-[9px] uppercase tracking-wider scale-95">2nd</div>
                </div>
                <h4 className="text-[11px] font-bold text-zinc-350 truncate w-20 text-center">{top2.username}</h4>
                <p className="font-mono text-[9px] text-zinc-550 mt-0.5">
                  {activeTab === 'coins' ? `${Number(top2.coins ?? 0).toFixed(0)} CP` : `${top2.winsCount ?? 0}👑`}
                </p>
                {/* 2nd place stand */}
                <div className="w-full bg-gradient-to-t from-zinc-950 to-zinc-900 border-t border-zinc-800/80 rounded-t-lg h-16 mt-3 flex items-center justify-center">
                  <span className="font-display font-black text-zinc-500 text-sm">II</span>
                </div>
              </div>
            )}

            {/* 1st Place Column (Center Tallest) */}
            {top1 && (
              <div className="flex flex-col items-center flex-1 z-10 -mt-8">
                <div className="relative mb-3">
                  <img
                    src={top1.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${top1.username}`}
                    alt={top1.username}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-full bg-zinc-900 border-2 border-amber-400 p-0.5 object-cover filter drop-shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                  />
                  <Crown className="absolute -top-5.5 left-1/2 -translate-x-1/2 w-6 h-6 text-amber-400 animate-bounce" />
                </div>
                <h4 className="text-xs font-black text-white truncate w-24 text-center tracking-tight flex items-center justify-center gap-1">
                  <span>{top1.username}</span>
                </h4>
                <p className="font-mono text-[10px] text-amber-500 font-bold mt-0.5">
                  {activeTab === 'coins' ? `${Number(top1.coins ?? 0).toFixed(0)} CP` : `${top1.winsCount ?? 0} Crowns`}
                </p>
                {/* 1st place stand */}
                <div className="w-full bg-gradient-to-t from-zinc-950 to-zinc-900 border-t-2 border-amber-500/80 rounded-t-xl h-24 mt-3 flex items-center justify-center font-display font-black text-lg text-amber-500 shadow-xl">
                  <span>I</span>
                </div>
              </div>
            )}

            {/* 3rd Place Column (Right) */}
            {top3 && (
              <div className="flex flex-col items-center flex-1 z-10">
                <div className="relative mb-3">
                  <img
                    src={top3.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${top3.username}`}
                    alt={top3.username}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full bg-zinc-900 border-2 border-amber-700 p-0.5 object-cover"
                  />
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-amber-700 font-bold bg-zinc-900 px-1 border border-zinc-800 rounded text-[9px] uppercase tracking-wider scale-95">3rd</div>
                </div>
                <h4 className="text-[11px] font-bold text-zinc-350 truncate w-20 text-center">{top3.username}</h4>
                <p className="font-mono text-[9px] text-zinc-550 mt-0.5">
                  {activeTab === 'coins' ? `${Number(top3.coins ?? 0).toFixed(0)} CP` : `${top3.winsCount ?? 0}👑`}
                </p>
                {/* 3rd place stand */}
                <div className="w-full bg-gradient-to-t from-zinc-950 to-zinc-900 border-t border-zinc-800/80 rounded-t-lg h-12 mt-3 flex items-center justify-center">
                  <span className="font-display font-black text-amber-700/80 text-sm">III</span>
                </div>
              </div>
            )}
          </div>

          {/* LOWER RANKINGS LIST */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pb-24 pr-1">
            {restList.map((competitor, idx) => {
              const position = idx + 4;
              const isMe = user?.uid === competitor.uid;
              const rankVal = activeTab === 'coins' ? competitor.coins : competitor.winsCount;

              return (
                <div
                  key={competitor.uid}
                  className={`flex justify-between items-center p-3 rounded-xl border transition-all ${
                    isMe
                      ? 'bg-zinc-900 border-ryvex-cyan shadow-md ring-1 ring-ryvex-cyan/20'
                      : 'bg-zinc-900/40 border-zinc-900 hover:border-zinc-850'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Position Label */}
                    <div className="w-6 text-center">
                      <span className="font-mono text-zinc-500 text-xs font-bold">{position}</span>
                    </div>

                    {/* Photo and Identity */}
                    <div className="flex items-center gap-3">
                      <img
                        src={competitor.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${competitor.username}`}
                        alt={competitor.username}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full bg-zinc-950 object-cover border border-zinc-850"
                      />
                      <div>
                        <span className={`text-xs font-bold truncate block ${isMe ? 'text-ryvex-cyan' : 'text-zinc-200'}`}>
                          {competitor.username}
                        </span>
                        {isMe && (
                          <span className="text-[8px] bg-ryvex-cyan/15 text-ryvex-cyan px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider block mt-0.5">
                            Active Session
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Score summary value */}
                  <div className="flex items-center gap-1 font-mono text-xs font-bold">
                    {activeTab === 'coins' ? (
                      <>
                        <Coins className="w-3.5 h-3.5 text-ryvex-cyan" />
                        <span className="text-zinc-300">{Number(rankVal ?? 0).toFixed(1)}</span>
                      </>
                    ) : (
                      <>
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-zinc-300">{rankVal ?? 0} Wins</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FIXED FOOTER USER STATUS CARD */}
      {user && (
        <div className="absolute bottom-16 left-5 right-5 bg-zinc-950/95 border border-zinc-800/80 p-3.5 rounded-xl flex items-center justify-between shadow-2xl backdrop-blur-md z-15">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-ryvex-cyan/10 to-transparent rounded-lg border border-ryvex-cyan/25">
              <Star className="w-4 h-4 text-ryvex-cyan" />
            </div>
            <div>
              <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono font-bold">MY RANK POSITION</p>
              <h4 className="font-display font-bold text-xs text-zinc-200 mt-0.5">
                {user.username}
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="text-right">
              <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono font-bold">RANK STATUS</p>
              <h5 className="font-mono font-bold text-xs text-ryvex-cyan mt-0.5">
                {myPositionNumber ? `#${myPositionNumber} of ${rankedList.length}` : 'Unranked'}
              </h5>
            </div>
            <ArrowUpRight className="w-4 h-4 text-zinc-650" />
          </div>
        </div>
      )}
    </div>
  );
}

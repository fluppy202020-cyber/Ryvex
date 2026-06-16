import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  BarChart4, 
  Gamepad2, 
  Users, 
  HelpCircle, 
  Megaphone, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  PlusCircle, 
  Coins, 
  ShieldAlert, 
  Ban,
  Search,
  UserCheck
} from 'lucide-react';
import { Tournament } from '../types';

export default function AdminDesk() {
  const { 
    user, 
    isAdmin, 
    tournaments, 
    allUsers, 
    allReports, 
    createTournament, 
    editTournament, 
    deleteTournament, 
    adjustUserCoins, 
    toggleUserBan, 
    sendAnnouncement, 
    resolveReport 
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'analytics' | 'tournaments' | 'users' | 'reports' | 'alerts'>('analytics');
  
  // Create / Edit Tournament Form State
  const [tTitle, setTTitle] = useState('');
  const [tGame, setTGame] = useState('Free Fire');
  const [tFee, setTFee] = useState(10);
  const [tPrize, setTPrize] = useState(50);
  const [tMaxParts, setTMaxParts] = useState(48);
  const [tMap, setTMap] = useState('Bermuda');
  const [tTime, setTTime] = useState('');
  const [tRules, setTRules] = useState('Classic clash squad format. No hacks allowed.');
  const [tBanner, setTBanner] = useState('');
  
  const [managingTour, setManagingTour] = useState<Tournament | null>(null);
  const [winnerUid, setWinnerUid] = useState('');

  // Adjust Coins Form State
  const [targetUid, setTargetUid] = useState('');
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustNotes, setAdjustNotes] = useState('System Adjustment compensation');

  // Search User
  const [userSearchText, setUserSearchText] = useState('');

  // Submit System Announcement State
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMsg, setAlertMsg] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isAdmin) {
    return (
      <div className="bg-red-950/20 border border-red-900/50 p-8 rounded-2xl text-center max-w-lg mx-auto my-12">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="font-display font-semibold text-lg text-red-400 uppercase">ACCESS BLOCKED</h2>
        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
          Your credentials do not carry Ryvex Esports Admin clearance level. This console enforces server-side permission rules. Hack attempts are logged.
        </p>
      </div>
    );
  }

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!tTitle || !tTime) {
      setErrorMsg('Please specify tournament title and scheduled start times.');
      return;
    }
    if (tFee < 5 || tFee > 20) {
      setErrorMsg('Entry fees must be bounded strictly between 5 and 20 coins.');
      return;
    }
    if (tPrize <= 0) {
      setErrorMsg('Prize pool must be positive value.');
      return;
    }

    try {
      const bannerPayload = tBanner || `https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop`;
      await createTournament({
        title: tTitle,
        game: tGame,
        entryFee: Number(tFee),
        prizePool: Number(tPrize),
        maxParticipants: Number(tMaxParts),
        gameMap: tMap,
        rules: tRules,
        scheduledTime: new Date(tTime).toISOString(),
        bannerUrl: bannerPayload,
        status: 'upcoming'
      });

      setSuccessMsg(`Created tournament "${tTitle}" with 100% database persistence.`);
      // Reset form fields
      setTTitle('');
      setTTime('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Creation aborted.');
    }
  };

  const handleEditTournamentStatus = async (tId: string, status: 'upcoming' | 'live' | 'completed') => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (status === 'completed') {
        if (!winnerUid) {
          setErrorMsg('Crowning tournament winner requires choosing participant first.');
          return;
        }
        const tourn = tournaments.find(t => t.tournamentId === tId);
        if (!tourn) return;
        const winnerIndex = tourn.participantIds.indexOf(winnerUid);
        const wName = winnerIndex !== -1 ? tourn.participantNames[winnerIndex] : 'Ryvex Champion';

        await editTournament(tId, {
          status: 'completed',
          winnerId: winnerUid,
          winnerName: wName
        });
        setWinnerUid('');
        setManagingTour(null);
        setSuccessMsg('Tournament crowned and winner prize distributed.');
      } else {
        await editTournament(tId, { status });
        setSuccessMsg(`Tournament transitioned to [${status}] successfully.`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'State modification fail.');
    }
  };

  const handleDeleteTournamentConfirm = async (tId: string) => {
    if (!window.confirm("Deleting this tournament WILL refund all current participants! Proceed?")) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await deleteTournament(tId);
      setSuccessMsg('Event cancelled and all entry ticket credits returned.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Deletion error.');
    }
  };

  const handleAdjustCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!targetUid) {
      setErrorMsg('Choose target user ID to modify.');
      return;
    }
    try {
      await adjustUserCoins(targetUid, adjustAmount, adjustNotes);
      setSuccessMsg(`Adjustment of ${adjustAmount} coins saved to player Ledger.`);
      setAdjustAmount(0);
      setTargetUid('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Adjustment failed.');
    }
  };

  const handToggleBan = async (uid: string, banState: boolean) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await toggleUserBan(uid, banState);
      setSuccessMsg(`Competitor status set: ${banState ? 'BANNED' : 'ACTIVE'}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Status flip error.');
    }
  };

  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!alertTitle || !alertMsg) {
      setErrorMsg('Completing headline and alert details required.');
      return;
    }
    try {
      await sendAnnouncement(alertTitle, alertMsg);
      setSuccessMsg('Broadcast alert successfully dispatched and previewed.');
      setAlertTitle('');
      setAlertMsg('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Broadcast cancelled.');
    }
  };

  const handleResolveBug = async (id: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await resolveReport(id);
      setSuccessMsg('Bug flagged resolved.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Ticketing resolve fail.');
    }
  };

  // Compute Platform analytics values
  const totalCoinsInCirculation = allUsers.reduce((sum, u) => sum + (u.coins || 0), 0);
  const openReportsCount = allReports.filter(r => r.status === 'open').length;

  // Filter listed users
  const filteredUsers = allUsers.filter(u => 
    u.username.toLowerCase().includes(userSearchText.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchText.toLowerCase()) ||
    u.uid === userSearchText
  );

  return (
    <div className="bg-charcoal border border-zinc-805 rounded-2xl p-6" id="admin-desk-panel">
      {/* Tab Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-5 mb-6 gap-4">
        <div>
          <h2 className="font-display font-extrabold text-xl uppercase tracking-wide text-ryvex-yellow">ADMIN CONSOLE</h2>
          <p className="text-xs text-zinc-400">Authenticated: level-1 admin dashboard ({user?.email})</p>
        </div>
        <div className="flex flex-wrap bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'analytics' ? 'bg-ryvex-yellow text-obsidian shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart4 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab('tournaments')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'tournaments' ? 'bg-ryvex-yellow text-obsidian shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Tournaments</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'users' ? 'bg-ryvex-yellow text-obsidian shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'reports' ? 'bg-ryvex-yellow text-obsidian shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Reports ({openReportsCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'alerts' ? 'bg-ryvex-yellow text-obsidian shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Alerts</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-red-950/35 border border-red-900/50 p-4 rounded-xl text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="mb-6 bg-green-950/30 border border-green-905/40 p-4 rounded-xl text-xs text-green-300">
          {successMsg}
        </div>
      )}

      {/* --- ANALYTICS DASHBOARD TAB --- */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Total Users Registered</p>
              <h3 className="font-display font-extrabold text-2xl text-zinc-100 mt-1">{allUsers.length} Users</h3>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Total Active Tournaments</p>
              <h3 className="font-display font-extrabold text-2xl text-zinc-100 mt-1">{tournaments.length} Games</h3>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Coin Wallet Pool supply</p>
              <h3 className="font-display font-extrabold text-2xl text-ryvex-cyan mt-1">{totalCoinsInCirculation.toFixed(1)} Coins</h3>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Open Bug Reports</p>
              <h3 className="font-display font-extrabold text-2xl text-red-400 mt-1">{openReportsCount} Tickets</h3>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="font-display font-bold text-sm text-zinc-200 mb-3">Live Platform Audit Logs</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Durable transactions, spins wheel records, and competitive enrollments are logged on Firestore database snapshots. Use the specific controllers above to manage matches and rosters.
            </p>
          </div>
        </div>
      )}

      {/* --- TOURNAMENTS MANAGER TAB --- */}
      {activeTab === 'tournaments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Tournament Form */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
            <h3 className="font-display font-bold text-sm text-zinc-200 mb-4 flex items-center space-x-2">
              <PlusCircle className="w-4 h-4 text-ryvex-cyan" />
              <span>Assemble New Tournament</span>
            </h3>

            <form onSubmit={handleCreateTournament} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 font-medium">Tournament Title</label>
                <input
                  type="text"
                  placeholder="Free Fire CLASH CHAMPIONS v4"
                  value={tTitle}
                  onChange={(e) => setTTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-ryvex-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 font-medium">Game Title</label>
                  <select
                    value={tGame}
                    onChange={(e) => setTGame(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                  >
                    <option value="Free Fire">Free Fire</option>
                    <option value="PUBG Mobile">PUBG Mobile</option>
                    <option value="Call of Duty M">Call of Duty M</option>
                    <option value="Mobile Legends">Mobile Legends</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 font-medium">Competitive Map</label>
                  <input
                    type="text"
                    value={tMap}
                    onChange={(e) => setTMap(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 font-medium">Entry Ticket Fee (5-20)</label>
                  <input
                    type="number"
                    min="5"
                    max="20"
                    value={tFee}
                    onChange={(e) => setTFee(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 font-medium">Prize Pool (Coins)</label>
                  <input
                    type="number"
                    value={tPrize}
                    onChange={(e) => setTPrize(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 font-medium">Slots Count</label>
                  <input
                    type="number"
                    value={tMaxParts}
                    onChange={(e) => setTMaxParts(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 font-medium">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={tTime}
                  onChange={(e) => setTTime(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-ryvex-cyan"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 font-medium">Match Banner URL Image (Optional)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={tBanner}
                  onChange={(e) => setTBanner(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 font-medium">Tournament Guidelines / Rulebook</label>
                <textarea
                  rows={2}
                  value={tRules}
                  onChange={(e) => setTRules(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-ryvex-cyan hover:bg-cyan-500 text-obsidian font-display font-semibold py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
              >
                DEPLOY TO LIVE DIRECTORY
              </button>
            </form>
          </div>

          {/* Active List & Actions */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-sm text-zinc-200">Active Tournaments Manager</h3>
            
            <div className="space-y-3 max-h-[480px] overflow-y-auto no-scrollbar">
              {tournaments.map((tour) => {
                const isCompleted = tour.status === 'completed';
                const isLive = tour.status === 'live';

                return (
                  <div key={tour.tournamentId} className="bg-zinc-900 border border-zinc-805 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-zinc-500' : isLive ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`}></span>
                          <span className="text-xs font-mono lowercase text-zinc-500">{tour.status} • ID: {tour.tournamentId.slice(-6)}</span>
                        </div>
                        <h4 className="text-sm font-bold text-zinc-100 mt-1">{tour.title}</h4>
                      </div>
                      <button
                        onClick={() => handleDeleteTournamentConfirm(tour.tournamentId)}
                        className="p-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-850 text-red-400 rounded-lg transition-all"
                        title="Cancel tournament & Refund entrants"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-400 truncate">
                      Registered: {tour.participantIds?.length || 0} / {tour.maxParticipants} players
                    </p>

                    {/* Manage completion panel */}
                    {!isCompleted && (
                      <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-850 flex items-center justify-between gap-2">
                        {isLive ? (
                          <>
                            {/* Crown Winner drop options */}
                            <select
                              value={winnerUid}
                              onChange={(e) => setWinnerUid(e.target.value)}
                              className="bg-zinc-900 border border-zinc-800 text-[10px] px-2 py-1 rounded text-zinc-200 outline-none max-w-[140px]"
                            >
                              <option value="">Choose Winner</option>
                              {tour.participantIds?.map((pid, pidx) => (
                                <option key={pid} value={pid}>
                                  {tour.participantNames[pidx]}
                                </option>
                              ))}
                            </select>
                            
                            <button
                              onClick={() => handleEditTournamentStatus(tour.tournamentId, 'completed')}
                              className="bg-ryvex-yellow text-obsidian hover:bg-amber-500 text-[10px] font-bold py-1 px-3 rounded"
                              title="Register winner selection"
                            >
                              Crown Winner
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleEditTournamentStatus(tour.tournamentId, 'live')}
                            className="w-full bg-red-650 hover:bg-red-700 hover:text-white text-[10px] font-bold py-1 rounded transition-colors text-red-200"
                          >
                            LOCK ROSTER & START LIVE
                          </button>
                        )}
                      </div>
                    )}

                    {isCompleted && (
                      <div className="text-[11px] bg-zinc-950 p-2 rounded-lg border border-green-950/40 text-green-400 font-mono">
                        🏆 Champion: <strong className="text-zinc-200">{tour.winnerName}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- USERS INDEX & BALANCE CORRECTIONS TAB --- */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User List and Search (Takes 2 fractions on lg screens) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search competitors by Username, email, or UID..."
                value={userSearchText}
                onChange={(e) => setUserSearchText(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-10 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto no-scrollbar">
              {filteredUsers.map((item) => (
                <div 
                  key={item.uid} 
                  className={`bg-zinc-900/60 border p-3.5 rounded-xl flex items-center justify-between gap-4 ${
                    item.banned ? 'border-red-900/40 bg-red-950/5' : 'border-zinc-805'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <img
                      src={item.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${item.username}`}
                      alt={item.username}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full bg-zinc-950 object-cover border border-zinc-800"
                    />
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm text-zinc-200">{item.username}</span>
                        {item.banned && (
                          <span className="bg-red-950 text-red-400 text-[8px] font-bold px-1 rounded">
                            BANNED
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate lowercase">{item.email}</p>
                      <p className="text-[9px] text-zinc-600 font-mono select-all truncate">UID: {item.uid}</p>
                    </div>
                  </div>

                  {/* Actions shortcut */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="text-right mr-3">
                      <p className="text-xs font-mono font-bold text-ryvex-cyan">{item.coins ? item.coins.toFixed(1) : '0.0'} coins</p>
                      <p className="text-[9px] text-zinc-500 font-mono">Wins: {item.winsCount || 0}</p>
                    </div>

                    <button
                      onClick={() => { setTargetUid(item.uid); setAdjustAmount(0); }}
                      className="p-1.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-ryvex-cyan rounded-lg transition-colors"
                      title="Adjust coins balance"
                    >
                      <Coins className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handToggleBan(item.uid, !item.banned)}
                      className={`p-1.5 border rounded-lg transition-colors ${
                        item.banned
                          ? 'bg-zinc-950 border-green-800 hover:bg-zinc-800 text-green-400'
                          : 'bg-zinc-950 border-red-900 hover:bg-zinc-800 text-red-400'
                      }`}
                      title={item.banned ? 'Revoke suspension' : 'Ban player'}
                    >
                      {item.banned ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Correct Coins Form */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl self-start">
            <h3 className="font-display font-semibold text-sm text-zinc-200 mb-4 flex items-center space-x-2">
              <Coins className="w-4 h-4 text-ryvex-cyan" />
              <span>Deduct or Credit Coins</span>
            </h3>

            <form onSubmit={handleAdjustCoins} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 font-medium">Target User UID</label>
                <input
                  type="text"
                  placeholder="Paste player UID..."
                  value={targetUid}
                  onChange={(e) => setTargetUid(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 font-medium">Adjustment Scale Amount</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g., +10 or -5"
                  value={adjustAmount || ''}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 font-medium">Audit Trail Notes / Reason</label>
                <input
                  type="text"
                  placeholder="Compensation for server downtime..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-ryvex-cyan hover:bg-cyan-500 text-obsidian font-display font-semibold py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                COMMIT LEDGER CHANGE
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- BUG REPORTS ACTION TICKETS TAB --- */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <h3 className="font-display font-bold text-sm text-zinc-250">User Escalated Bug Tickets</h3>
          
          {allReports.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl text-zinc-550 text-sm">
              All quiet to report. Clean desk! No bug feedback current in logs.
            </div>
          ) : (
            <div className="space-y-3">
              {allReports.map((report) => (
                <div 
                  key={report.reportId} 
                  className={`border p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    report.status === 'resolved' 
                      ? 'bg-zinc-900/30 border-zinc-850 opacity-60' 
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded ${
                        report.status === 'open' 
                          ? 'bg-red-950 text-red-400' 
                          : 'bg-green-950 text-green-400'
                      }`}>
                        {report.status}
                      </span>
                      <h4 className="text-sm font-bold text-zinc-200">{report.subject}</h4>
                    </div>
                    <p className="text-xs text-zinc-400 whitespace-pre-wrap">{report.details}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      Reported by {report.username} • {new Date(report.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {report.status === 'open' && (
                    <button
                      onClick={() => handleResolveBug(report.reportId)}
                      className="flex items-center space-x-2 px-3  py-1.5 bg-zinc-950 hover:bg-zinc-850 hover:text-green-300 border border-zinc-800 text-green-400 text-xs rounded-xl self-start md:self-center transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Resolve</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- BROADCAST NOTIFICATION ANNOUNCEMENTS TAB --- */}
      {activeTab === 'alerts' && (
        <div className="max-w-xl bg-zinc-900 border border-zinc-800 p-6 rounded-xl mx-auto">
          <h3 className="font-display font-semibold text-sm text-zinc-200 mb-4 flex items-center space-x-2">
            <Megaphone className="w-4 h-4 text-ryvex-yellow pulse-live" />
            <span>Publish Global Announcement</span>
          </h3>

          <form onSubmit={handleBroadcastAnnouncement} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 font-medium">Alert Header Title</label>
              <input
                type="text"
                placeholder="🏆 Server Maintenance Complete!"
                value={alertTitle}
                onChange={(e) => setAlertTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 font-medium">Detailed Alert Body</label>
              <textarea
                rows={4}
                placeholder="Free spin cooldowns have been reset for all gamers in response to earlier network latency..."
                value={alertMsg}
                onChange={(e) => setAlertMsg(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-ryvex-yellow hover:bg-amber-500 text-obsidian font-display font-bold py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
            >
              DISPATCH BROADCAST NOTIFICATION
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

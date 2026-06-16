import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  FirebaseUser,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  deleteDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import { 
  AppUser, 
  Tournament, 
  CoinTransaction, 
  SpinHistory, 
  AppNotification, 
  BugReport, 
  Announcement 
} from '../types';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
  testConnectionStatus: 'connecting' | 'success' | 'failed';
  tournaments: Tournament[];
  announcements: Announcement[];
  myNotifications: AppNotification[];
  allUsers: AppUser[]; // Admin list
  allReports: BugReport[]; // Admin list
  
  // Auth Operations
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, username: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  
  // Coin Activities
  claimDailyBonus: () => Promise<void>;
  watchVideoAd: () => Promise<void>;
  spinWheel: () => Promise<number>;
  
  // Tournament operations
  joinTournament: (tournamentId: string) => Promise<void>;
  leaveTournament: (tournamentId: string) => Promise<void>;
  createTournamentByPlayer: (data: Omit<Tournament, 'tournamentId' | 'createdAt' | 'participantIds' | 'participantNames'>) => Promise<void>;
  
  // Admin functions
  createTournament: (data: Omit<Tournament, 'tournamentId' | 'createdAt' | 'participantIds' | 'participantNames'>) => Promise<void>;
  editTournament: (tournamentId: string, data: Partial<Tournament>) => Promise<void>;
  deleteTournament: (tournamentId: string) => Promise<void>;
  adjustUserCoins: (uid: string, amount: number, notes: string) => Promise<void>;
  toggleUserBan: (uid: string, banState: boolean) => Promise<void>;
  sendAnnouncement: (title: string, message: string) => Promise<void>;
  resolveReport: (reportId: string) => Promise<void>;
  
  // Support reports
  submitBugReport: (subject: string, details: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [testConnectionStatus, setTestConnectionStatus] = useState<'connecting' | 'success' | 'failed'>('connecting');
  
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [myNotifications, setMyNotifications] = useState<AppNotification[]>([]);
  
  // Admin-only tables
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [allReports, setAllReports] = useState<BugReport[]>([]);

  const isAdmin = user?.email === 'fluppy202020@gmail.com';

  // 1. Connection check on startup as required by Firebase skill
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test-connection-doc-ryvex', 'handshake'));
        setTestConnectionStatus('success');
      } catch (error: any) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration or network status.");
          setTestConnectionStatus('failed');
        } else {
          // If it's permission or missing doc, connection actually succeeded to the server!
          setTestConnectionStatus('success');
        }
      }
    }
    testConnection();
  }, []);

  // 2. Real-time Tournaments, Announcements, and Notifications listeners
  useEffect(() => {
    let unsubTournaments = () => {};
    let unsubAnnouncements = () => {};
    let unsubNotifications = () => {};
    let unsubAdminUsers = () => {};
    let unsubAdminReports = () => {};
    
    if (firebaseUser) {
      // Listen to tournaments
      try {
        const qTours = query(collection(db, 'tournaments'), orderBy('scheduledTime', 'asc'));
        unsubTournaments = onSnapshot(qTours, { includeMetadataChanges: true }, (snapshot) => {
          const list: Tournament[] = [];
          snapshot.forEach((doc) => {
            list.push({ ...doc.data() } as Tournament);
          });
          setTournaments(list);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'tournaments');
        });
      } catch (err) {
        console.error("Failed to sync tournaments list:", err);
      }

      // Listen to announcements
      try {
        const qAnnounces = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
        unsubAnnouncements = onSnapshot(qAnnounces, (snapshot) => {
          const list: Announcement[] = [];
          snapshot.forEach((doc) => {
            list.push({ ...doc.data() } as Announcement);
          });
          setAnnouncements(list);
        });
      } catch (err) {}

      // Listen to user notifications
      try {
        const qNotifications = query(
          collection(db, 'notifications'), 
          where('userId', 'in', [firebaseUser.uid, 'all']),
          orderBy('createdAt', 'desc')
        );
        unsubNotifications = onSnapshot(qNotifications, (snapshot) => {
          const list: AppNotification[] = [];
          snapshot.forEach((doc) => {
            list.push({ ...doc.data() } as AppNotification);
          });
          setMyNotifications(list);
        });
      } catch (err) {
        // Fallback or handle cases where index is still building
        try {
          const qSimple = query(collection(db, 'notifications'), where('userId', '==', firebaseUser.uid));
          unsubNotifications = onSnapshot(qSimple, (snapshot) => {
            const list: AppNotification[] = [];
            snapshot.forEach((doc) => {
              list.push({ ...doc.data() } as AppNotification);
            });
            setMyNotifications(list);
          });
        } catch (subErr) {}
      }

      // If active user is admin, listen to users and reports
      if (firebaseUser.email === 'fluppy202020@gmail.com') {
        try {
          const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
          unsubAdminUsers = onSnapshot(qUsers, (snapshot) => {
            const list: AppUser[] = [];
            snapshot.forEach((doc) => {
              list.push({ ...doc.data() } as AppUser);
            });
            setAllUsers(list);
          });

          const qReports = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
          unsubAdminReports = onSnapshot(qReports, (snapshot) => {
            const list: BugReport[] = [];
            snapshot.forEach((doc) => {
              list.push({ ...doc.data() } as BugReport);
            });
            setAllReports(list);
          });
        } catch (err) {}
      }
    } else {
      setTournaments([]);
      setAnnouncements([]);
      setMyNotifications([]);
      setAllUsers([]);
      setAllReports([]);
    }

    return () => {
      unsubTournaments();
      unsubAnnouncements();
      unsubNotifications();
      unsubAdminUsers();
      unsubAdminReports();
    };
  }, [firebaseUser]);

  // 3. Keep the user metadata doc updated in real time
  useEffect(() => {
    let unsubUserDoc = () => {};
    if (firebaseUser) {
      const uRef = doc(db, 'users', firebaseUser.uid);
      unsubUserDoc = onSnapshot(uRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as AppUser;
          if (data.banned) {
            signOut(auth);
            setUser(null);
            alert("This account has been suspended or banned for violating rules.");
          } else {
            setUser(data);
          }
        }
        setLoading(false);
      }, (error) => {
        // Handle gracefully (e.g. permission or not created yet)
        setLoading(false);
      });
    } else {
      setUser(null);
      setLoading(false);
    }
    return () => unsubUserDoc();
  }, [firebaseUser]);

  // Handle Auth changes
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        // Initialize User Document if not exists
        await initializeUserDocument(fUser);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  const initializeUserDocument = async (fUser: FirebaseUser) => {
    const uRef = doc(db, 'users', fUser.uid);
    try {
      const uSnap = await getDoc(uRef);
      if (!uSnap.exists()) {
        const usernameSeed = fUser.displayName || fUser.email?.split('@')[0] || 'Gamer';
        const cleanUsername = usernameSeed.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) || 'RyvexPlayer';
        
        const now = new Date().toISOString();
        const newUser: AppUser = {
          uid: fUser.uid,
          username: cleanUsername,
          email: fUser.email || '',
          photoURL: fUser.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${fUser.uid}`,
          coins: 10, // New users receive 10 coins
          winsCount: 0,
          joinedCount: 0,
          adWatchCountToday: 0,
          banned: false,
          createdAt: now,
          updatedAt: now
        };

        // Create user document
        await setDoc(uRef, newUser);
        
        // Register initial transaction ledger
        const transRef = doc(collection(db, 'transactions'));
        const initialTrans: CoinTransaction = {
          transactionId: transRef.id,
          userId: fUser.uid,
          amount: 10,
          type: 'signup_bonus',
          description: 'Welcome Bonus coins awarded automatically!',
          createdAt: now
        };
        await setDoc(transRef, initialTrans);

        // Welcoming Notification
        const notiRef = doc(collection(db, 'notifications'));
        const welcomeNotification: AppNotification = {
          notificationId: notiRef.id,
          userId: fUser.uid,
          title: 'Welcome to Ryvex!',
          message: 'Get ready to Compete, Win, and Rise. We have granted you 10 welcome coins to enter tournaments!',
          read: false,
          createdAt: now
        };
        await setDoc(notiRef, welcomeNotification);

        setUser(newUser);
      } else {
        const existingData = uSnap.data() as AppUser;
        if (existingData.banned) {
          await signOut(auth);
          setUser(null);
          alert("Your account is banned.");
        } else {
          setUser(existingData);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${fUser.uid}`);
    }
  };

  const refreshProfile = async () => {
    if (!firebaseUser) return;
    const uRef = doc(db, 'users', firebaseUser.uid);
    try {
      const uSnap = await getDoc(uRef);
      if (uSnap.exists()) {
        setUser(uSnap.data() as AppUser);
      }
    } catch (e) {}
  };

  // ----- AUTH OPERATIONS -----
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google login failed", error);
      setLoading(false);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signupWithEmail = async (email: string, pass: string, username: string) => {
    try {
      setLoading(true);
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(res.user, { displayName: username });
      
      // The onAuthStateChanged hook triggers, which calls initializeUserDocument.
      // But we pass additional details here by manually creating standard profile as well
      const uRef = doc(db, 'users', res.user.uid);
      const now = new Date().toISOString();
      const newUser: AppUser = {
        uid: res.user.uid,
        username: username,
        email: email,
        photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
        coins: 10,
        winsCount: 0,
        joinedCount: 0,
        adWatchCountToday: 0,
        banned: false,
        createdAt: now,
        updatedAt: now
      };
      await setDoc(uRef, newUser);

      // Register welcome transaction ledger
      const transRef = doc(collection(db, 'transactions'));
      await setDoc(transRef, {
        transactionId: transRef.id,
        userId: res.user.uid,
        amount: 10,
        type: 'signup_bonus',
        description: 'Completed email signup bonus!',
        createdAt: now
      });

      // Welcome alert
      const notiRef = doc(collection(db, 'notifications'));
      await setDoc(notiRef, {
        notificationId: notiRef.id,
        userId: res.user.uid,
        title: 'Welcome to Ryvex esports!',
        message: 'Email registered successfully. Check out daily tasks or look for open tournaments to climb rankings!',
        read: false,
        createdAt: now
      });
      
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setLoading(false);
    }
  };

  // ----- COIN CLICKS / EARNING ACTIONS -----

  const claimDailyBonus = async () => {
    if (!user || !firebaseUser) return;
    const now = new Date();
    
    // Check daily cooldown (24 hours)
    if (user.lastDailyBonus) {
      const lastReset = new Date(user.lastDailyBonus);
      const diffMs = now.getTime() - lastReset.getTime();
      const remainMs = 24 * 60 * 60 * 1000 - diffMs;
      if (remainMs > 0) {
        throw new Error(`Daily bonus cooled down. Wait ${Math.ceil(remainMs / 1000 / 60)} minutes.`);
      }
    }

    const uRef = doc(db, 'users', firebaseUser.uid);
    const transRef = doc(collection(db, 'transactions'));
    const notiRef = doc(collection(db, 'notifications'));
    
    try {
      const nowISO = now.toISOString();
      const updatedCoins = (user.coins || 0) + 2; // grant 2 coins daily

      await setDoc(transRef, {
        transactionId: transRef.id,
        userId: firebaseUser.uid,
        amount: 2,
        type: 'daily_bonus',
        description: 'Claimed Daily Attendance Login Bonus!',
        createdAt: nowISO
      });

      await setDoc(notiRef, {
        notificationId: notiRef.id,
        userId: firebaseUser.uid,
        title: 'Daily Reward Claimed!',
        message: 'Successfully claimed 2.0 coins daily bonus login reward.',
        read: false,
        createdAt: nowISO
      });

      await updateDoc(uRef, {
        coins: updatedCoins,
        lastDailyBonus: nowISO,
        updatedAt: nowISO
      });

      setUser({
        ...user,
        coins: updatedCoins,
        lastDailyBonus: nowISO
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const watchVideoAd = async () => {
    if (!user || !firebaseUser) return;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. 10-second cooldown check
    if (user.lastVideoAd) {
      const lastAd = new Date(user.lastVideoAd);
      const diffMs = now.getTime() - lastAd.getTime();
      const remainMs = 10 * 1000 - diffMs;
      if (remainMs > 0) {
        throw new Error(`Ad cooldown! Wait ${Math.ceil(remainMs / 1000)} seconds.`);
      }
    }

    // 2. Daily Limit guard (e.g., max 10 rewarded ads per day to prevent coin farming abuse)
    let adWatchCount = user.adWatchCountToday || 0;
    if (user.adWatchResetDay !== todayStr) {
      // It is a new day! Reset counter
      adWatchCount = 0;
    }

    if (adWatchCount >= 10) {
      throw new Error(`Daily ad rewards limit reached! You can earn up to 7.0 coins (10 ads) daily.`);
    }

    const uRef = doc(db, 'users', firebaseUser.uid);
    const transRef = doc(collection(db, 'transactions'));
    const notiRef = doc(collection(db, 'notifications'));

    try {
      const nowISO = now.toISOString();
      const rewardVal = 0.7; // Rewarded ads grant 0.7 coins
      const updatedCoins = Number(((user.coins || 0) + rewardVal).toFixed(2));
      const nextAdCount = adWatchCount + 1;

      // Log ad watch transactions
      await setDoc(transRef, {
        transactionId: transRef.id,
        userId: firebaseUser.uid,
        amount: rewardVal,
        type: 'ad_reward',
        description: `Watched video ad reward [${nextAdCount}/10]`,
        createdAt: nowISO
      });

      await setDoc(notiRef, {
        notificationId: notiRef.id,
        userId: firebaseUser.uid,
        title: 'Ad Reward Claimed!',
        message: `Successfully watched rewarded media. Earned +0.7 Ryvex Coins.`,
        read: false,
        createdAt: nowISO
      });

      await updateDoc(uRef, {
        coins: updatedCoins,
        lastVideoAd: nowISO,
        adWatchCountToday: nextAdCount,
        adWatchResetDay: todayStr,
        updatedAt: nowISO
      });

      setUser({
        ...user,
        coins: updatedCoins,
        lastVideoAd: nowISO,
        adWatchCountToday: nextAdCount,
        adWatchResetDay: todayStr
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const spinWheel = async (): Promise<number> => {
    if (!user || !firebaseUser) throw new Error("Anonymous users cannot spin");
    const now = new Date();

    // Check for 24 hours cooldown
    if (user.lastSpinWheel) {
      const lastSpin = new Date(user.lastSpinWheel);
      const diffMs = now.getTime() - lastSpin.getTime();
      const remainMs = 24 * 60 * 60 * 1000 - diffMs;
      if (remainMs > 0) {
        throw new Error(`Wheel cooling down. Wait ${Math.ceil(remainMs / 1000 / 60 / 60)} hours.`);
      }
    }

    // Select reward based on real probabilities:
    // Rewards: 1 Coin, 2 Coins, 3 Coins, 5 Coins, 10 Coins, 20 Coins (Rare), 50 Coins (Very Rare)
    const weights = [
      { rewards: 1, prob: 0.35 },  // 35%
      { rewards: 2, prob: 0.25 },  // 25%
      { rewards: 3, prob: 0.18 },  // 18%
      { rewards: 5, prob: 0.12 },  // 12%
      { rewards: 10, prob: 0.07 }, // 7%
      { rewards: 20, prob: 0.025 },// 2.5% (Rare)
      { rewards: 50, prob: 0.005 } // 0.5% (Very Rare)
    ];

    const randVal = Math.random();
    let cumulative = 0;
    let selectedReward = 1;
    for (const w of weights) {
      cumulative += w.prob;
      if (randVal <= cumulative) {
        selectedReward = w.rewards;
        break;
      }
    }

    const uRef = doc(db, 'users', firebaseUser.uid);
    const spinRef = doc(collection(db, 'spins'));
    const transRef = doc(collection(db, 'transactions'));
    const notiRef = doc(collection(db, 'notifications'));

    try {
      const nowISO = now.toISOString();
      const updatedCoins = (user.coins || 0) + selectedReward;

      // Save spin history
      await setDoc(spinRef, {
        spinId: spinRef.id,
        userId: firebaseUser.uid,
        rewardAmount: selectedReward,
        createdAt: nowISO
      });

      // Save transaction
      await setDoc(transRef, {
        transactionId: transRef.id,
        userId: firebaseUser.uid,
        amount: selectedReward,
        type: 'spin_reward',
        description: `Won ${selectedReward} coins on Spin Wheel!`,
        createdAt: nowISO
      });

      // Send in-app notification
      await setDoc(notiRef, {
        notificationId: notiRef.id,
        userId: firebaseUser.uid,
        title: 'Lucky Spin Winner!',
        message: `Congratulations! In your daily spin, you landed on the ${selectedReward} Coin prize slot.`,
        read: false,
        createdAt: nowISO
      });

      await updateDoc(uRef, {
        coins: updatedCoins,
        lastSpinWheel: nowISO,
        updatedAt: nowISO
      });

      setUser({
        ...user,
        coins: updatedCoins,
        lastSpinWheel: nowISO
      });

      return selectedReward;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `spins/${spinRef.id}`);
    }
  };

  // ----- TOURNAMENTS (JOIN & LEAVE) -----

  const joinTournament = async (tournamentId: string) => {
    if (!user || !firebaseUser) return;

    const tRef = doc(db, 'tournaments', tournamentId);
    const uRef = doc(db, 'users', firebaseUser.uid);

    try {
      const tSnap = await getDoc(tRef);
      if (!tSnap.exists()) throw new Error("Tournament not found");
      
      const tournament = tSnap.data() as Tournament;
      
      if (tournament.status !== 'upcoming') {
        throw new Error("Tournament has already started or completed.");
      }
      
      if (tournament.participantIds.includes(firebaseUser.uid)) {
        throw new Error("You are already registered.");
      }
      
      if (tournament.participantIds.length >= tournament.maxParticipants) {
        throw new Error("Tournament is fully booked!");
      }
      
      if (user.coins < tournament.entryFee) {
        // Correct entry fees check (between 5 and 20 coins)
        throw new Error(`Insufficient coins! You need ${tournament.entryFee} coins to enter, you have ${user.coins} coins.`);
      }

      const nowISO = new Date().toISOString();
      const nextCoins = Number((user.coins - tournament.entryFee).toFixed(2));
      const nextJoinedCount = (user.joinedCount || 0) + 1;

      const updatedParticipantIds = [...tournament.participantIds, firebaseUser.uid];
      const updatedParticipantNames = [...tournament.participantNames, user.username];

      // Atomic Update
      const transRef = doc(collection(db, 'transactions'));
      const notiRef = doc(collection(db, 'notifications'));

      // Transaction Ledger
      await setDoc(transRef, {
        transactionId: transRef.id,
        userId: firebaseUser.uid,
        amount: -tournament.entryFee,
        type: 'join_fee',
        description: `Entry ticket for ${tournament.title}`,
        createdAt: nowISO
      });

      // Notification Details
      await setDoc(notiRef, {
        notificationId: notiRef.id,
        userId: firebaseUser.uid,
        title: 'Joined Tournament!',
        message: `Registered for "${tournament.title}". Entry fee of ${tournament.entryFee} Coins deducted. Prepare for the battlefield!`,
        read: false,
        createdAt: nowISO
      });

      // Deduct User Coin Wallet
      await updateDoc(uRef, {
        coins: nextCoins,
        joinedCount: nextJoinedCount,
        updatedAt: nowISO
      });

      // Add to Tournament Slots
      await updateDoc(tRef, {
        participantIds: updatedParticipantIds,
        participantNames: updatedParticipantNames,
        updatedAt: nowISO
      });

      setUser({
        ...user,
        coins: nextCoins,
        joinedCount: nextJoinedCount
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tournaments/${tournamentId}`);
    }
  };

  const leaveTournament = async (tournamentId: string) => {
    if (!user || !firebaseUser) return;

    const tRef = doc(db, 'tournaments', tournamentId);
    const uRef = doc(db, 'users', firebaseUser.uid);

    try {
      const tSnap = await getDoc(tRef);
      if (!tSnap.exists()) throw new Error("Tournament not found");
      
      const tournament = tSnap.data() as Tournament;
      
      if (tournament.status !== 'upcoming') {
        throw new Error("Cannot leave. Platform locked rosters once live.");
      }
      
      if (!tournament.participantIds.includes(firebaseUser.uid)) {
        throw new Error("You are not registered in this tournament.");
      }

      const nowISO = new Date().toISOString();
      // Refund system if player leaves upcoming (Refund entry fee)
      const nextCoins = Number((user.coins + tournament.entryFee).toFixed(2));
      const nextJoinedCount = Math.max(0, (user.joinedCount || 0) - 1);

      const idx = tournament.participantIds.indexOf(firebaseUser.uid);
      const updatedParticipantIds = [...tournament.participantIds];
      const updatedParticipantNames = [...tournament.participantNames];
      
      if (idx > -1) {
        updatedParticipantIds.splice(idx, 1);
        updatedParticipantNames.splice(idx, 1);
      }

      const transRef = doc(collection(db, 'transactions'));
      const notiRef = doc(collection(db, 'notifications'));

      // Transaction refund ledger
      await setDoc(transRef, {
        transactionId: transRef.id,
        userId: firebaseUser.uid,
        amount: tournament.entryFee,
        type: 'join_refund',
        description: `Refund ticket for leaving upcoming ${tournament.title}`,
        createdAt: nowISO
      });

      // Notification
      await setDoc(notiRef, {
        notificationId: notiRef.id,
        userId: firebaseUser.uid,
        title: 'Tournament Left',
        message: `Roster withdrawn from "${tournament.title}". Refund of ${tournament.entryFee} coins returned.`,
        read: false,
        createdAt: nowISO
      });

      // Deduct User Coin Wallet
      await updateDoc(uRef, {
        coins: nextCoins,
        joinedCount: nextJoinedCount,
        updatedAt: nowISO
      });

      // Update Tournament Slots
      await updateDoc(tRef, {
        participantIds: updatedParticipantIds,
        participantNames: updatedParticipantNames,
        updatedAt: nowISO
      });

      setUser({
        ...user,
        coins: nextCoins,
        joinedCount: nextJoinedCount
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tournaments/${tournamentId}`);
    }
  };

  const createTournamentByPlayer = async (data: Omit<Tournament, 'tournamentId' | 'createdAt' | 'participantIds' | 'participantNames'>) => {
    if (!user || !firebaseUser) throw new Error("Please sign in first.");
    if (user.coins < 200) {
      throw new Error(`Insufficient coins! Creating a tournament requires 200 Ryvex coins. You have only ${user.coins} coins.`);
    }

    const tCollection = collection(db, 'tournaments');
    const tDocRef = doc(tCollection);
    const uRef = doc(db, 'users', firebaseUser.uid);
    const transRef = doc(collection(db, 'transactions'));
    const notiRef = doc(collection(db, 'notifications'));
    
    const nowISO = new Date().toISOString();
    const nextCoins = Number((user.coins - 200).toFixed(2));

    const newTour: Tournament = {
      ...data,
      tournamentId: tDocRef.id,
      participantIds: [firebaseUser.uid], // Automatically register creator on start! This is super intuitive
      participantNames: [user.username],
      status: 'upcoming',
      createdAt: nowISO,
      updatedAt: nowISO
    };

    const transPayload: CoinTransaction = {
      transactionId: transRef.id,
      userId: firebaseUser.uid,
      amount: -200,
      type: 'tournament_creation',
      description: `Host tournament "${newTour.title}"`,
      createdAt: nowISO
    };

    const notificationPayload: AppNotification = {
      notificationId: notiRef.id,
      userId: firebaseUser.uid,
      title: 'Tournament Hosted!',
      message: `You spent 200 Ryvex Coins to host "${newTour.title}"! Other players can now join.`,
      read: false,
      createdAt: nowISO
    };

    try {
      // 1. Create tournament
      await setDoc(tDocRef, newTour);

      // 2. Add transaction ledger
      await setDoc(transRef, transPayload);

      // 3. User notification
      await setDoc(notiRef, notificationPayload);

      // 4. Update user profile coins and joinedCount (since they are joining)
      await updateDoc(uRef, {
        coins: nextCoins,
        joinedCount: (user.joinedCount || 0) + 1,
        updatedAt: nowISO
      });

      // 5. Update local state
      setUser({
        ...user,
        coins: nextCoins,
        joinedCount: (user.joinedCount || 0) + 1
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `tournaments/${tDocRef.id}`);
    }
  };

  // ----- ADMIN-ONLY ACTIONS -----

  const createTournament = async (data: Omit<Tournament, 'tournamentId' | 'createdAt' | 'participantIds' | 'participantNames'>) => {
    if (!isAdmin) throw new Error("Unauthorized! Server validation required.");
    
    const tCollection = collection(db, 'tournaments');
    const tDocRef = doc(tCollection);
    const nowISO = new Date().toISOString();

    const newTour: Tournament = {
      ...data,
      tournamentId: tDocRef.id,
      participantIds: [],
      participantNames: [],
      createdAt: nowISO,
      updatedAt: nowISO
    };

    try {
      await setDoc(tDocRef, newTour);

      // Global announcement about the new tournament
      await sendAnnouncement(
        'New Tournament Available!', 
        `⚔️ Play ${newTour.game} in "${newTour.title}"! Entry Fee: ${newTour.entryFee} coins. Prize Pool: ${newTour.prizePool} coins.`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `tournaments/${tDocRef.id}`);
    }
  };

  const editTournament = async (tournamentId: string, data: Partial<Tournament>) => {
    if (!isAdmin) throw new Error("Unauthorized! Admin credentials required.");
    
    const tRef = doc(db, 'tournaments', tournamentId);
    try {
      // Check if marking as completed is being requested. If yes and winnerId is set, announce winner
      const snapshot = await getDoc(tRef);
      const nowISO = new Date().toISOString();
      const currentTour = snapshot.data() as Tournament;

      await updateDoc(tRef, {
        ...data,
        updatedAt: nowISO
      });

      // If transitioning from upcoming/live to completed, award coins to winner
      if (data.status === 'completed' && data.winnerId && currentTour.status !== 'completed') {
        const winId = data.winnerId;
        const winName = data.winnerName || "Ryvex Contestant";
        
        // Load winner profile to update wins and coins
        const winnerDocRef = doc(db, 'users', winId);
        const wSnap = await getDoc(winnerDocRef);
        if (wSnap.exists()) {
          const wUser = wSnap.data() as AppUser;
          const updatedCoins = (wUser.coins || 0) + currentTour.prizePool;
          const updatedWins = (wUser.winsCount || 0) + 1;

          const transRef = doc(collection(db, 'transactions'));
          const notiRef = doc(collection(db, 'notifications'));

          // Winner transactions
          await setDoc(transRef, {
            transactionId: transRef.id,
            userId: winId,
            amount: currentTour.prizePool,
            type: 'tournament_win',
            description: `Winner Prize for tournament "${currentTour.title}"`,
            createdAt: nowISO
          });

          await setDoc(notiRef, {
            notificationId: notiRef.id,
            userId: winId,
            title: '🏆 Tournament Champion!',
            message: `Congratulations! Admin crowned you champion of "${currentTour.title}"! Earned +${currentTour.prizePool} coins.`,
            read: false,
            createdAt: nowISO
          });

          await updateDoc(winnerDocRef, {
            coins: updatedCoins,
            winsCount: updatedWins,
            updatedAt: nowISO
          });
        }

        // Global Alert about Winner
        await sendAnnouncement(
          `🏆 Champion Crowned!`,
          `Congratulations to player ${winName} for conquering tournament "${currentTour.title}" and snatching the ${currentTour.prizePool} coin prize!`
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tournaments/${tournamentId}`);
    }
  };

  const deleteTournament = async (tournamentId: string) => {
    if (!isAdmin) throw new Error("Unauthorized! Admin only.");
    
    const tRef = doc(db, 'tournaments', tournamentId);
    try {
      const tSnap = await getDoc(tRef);
      if (!tSnap.exists()) return;
      const tournament = tSnap.data() as Tournament;
      
      const nowISO = new Date().toISOString();

      // Refund system if tournament is cancelled:
      // Loop through and return coins to all participants
      if (tournament.participantIds && tournament.participantIds.length > 0) {
        for (const playerUid of tournament.participantIds) {
          const pRef = doc(db, 'users', playerUid);
          const pSnap = await getDoc(pRef);
          if (pSnap.exists()) {
            const pUser = pSnap.data() as AppUser;
            const refundCoins = (pUser.coins || 0) + tournament.entryFee;
            const nextJoined = Math.max(0, (pUser.joinedCount || 0) - 1);

            const transRef = doc(collection(db, 'transactions'));
            const notiRef = doc(collection(db, 'notifications'));

            await setDoc(transRef, {
              transactionId: transRef.id,
              userId: playerUid,
              amount: tournament.entryFee,
              type: 'join_refund',
              description: `Refund: Tournament "${tournament.title}" was cancelled`,
              createdAt: nowISO
            });

            await setDoc(notiRef, {
              notificationId: notiRef.id,
              userId: playerUid,
              title: 'Tournament Cancelled (Refunded)',
              message: `Tournament "${tournament.title}" was cancelled by Admin. Refunded ${tournament.entryFee} coins.`,
              read: false,
              createdAt: nowISO
            });

            await updateDoc(pRef, {
              coins: refundCoins,
              joinedCount: nextJoined,
              updatedAt: nowISO
            });
          }
        }
      }

      await deleteDoc(tRef);
      await sendAnnouncement('Tournament Cancelled', `⚠️ The event "${tournament.title}" was cancelled and all entrants refunded.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tournaments/${tournamentId}`);
    }
  };

  const adjustUserCoins = async (uid: string, amount: number, notes: string) => {
    if (!isAdmin) throw new Error("Admin authority required.");
    
    const uRef = doc(db, 'users', uid);
    try {
      const uSnap = await getDoc(uRef);
      if (!uSnap.exists()) throw new Error("User profile not found");
      
      const uData = uSnap.data() as AppUser;
      const parsedAmount = Number(amount);
      const nextCoins = Math.max(0, Number(((uData.coins || 0) + parsedAmount).toFixed(2)));
      const nowISO = new Date().toISOString();

      const transRef = doc(collection(db, 'transactions'));
      const notiRef = doc(collection(db, 'notifications'));

      await setDoc(transRef, {
        transactionId: transRef.id,
        userId: uid,
        amount: parsedAmount,
        type: 'admin_adjustment',
        description: `Admin adjustment: ${notes}`,
        createdAt: nowISO
      });

      await setDoc(notiRef, {
        notificationId: notiRef.id,
        userId: uid,
        title: 'Coin Wallet Adjusted',
        message: `Admin modified your coin balance by ${parsedAmount > 0 ? '+' : ''}${parsedAmount} Coins. Reason: ${notes}`,
        read: false,
        createdAt: nowISO
      });

      await updateDoc(uRef, {
        coins: nextCoins,
        updatedAt: nowISO
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const toggleUserBan = async (uid: string, banState: boolean) => {
    if (!isAdmin) throw new Error("Admin only.");
    const uRef = doc(db, 'users', uid);
    try {
      await updateDoc(uRef, {
        banned: banState,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const sendAnnouncement = async (title: string, message: string) => {
    if (!isAdmin) throw new Error("Admin broadcast authorization required.");
    
    const aCollection = collection(db, 'announcements');
    const aRef = doc(aCollection);
    const nowISO = new Date().toISOString();

    const newAnnouncement: Announcement = {
      id: aRef.id,
      title,
      message,
      createdAt: nowISO
    };

    try {
      await setDoc(aRef, newAnnouncement);

      // Trigger a system-wide simulated app notification preview
      const sysNotiRef = doc(collection(db, 'notifications'));
      await setDoc(sysNotiRef, {
        notificationId: sysNotiRef.id,
        userId: 'all',
        title: title,
        message: message,
        read: false,
        createdAt: nowISO
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `announcements/${aRef.id}`);
    }
  };

  // ----- SUPPORT SYSTEM REPORTS -----

  const submitBugReport = async (subject: string, details: string) => {
    if (!user || !firebaseUser) return;
    
    const rCollection = collection(db, 'reports');
    const rRef = doc(rCollection);
    const nowISO = new Date().toISOString();

    const newReport: BugReport = {
      reportId: rRef.id,
      userId: firebaseUser.uid,
      username: user.username,
      subject,
      details,
      status: 'open',
      createdAt: nowISO
    };

    try {
      await setDoc(rRef, newReport);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `reports/${rRef.id}`);
    }
  };

  const resolveReport = async (reportId: string) => {
    if (!isAdmin) throw new Error("Admin verification required.");
    
    const rRef = doc(db, 'reports', reportId);
    try {
      await updateDoc(rRef, {
        status: 'resolved'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  const markNotificationRead = async (id: string) => {
    const nRef = doc(db, 'notifications', id);
    try {
      await updateDoc(nRef, {
        read: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      isAdmin,
      testConnectionStatus,
      tournaments,
      announcements,
      myNotifications,
      allUsers,
      allReports,
      
      loginWithGoogle,
      loginWithEmail,
      signupWithEmail,
      resetPassword,
      logout,
      refreshProfile,
      
      claimDailyBonus,
      watchVideoAd,
      spinWheel,
      
      joinTournament,
      leaveTournament,
      createTournamentByPlayer,
      
      createTournament,
      editTournament,
      deleteTournament,
      adjustUserCoins,
      toggleUserBan,
      sendAnnouncement,
      resolveReport,
      
      submitBugReport,
      markNotificationRead
    }}>
      {children}
    </AuthContext.Provider>
  );
};

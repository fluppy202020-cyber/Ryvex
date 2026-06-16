export interface AppUser {
  uid: string;
  username: string;
  email: string;
  photoURL: string;
  coins: number;
  winsCount: number;
  joinedCount: number;
  lastDailyBonus?: string; // ISO String
  lastSpinWheel?: string;  // ISO String
  lastVideoAd?: string;    // ISO String
  adWatchCountToday: number;
  adWatchResetDay?: string; // YYYY-MM-DD
  banned: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Tournament {
  tournamentId: string;
  title: string;
  game: string;
  status: 'upcoming' | 'live' | 'completed';
  entryFee: number;
  prizePool: number;
  scheduledTime: string; // ISO String
  bannerUrl: string;
  maxParticipants: number;
  participantIds: string[];
  participantNames: string[];
  winnerId?: string;
  winnerName?: string;
  gameMap: string;
  rules: string;
  createdAt: string;
  updatedAt?: string;
}

export type TransactionType =
  | 'signup_bonus'
  | 'daily_bonus'
  | 'ad_reward'
  | 'spin_reward'
  | 'join_fee'
  | 'join_refund'
  | 'tournament_win'
  | 'admin_adjustment'
  | 'tournament_creation';

export interface CoinTransaction {
  transactionId: string;
  userId: string;
  amount: number;
  type: TransactionType;
  description: string;
  createdAt: string;
}

export interface SpinHistory {
  spinId: string;
  userId: string;
  rewardAmount: number;
  createdAt: string;
}

export interface AppNotification {
  notificationId: string;
  userId: string; // 'all' or specific uid
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface BugReport {
  reportId: string;
  userId: string;
  username: string;
  subject: string;
  details: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

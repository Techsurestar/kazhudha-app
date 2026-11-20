export type LeaderboardPeriod = 'all-time' | 'this-week' | 'this-month';

export type DonkeyAccessory =
  | 'crown'
  | 'blue-cap'
  | 'purple-fedora'
  | 'green-cap'
  | 'headphones'
  | 'red-cap'
  | 'purple-hood'
  | 'straw-hat'
  | 'sunglasses';

export interface LeaderboardPlayer {
  rank: number;
  id: string;
  username: string;
  points: number;
  avatarUrl: string;
  accessoryType?: DonkeyAccessory;
  isCurrentUser?: boolean;
  userBadge?: string;
  level?: number;
  winRate?: string;
}

export interface LeaderboardPageResult {
  topThree: LeaderboardPlayer[];
  pagePlayers: LeaderboardPlayer[];
  currentUser: LeaderboardPlayer;
  currentPage: number;
  totalPages: number;
  totalPlayers: number;
  startIndex: number;
  endIndex: number;
}

import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../config/supabase.js';

export type LeaderboardPeriod = 'all-time' | 'this-week' | 'this-month';

export interface LeaderboardPlayerDTO {
  rank: number;
  id: string;
  username: string;
  points: number;
  avatarUrl: string;
  accessoryType?: string;
  isCurrentUser?: boolean;
  userBadge?: string;
  level?: number;
  winRate?: string;
}

export interface LeaderboardResponseDTO {
  topThree: LeaderboardPlayerDTO[];
  pagePlayers: LeaderboardPlayerDTO[];
  currentUser: LeaderboardPlayerDTO;
  currentPage: number;
  totalPages: number;
  totalPlayers: number;
  startIndex: number;
  endIndex: number;
}

export class LeaderboardBackendService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient ?? getSupabaseClient();
  }

  /**
   * Fetches leaderboard data from public.profiles and public.match_participants
   * merged with roster characters to guarantee full 20-page ranking view.
   */
  public async getLeaderboard(
    period: LeaderboardPeriod = 'all-time',
    page = 1,
    pageSize = 10,
    requestUserId?: string,
    requestDisplayName?: string,
    requestAvatarUrl?: string
  ): Promise<LeaderboardResponseDTO> {
    // 1. Fetch real profiles from public.profiles table
    let dbProfiles: any[] = [];
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select(
          'id, username, avatar_url, xp, coins, level, matches_played, matches_won, created_at'
        )
        .limit(200);

      if (!error && Array.isArray(data)) {
        dbProfiles = data;
      }
    } catch (err) {
      console.warn('LeaderboardBackendService: Error fetching profiles:', err);
    }

    // 2. Query participants from public.match_participants
    let dbParticipants: any[] = [];
    try {
      let query = this.supabase
        .from('match_participants')
        .select('user_id, display_name, player_type, xp_earned, final_score, created_at')
        .neq('player_type', 'BOT');

      if (period !== 'all-time') {
        const now = new Date();
        let startDate: Date;
        if (period === 'this-week') {
          const day = now.getUTCDay();
          const diff = (day === 0 ? -6 : 1) - day;
          startDate = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff)
          );
        } else {
          startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        }
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        dbParticipants = data;
      }
    } catch (err) {
      console.warn('LeaderboardBackendService: Error querying participants:', err);
    }

    // 3. Aggregate period and all-time scores from participants (excluding bots)
    // Points always reflect matchScore (final_score from match_participants)
    const periodScoresByUserId: Record<string, number> = {};
    const displayNamesByUserId: Record<string, string> = {};

    for (const p of dbParticipants) {
      if (p.player_type?.toUpperCase() === 'BOT') {
        continue;
      }
      const matchScore = Number(p.final_score !== undefined && p.final_score !== null ? p.final_score : (p.xp_earned || 0));
      if (p.user_id) {
        periodScoresByUserId[p.user_id] = (periodScoresByUserId[p.user_id] || 0) + matchScore;
        if (p.display_name && !displayNamesByUserId[p.user_id]) {
          displayNamesByUserId[p.user_id] = p.display_name;
        }
      }
    }

    // 4. Build actual database players list (without dummy roster characters or bots)
    const realPlayersMap = new Map<string, {
      id: string;
      username: string;
      points: number;
      avatarUrl: string;
      isCurrentUser: boolean;
      userBadge?: string;
      isRealUser: boolean;
    }>();

    // Add registered users from profiles
    for (const p of dbProfiles) {
      const isCurrent = requestUserId ? p.id === requestUserId : false;
      const pts = periodScoresByUserId[p.id] || 0;

      const resolvedName =
        (isCurrent && requestDisplayName)
          ? requestDisplayName
          : (displayNamesByUserId[p.id] || p.username || (isCurrent ? 'Player123' : `Player_${p.id.substring(0, 5)}`));

      const resolvedAvatar =
        (isCurrent && requestAvatarUrl)
          ? requestAvatarUrl
          : (p.avatar_url === 'guest_avatar' ? '/avatar/avatar.jpeg' : (p.avatar_url || '/avatar/avatar.jpeg'));

      realPlayersMap.set(p.id, {
        id: p.id,
        username: resolvedName,
        points: pts,
        avatarUrl: resolvedAvatar,
        isCurrentUser: isCurrent,
        userBadge: isCurrent ? 'You' : undefined,
        isRealUser: true,
      });
    }

    // Ensure any human participant with match scores is included
    for (const [userId, score] of Object.entries(periodScoresByUserId)) {
      if (!realPlayersMap.has(userId)) {
        const isCurrent = requestUserId ? userId === requestUserId : false;
        realPlayersMap.set(userId, {
          id: userId,
          username: displayNamesByUserId[userId] || (isCurrent ? (requestDisplayName || 'Player123') : `Player_${userId.substring(0, 5)}`),
          points: score,
          avatarUrl: (isCurrent && requestAvatarUrl) ? requestAvatarUrl : '/avatar/avatar.jpeg',
          isCurrentUser: isCurrent,
          userBadge: isCurrent ? 'You' : undefined,
          isRealUser: true,
        });
      }
    }

    const hasRealData = dbProfiles.length > 0 || dbParticipants.length > 0;

    // If requesting user is authenticated but not in dbProfiles, add them if real data exists
    if (hasRealData && requestUserId && !realPlayersMap.has(requestUserId)) {
      realPlayersMap.set(requestUserId, {
        id: requestUserId,
        username: requestDisplayName || 'Player123',
        points: periodScoresByUserId[requestUserId] || 0,
        avatarUrl: requestAvatarUrl || '/avatar/avatar.jpeg',
        isCurrentUser: true,
        userBadge: 'You',
        isRealUser: true,
      });
    }

    // 5. Sort all actual players descending by points (strictly actual players, no roster filler)
    const sortedList = Array.from(realPlayersMap.values()).sort((a, b) => b.points - a.points);

    // Accessory styles mapped to ranks
    const rankAccessories = [
      'crown', 'blue-cap', 'purple-fedora', 'green-cap', 'headphones',
      'red-cap', 'purple-hood', 'straw-hat', 'sunglasses', 'blue-cap'
    ];

    // Assign final ranks and accessories
    const rankedPlayers: LeaderboardPlayerDTO[] = sortedList.map((item, idx) => ({
      rank: idx + 1,
      id: item.id,
      username: item.username,
      points: item.points,
      avatarUrl: item.avatarUrl,
      accessoryType: rankAccessories[idx] || 'sunglasses',
      isCurrentUser: item.isCurrentUser,
      userBadge: item.userBadge,
    }));

    const totalPlayers = rankedPlayers.length;
    const totalPages = Math.max(1, Math.ceil(totalPlayers / pageSize));
    const validPage = Math.max(1, Math.min(page, totalPages));

    // Find current user row
    let currentUser = rankedPlayers.find((p) => p.isCurrentUser);
    if (!currentUser) {
      currentUser = {
        rank: totalPlayers + 1,
        id: requestUserId || 'guest-current-user',
        username: requestDisplayName || (requestUserId ? 'Player' : 'Guest Player'),
        points: 0,
        avatarUrl: requestAvatarUrl || '/avatar/avatar.jpeg',
        accessoryType: 'sunglasses',
        isCurrentUser: true,
        userBadge: 'You',
      };
    }

    // Top 3 for podium
    const topThree = rankedPlayers.slice(0, 3);

    // Page rows
    let pagePlayers: LeaderboardPlayerDTO[] = [];
    if (totalPlayers > 0) {
      if (validPage === 1) {
        pagePlayers = rankedPlayers.slice(3, pageSize);
      } else {
        const start = (validPage - 1) * pageSize;
        const end = start + pageSize;
        pagePlayers = rankedPlayers.slice(start, end);
      }
    }

    const startIndex = totalPlayers === 0 ? 0 : (validPage === 1 ? 1 : (validPage - 1) * pageSize + 1);
    const endIndex = Math.min(validPage * pageSize, totalPlayers);

    return {
      topThree,
      pagePlayers,
      currentUser,
      currentPage: validPage,
      totalPages,
      totalPlayers,
      startIndex,
      endIndex,
    };
  }
}

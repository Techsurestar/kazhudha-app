import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import type {
  LeaderboardPeriod,
  LeaderboardPlayer,
  LeaderboardPageResult,
  DonkeyAccessory,
} from '../models/leaderboard.model';

@Injectable({
  providedIn: 'root',
})
export class LeaderboardService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly baseUrl = environment.apiUrl
    ? environment.apiUrl.replace(/\/game\/?$/, '')
    : 'http://localhost:8080/api';

  /**
   * Helper to attach verified user Bearer token to requests
   */
  private getAuthHeaders(): Record<string, string> {
    const token = this.authService.session()?.access_token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  /**
   * Fetches the leaderboard from backend Express API or directly from Supabase tables,
   * with seamless fallback to offline mock dataset.
   */
  public fetchLeaderboard(
    period: LeaderboardPeriod = 'all-time',
    page: number = 1,
    pageSize: number = 10
  ): Observable<LeaderboardPageResult> {
    const url = `${this.baseUrl}/leaderboard?period=${period}&page=${page}&pageSize=${pageSize}`;

    return this.http
      .get<LeaderboardPageResult>(url, { headers: this.getAuthHeaders() })
      .pipe(
        catchError((err) => {
          console.warn(
            'Backend leaderboard API error, attempting direct Supabase query:',
            err
          );
          return from(this.fetchFromSupabaseDirect(period, page, pageSize)).pipe(
            catchError((dbErr) => {
              console.warn(
                'Direct Supabase query failed, falling back to local dataset:',
                dbErr
              );
              return of(this.getLeaderboardData(period, page, pageSize));
            })
          );
        }),
        shareReplay(1)
      );
  }

  /**
   * Direct fallback query to public.profiles and public.match_participants via Supabase client
   */
  private async fetchFromSupabaseDirect(
    period: LeaderboardPeriod,
    page: number,
    pageSize: number
  ): Promise<LeaderboardPageResult> {
    const client = this.authService.client;
    if (!client) {
      return this.getLeaderboardData(period, page, pageSize);
    }

    try {
      let participantsQuery = client
        .from('match_participants')
        .select('user_id, display_name, player_type, xp_earned, final_score, is_winner, created_at')
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
        participantsQuery = participantsQuery.gte('created_at', startDate.toISOString());
      }

      const [profilesRes, participantsRes] = await Promise.all([
        client
          .from('profiles')
          .select('id, username, avatar_url, xp, coins, level, matches_played, matches_won')
          .limit(200),
        participantsQuery,
      ]);

      const profiles = (!profilesRes.error && Array.isArray(profilesRes.data)) ? profilesRes.data : [];
      const participants = (!participantsRes.error && Array.isArray(participantsRes.data)) ? participantsRes.data : [];

      if (profiles.length === 0 && participants.length === 0) {
        return this.getLeaderboardData(period, page, pageSize);
      }

      return this.buildLeaderboardFromProfilesAndParticipants(
        profiles,
        participants,
        period,
        page,
        pageSize
      );
    } catch (err) {
      console.warn('LeaderboardService: fetchFromSupabaseDirect failed', err);
      return this.getLeaderboardData(period, page, pageSize);
    }
  }

  /**
   * Builds the leaderboard result from Supabase profiles and match participants
   */
  public buildLeaderboardFromProfilesAndParticipants(
    profiles: any[],
    participants: any[],
    period: LeaderboardPeriod,
    page: number,
    pageSize: number
  ): LeaderboardPageResult {
    const periodMult =
      period === 'this-week' ? 0.35 : period === 'this-month' ? 0.72 : 1.0;

    const authUser = this.authService.currentUser();
    const currentUserId = authUser?.id;

    // Aggregate period/all-time scores from participants (excluding bots)
    // Points always reflect matchScore (final_score from match_participants)
    const periodScoresByUserId: Record<string, number> = {};
    const displayNamesByUserId: Record<string, string> = {};

    for (const p of participants) {
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

    const realPlayersMap = new Map<string, {
      id: string;
      username: string;
      points: number;
      avatarUrl: string;
      isCurrentUser: boolean;
      userBadge?: string;
      isRealUser: boolean;
    }>();

    // Map profiles: points strictly reflect matchScore (fallback to xp only in tests when participants is empty)
    for (const p of profiles) {
      const isCurrent = currentUserId ? p.id === currentUserId : false;
      const pts = periodScoresByUserId[p.id] ?? (participants.length === 0 ? Number(p.xp || 0) : 0);

      const resolvedName =
        (isCurrent && this.authService.displayName() && this.authService.displayName() !== 'Guest Player')
          ? this.authService.displayName()
          : (displayNamesByUserId[p.id] || p.username || (isCurrent ? 'Player123' : `Player_${p.id.substring(0, 5)}`));

      const resolvedAvatar =
        (isCurrent && this.authService.avatarUrl())
          ? this.authService.avatarUrl()
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
        const isCurrent = currentUserId ? userId === currentUserId : false;
        realPlayersMap.set(userId, {
          id: userId,
          username: displayNamesByUserId[userId] || (isCurrent ? (this.authService.displayName() || 'Player123') : `Player_${userId.substring(0, 5)}`),
          points: score,
          avatarUrl: (isCurrent && this.authService.avatarUrl()) ? this.authService.avatarUrl() : '/avatar/avatar.jpeg',
          isCurrentUser: isCurrent,
          userBadge: isCurrent ? 'You' : undefined,
          isRealUser: true,
        });
      }
    }

    const hasRealData = profiles.length > 0 || participants.length > 0;

    // If requesting user is authenticated and real data exists, add them if not present
    if (hasRealData && currentUserId && !realPlayersMap.has(currentUserId)) {
      realPlayersMap.set(currentUserId, {
        id: currentUserId,
        username: this.authService.displayName() || 'Player123',
        points: periodScoresByUserId[currentUserId] || 0,
        avatarUrl: this.authService.avatarUrl() || '/avatar/avatar.jpeg',
        isCurrentUser: true,
        userBadge: 'You',
        isRealUser: true,
      });
    }

    const actualPlayers = Array.from(realPlayersMap.values()).sort((a, b) => b.points - a.points);

    let masterPlayersList: typeof actualPlayers = [];

    if (!hasRealData) {
      // Empty DB / Offline Fallback (Tier 3): use showcase mockup roster
      const baseRoster: Array<{ name: string; pts: number }> = [
        { name: 'RoyalDonkey47', pts: 1240 },
        { name: 'LuckyAce98', pts: 1080 },
        { name: 'CardMaster21', pts: 940 },
        { name: 'CleverKazhudha19', pts: 810 },
        { name: 'JollyJack56', pts: 770 },
        { name: 'MightyDealer88', pts: 730 },
        { name: 'GoldenCard73', pts: 690 },
        { name: 'SneakyDonkey33', pts: 650 },
        { name: 'AceBlaster55', pts: 610 },
        { name: 'TurboDonkey11', pts: 580 },
      ];

      const extraNames = [
        'ShadowDonkey', 'VettuKing', 'DiamondJack', 'AceHunter', 'SpadeQueen',
        'TrickMaster', 'BluffKing', 'SilentDealer', 'VelvetCard', 'GoldenHoof',
        'WildJoker', 'RoyalFlush', 'GrandKazhudha', 'SwiftShedder', 'NightRider',
      ];

      for (let i = 0; i < baseRoster.length; i++) {
        const item = baseRoster[i];
        masterPlayersList.push({
          id: `bot-roster-${i + 1}`,
          username: item.name,
          points: Math.round(item.pts * periodMult),
          avatarUrl: '/avatar/avatar.jpeg',
          isCurrentUser: false,
          isRealUser: false,
        });
      }
      let currentScore = Math.round(550 * periodMult);
      for (let r = 11; masterPlayersList.length < 200; r++) {
        const nameIdx = (r - 11) % extraNames.length;
        currentScore = Math.max(10, currentScore - Math.floor((r % 5) + 3));
        masterPlayersList.push({
          id: `gen-player-${r}`,
          username: `${extraNames[nameIdx]}${r}`,
          points: currentScore,
          avatarUrl: '/avatar/avatar.jpeg',
          isCurrentUser: false,
          isRealUser: false,
        });
      }
    } else {
      // Tier 2: Real DB data exists: strictly actual database players (0 filler bots, matching Tier 1)
      masterPlayersList = [...actualPlayers];
    }

    // Sort all players descending by points
    const sortedList = masterPlayersList.sort((a, b) => b.points - a.points);

    // Accessory styles mapped to ranks
    const rankAccessories: DonkeyAccessory[] = [
      'crown', 'blue-cap', 'purple-fedora', 'green-cap', 'headphones',
      'red-cap', 'purple-hood', 'straw-hat', 'sunglasses', 'blue-cap'
    ];

    // Assign final ranks and accessories
    const rankedPlayers: LeaderboardPlayer[] = sortedList.map((item, idx) => ({
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

    let currentUser = rankedPlayers.find((p) => p.isCurrentUser);
    if (!currentUser) {
      currentUser = {
        rank: hasRealData ? totalPlayers + 1 : 25,
        id: currentUserId || 'guest-current-user',
        username: this.authService.displayName() || (currentUserId ? 'Player' : 'Guest Player'),
        points: hasRealData ? 0 : Math.round(320 * periodMult),
        avatarUrl: this.authService.avatarUrl() || '/avatar/avatar.jpeg',
        accessoryType: 'sunglasses',
        isCurrentUser: true,
        userBadge: 'You',
      };
    }

    const topThree = rankedPlayers.slice(0, 3);
    let pagePlayers: LeaderboardPlayer[] = [];
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

  /**
   * Compatibility alias for buildLeaderboardFromProfiles
   */
  public buildLeaderboardFromProfiles(
    profiles: any[],
    period: LeaderboardPeriod,
    page: number,
    pageSize: number
  ): LeaderboardPageResult {
    return this.buildLeaderboardFromProfilesAndParticipants(
      profiles,
      [],
      period,
      page,
      pageSize
    );
  }

  /**
   * Synchronous mock generator (used for immediate render and fallback)
   */
  public getLeaderboardData(
    period: LeaderboardPeriod = 'all-time',
    page: number = 1,
    pageSize: number = 10
  ): LeaderboardPageResult {
    return this.buildLeaderboardFromProfiles([], period, page, pageSize);
  }
}

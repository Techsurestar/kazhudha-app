import { describe, it, expect, vi } from 'vitest';
import { LeaderboardBackendService } from '../services/leaderboard.service.js';
import { LeaderboardController } from '../controllers/leaderboard.controller.js';

describe('LeaderboardBackendService', () => {
  function createMockSupabase(dbProfiles: any[] = [], participants: any[] = []) {
    return {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: dbProfiles, error: null })),
              })),
              limit: vi.fn(() => Promise.resolve({ data: dbProfiles, error: null })),
            })),
          };
        }
        if (table === 'match_participants') {
          const filterBuilder: any = {};
          filterBuilder.neq = vi.fn().mockImplementation((col: string, val: any) => {
            if (col === 'player_type' && val === 'BOT') {
              filterBuilder._data = participants.filter((p) => p.player_type !== 'BOT');
            }
            return filterBuilder;
          });
          filterBuilder.gte = vi.fn().mockReturnValue(filterBuilder);
          filterBuilder.then = (resolve: any, reject: any) =>
            Promise.resolve({ data: filterBuilder._data ?? participants, error: null }).then(resolve, reject);

          return {
            select: vi.fn(() => filterBuilder),
          };
        }
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null })),
        };
      }),
    } as any;
  }

  it('should return empty list when database has no profiles or participants', async () => {
    const mockSupabase = createMockSupabase([], []);
    const service = new LeaderboardBackendService(mockSupabase);

    const result = await service.getLeaderboard('all-time', 1, 10);

    expect(result).toBeDefined();
    expect(result.topThree.length).toBe(0);
    expect(result.totalPlayers).toBe(0);
    expect(result.totalPages).toBe(1);
    expect(result.pagePlayers.length).toBe(0);
  });

  it('should integrate real profiles from database and rank by matchScore without roster characters', async () => {
    const mockProfiles = [
      {
        id: 'user-top-champion',
        username: 'UltraChampion',
        avatar_url: '/avatar/champion.webp',
        xp: 2500,
        coins: 1000,
      },
      {
        id: 'user-mid-player',
        username: 'MidRankPro',
        avatar_url: '/avatar/pro.webp',
        xp: 1000,
        coins: 400,
      },
      {
        id: 'user-bronze-player',
        username: 'BronzeStar',
        avatar_url: '/avatar/bronze.webp',
        xp: 800,
        coins: 300,
      },
    ];
    const mockParticipants = [
      { user_id: 'user-top-champion', display_name: 'UltraChampion', player_type: 'HUMAN', final_score: 500 },
      { user_id: 'user-mid-player', display_name: 'MidRankPro', player_type: 'HUMAN', final_score: 300 },
      { user_id: 'user-bronze-player', display_name: 'BronzeStar', player_type: 'HUMAN', final_score: 100 },
    ];

    const mockSupabase = createMockSupabase(mockProfiles, mockParticipants);
    const service = new LeaderboardBackendService(mockSupabase);

    const result = await service.getLeaderboard(
      'all-time',
      1,
      10,
      'user-top-champion',
      'UltraChampion'
    );

    // Only the 3 actual profiles exist; no fake roster characters
    // Points reflect matchScore (500, 300, 100), not profile xp (2500, 1000, 800)
    expect(result.totalPlayers).toBe(3);
    expect(result.topThree.length).toBe(3);
    expect(result.topThree[0].username).toBe('UltraChampion');
    expect(result.topThree[0].points).toBe(500);
    expect(result.topThree[0].isCurrentUser).toBe(true);
    expect(result.topThree[0].userBadge).toBe('You');
    expect(result.topThree[1].username).toBe('MidRankPro');
    expect(result.topThree[1].points).toBe(300);
    expect(result.topThree[2].username).toBe('BronzeStar');
    expect(result.topThree[2].points).toBe(100);
  });

  it('should support pagination on later pages with actual database players', async () => {
    // 15 actual database profiles with match participants
    const mockProfiles = Array.from({ length: 15 }, (_, i) => ({
      id: `user-${i + 1}`,
      username: `Player_${i + 1}`,
      avatar_url: '/avatar/avatar.jpeg',
      xp: (15 - i) * 100,
    }));
    const mockParticipants = Array.from({ length: 15 }, (_, i) => ({
      user_id: `user-${i + 1}`,
      display_name: `Player_${i + 1}`,
      player_type: 'HUMAN',
      final_score: (15 - i) * 100,
    }));

    const mockSupabase = createMockSupabase(mockProfiles, mockParticipants);
    const service = new LeaderboardBackendService(mockSupabase);

    const page2 = await service.getLeaderboard('all-time', 2, 10);
    expect(page2.currentPage).toBe(2);
    expect(page2.totalPlayers).toBe(15);
    expect(page2.totalPages).toBe(2);
    expect(page2.startIndex).toBe(11);
    expect(page2.endIndex).toBe(15);
    expect(page2.pagePlayers.length).toBe(5);
    expect(page2.pagePlayers[0].rank).toBe(11);
    expect(page2.pagePlayers[0].points).toBe(500);
  });

  it('should always reflect matchScore from participants irrespective of whether period is all-time or not', async () => {
    const mockProfiles = [
      { id: 'user-1', username: 'P1', xp: 5000 },
    ];
    const mockParticipants = [
      { user_id: 'user-1', display_name: 'P1', player_type: 'HUMAN', final_score: 150 },
    ];

    const mockSupabase = createMockSupabase(mockProfiles, mockParticipants);
    const service = new LeaderboardBackendService(mockSupabase);

    const allTime = await service.getLeaderboard('all-time', 1, 10);
    const thisWeek = await service.getLeaderboard('this-week', 1, 10);

    // Points must always reflect matchScore (150) and never account xp (5000)
    expect(allTime.topThree[0].points).toBe(150);
    expect(thisWeek.topThree[0].points).toBe(150);
  });

  it('should exclude bot players when querying match_participants', async () => {
    const mockProfiles = [
      { id: 'user-human-1', username: 'HumanPlayer', xp: 300 },
    ];
    const mockParticipants = [
      { user_id: 'user-human-1', display_name: 'HumanPlayer', player_type: 'HUMAN', xp_earned: 300 },
      { user_id: null, display_name: 'Leo', player_type: 'BOT', xp_earned: 999 },
      { user_id: null, display_name: 'Jenny', player_type: 'BOT', xp_earned: 888 },
      { user_id: null, display_name: 'Sofia', player_type: 'BOT', xp_earned: 777 },
    ];

    const mockSupabase = createMockSupabase(mockProfiles, mockParticipants);
    const service = new LeaderboardBackendService(mockSupabase);

    const result = await service.getLeaderboard('this-week', 1, 10);

    // Only the human player should be present; bots Leo, Jenny, Sofia must be excluded
    expect(result.totalPlayers).toBe(1);
    expect(result.topThree.length).toBe(1);
    expect(result.topThree[0].username).toBe('HumanPlayer');
    expect(result.topThree.some((p) => p.username === 'Leo')).toBe(false);
    expect(result.topThree.some((p) => p.username === 'Jenny')).toBe(false);
    expect(result.topThree.some((p) => p.username === 'Sofia')).toBe(false);
  });
});

describe('LeaderboardController', () => {
  it('should return 200 with leaderboard data', async () => {
    const mockService = {
      getLeaderboard: vi.fn().mockResolvedValue({
        topThree: [{ rank: 1, username: 'RoyalDonkey47', points: 1240 }],
        pagePlayers: [],
        currentUser: { rank: 25, username: 'Player123', points: 320 },
        currentPage: 1,
        totalPages: 20,
        totalPlayers: 200,
        startIndex: 1,
        endIndex: 10,
      }),
    };

    const controller = new LeaderboardController(mockService as any);

    const req: any = {
      query: { period: 'this-week', page: '2', pageSize: '10' },
      user: { id: 'auth-user-1', email: 'test@example.com' },
    };
    const res: any = {
      json: vi.fn(),
    };
    const next: any = vi.fn();

    await controller.getLeaderboard(req, res, next);

    expect(mockService.getLeaderboard).toHaveBeenCalledWith(
      'this-week',
      2,
      10,
      'auth-user-1',
      'test',
      undefined
    );
    expect(res.json).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { MatchPersistenceService } from '../services/match-persistence.service.js';
import { GameSession } from '../services/session-manager.js';
import { GameState, Player } from '@kazhudha/shared';

describe('MatchPersistenceService', () => {
  function createMockSupabase() {
    const tableData: Record<string, any[]> = {
      matches: [],
      match_participants: [],
      match_hands: [],
      match_hand_scores: [],
      profiles: [
        {
          id: 'test-user-123',
          xp: 150,
          coins: 50,
          level: 1,
          matches_played: 2,
          matches_won: 1,
        },
      ],
    };

    const mockClient: any = {
      from: vi.fn((table: string) => {
        return {
          insert: vi.fn((data: any) => {
            if (Array.isArray(data)) {
              tableData[table]?.push(...data);
            } else {
              tableData[table]?.push(data);
            }
            return Promise.resolve({ data, error: null });
          }),
          update: vi.fn((updateData: any) => {
            return {
              eq: vi.fn((col: string, val: any) => {
                const target = tableData[table]?.find((row) => row[col] === val);
                if (target) {
                  Object.assign(target, updateData);
                }
                return Promise.resolve({ data: updateData, error: null });
              }),
            };
          }),
          select: vi.fn((_cols: string) => {
            return {
              eq: vi.fn((col: string, val: any) => {
                return {
                  single: vi.fn(() => {
                    const row = tableData[table]?.find((r) => r[col] === val);
                    return Promise.resolve({ data: row || null, error: null });
                  }),
                };
              }),
            };
          }),
        };
      }),
    };

    return { mockClient, tableData };
  }

  function setupSession() {
    const p1 = new Player('human', 'Ramesh', false);
    const p2 = new Player('bot1', 'Velsamy', true);
    const p3 = new Player('bot2', 'Muthu', true);
    const p4 = new Player('bot3', 'Chellappa', true);
    const players = [p1, p2, p3, p4];
    const state = new GameState(players);
    const session = new GameSession('session-test-1', state, players);
    return { session, players, state };
  }

  it('should initialize match and participants in Supabase', async () => {
    const { mockClient, tableData } = createMockSupabase();
    const service = new MatchPersistenceService(mockClient);
    const { session } = setupSession();

    const result = await service.initMatch(session, {
      userId: 'test-user-123',
      displayName: 'Ramesh',
      avatarUrl: '/avatar/custom.webp',
    });

    expect(result).toBeDefined();
    expect(result?.matchId).toBeDefined();
    expect(result?.participantMap.size).toBe(4);

    expect(tableData.matches.length).toBe(1);
    expect(tableData.matches[0].tournament_mode).toBe('SINGLE_PLAYER');
    expect(tableData.matches[0].status).toBe('IN_PROGRESS');
    expect(tableData.matches[0].created_by).toBe('test-user-123');

    expect(tableData.match_participants.length).toBe(4);
    const humanParticipant = tableData.match_participants.find(
      (p) => p.player_type === 'HUMAN'
    );
    expect(humanParticipant).toBeDefined();
    expect(humanParticipant.user_id).toBe('test-user-123');
    expect(humanParticipant.display_name).toBe('Ramesh');
    expect(humanParticipant.seat_index).toBe(0);
  });

  it('should record completed hand into match_hands and match_hand_scores', async () => {
    const { mockClient, tableData } = createMockSupabase();
    const service = new MatchPersistenceService(mockClient);
    const { session, players, state } = setupSession();

    // 1. Init match
    await service.initMatch(session, { userId: 'test-user-123' });

    // 2. Simulate hand outcome
    // human escapes 1st, bot1 escapes 2nd, bot2 escapes 3rd, bot3 is donkey
    players[0].setHasGottenAway(true);
    state.getEscapedPlayerIds().push('human');
    players[1].setHasGottenAway(true);
    state.getEscapedPlayerIds().push('bot1');
    players[2].setHasGottenAway(true);
    state.getEscapedPlayerIds().push('bot2');
    players[3].addCard({ suit: 'SPADES', rank: 'KING' }); // left with card

    session.recordVettu('human', 'bot2');
    session.recordCurrentHand();

    // 3. Record hand result
    const handId = await service.recordHandResult(session);

    expect(handId).toBeDefined();
    expect(tableData.match_hands.length).toBe(1);
    expect(tableData.match_hands[0].hand_number).toBe(1);
    expect(tableData.match_hands[0].vettu_count).toBe(1);

    expect(tableData.match_hand_scores.length).toBe(4);
    const humanScore = tableData.match_hand_scores.find(
      (s) => s.participant_id === session.participantMap.get('human')
    );
    expect(humanScore).toBeDefined();
    expect(humanScore.score_awarded).toBe(20);
    expect(humanScore.escape_rank).toBe(1);
    expect(humanScore.vettus_performed).toBe(1);

    const bot3Score = tableData.match_hand_scores.find(
      (s) => s.participant_id === session.participantMap.get('bot3')
    );
    expect(bot3Score).toBeDefined();
    expect(bot3Score.is_kazhudha).toBe(true);
    expect(bot3Score.score_awarded).toBe(0);
    expect(bot3Score.cards_remaining).toBe(1);
  });

  it('should complete tournament, rank participants and update user profile stats', async () => {
    const { mockClient, tableData } = createMockSupabase();
    const service = new MatchPersistenceService(mockClient);
    const { session } = setupSession();

    await service.initMatch(session, {
      userId: 'test-user-123',
      displayName: 'Ramesh',
    });

    // Simulate 5 hands so human reaches >= 100
    for (let h = 1; h <= 5; h++) {
      session.hands.push({
        handNumber: h,
        winnerId: 'human',
        scores: {
          human: 20,
          bot1: 15,
          bot2: 10,
          bot3: 0,
        },
        kazhudhaPlayerId: 'bot3',
      });
    }

    expect(session.isTournamentOver()).toBe(true);

    await service.completeMatch(session);

    // 1. Verify Match completed
    expect(tableData.matches[0].status).toBe('COMPLETED');
    expect(tableData.matches[0].winner_participant_id).toBe(
      session.participantMap.get('human')
    );
    expect(tableData.matches[0].kazhudha_participant_id).toBe(
      session.participantMap.get('bot3')
    );

    // 2. Verify human participant rank & rewards
    const humanParticipant = tableData.match_participants.find(
      (p) => p.player_type === 'HUMAN'
    );
    expect(humanParticipant.final_score).toBe(100);
    expect(humanParticipant.final_rank).toBe(1);
    expect(humanParticipant.is_winner).toBe(true);
    expect(humanParticipant.xp_earned).toBe(100);
    expect(humanParticipant.coins_earned).toBe(50);
    expect(humanParticipant.hands_won).toBe(5);

    // 3. Verify user profile was updated
    const profile = tableData.profiles[0];
    expect(profile.matches_played).toBe(3); // was 2, +1
    expect(profile.matches_won).toBe(2); // was 1, +1
    expect(profile.xp).toBe(250); // was 150, +100
    expect(profile.coins).toBe(100); // was 50, +50
  });
});

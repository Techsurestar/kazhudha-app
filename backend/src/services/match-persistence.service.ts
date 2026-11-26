import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { getSupabaseClient } from '../config/supabase.js';
import type { GameSession, UserSessionMetadata } from './session-manager.js';

export class MatchPersistenceService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient ?? getSupabaseClient();
  }

  /**
   * Initializes a new tournament match and its 4 participants in public.matches and public.match_participants.
   */
  public async initMatch(
    session: GameSession,
    userMetadata?: UserSessionMetadata
  ): Promise<{ matchId: string; participantMap: Map<string, string> } | null> {
    try {
      const matchId = randomUUID();
      const participantMap = new Map<string, string>();

      // Generate UUIDs for each participant
      for (const p of session.getPlayers()) {
        participantMap.set(p.getId(), randomUUID());
      }

      // 1. Insert Match
      const { error: matchError } = await this.supabase.from('matches').insert({
        id: matchId,
        tournament_mode: 'SINGLE_PLAYER',
        status: 'IN_PROGRESS',
        target_score: 100,
        total_hands: 0,
        created_by: userMetadata?.userId || null,
        started_at: new Date().toISOString(),
      });

      if (matchError) {
        console.error('MatchPersistenceService: Error inserting match:', matchError);
        return null;
      }

      // 2. Insert Participants
      const participantsData = session.getPlayers().map((p, index) => {
        const participantId = participantMap.get(p.getId())!;
        const isHuman = !p.isBot;
        return {
          id: participantId,
          match_id: matchId,
          user_id: isHuman ? userMetadata?.userId || null : null,
          player_type: isHuman ? (userMetadata?.userId ? 'HUMAN' : 'GUEST') : 'BOT',
          seat_index: index,
          display_name: isHuman
            ? userMetadata?.displayName || p.getName()
            : p.getName(),
          final_score: 0,
          is_winner: false,
          is_kazhudha: false,
          hands_won: 0,
          hands_kazhudha: 0,
          xp_earned: 0,
          coins_earned: 0,
        };
      });

      const { error: participantsError } = await this.supabase
        .from('match_participants')
        .insert(participantsData);

      if (participantsError) {
        console.error(
          'MatchPersistenceService: Error inserting participants:',
          participantsError
        );
        return null;
      }

      session.matchId = matchId;
      session.participantMap = participantMap;
      if (userMetadata) {
        session.userMetadata = userMetadata;
      }
      return { matchId, participantMap };
    } catch (err) {
      console.error('MatchPersistenceService.initMatch exception:', err);
      return null;
    }
  }

  /**
   * Records a completed hand into public.match_hands and public.match_hand_scores.
   */
  public async recordHandResult(session: GameSession): Promise<string | null> {
    try {
      if (!session.matchId || session.participantMap.size === 0) {
        return null;
      }

      const hands = session.getHands();
      if (hands.length === 0) return null;
      const currentHand = hands[hands.length - 1];
      const handNumber = currentHand.handNumber;
      const handId = randomUUID();

      const leadParticipantId = session.startingPlayerId
        ? session.participantMap.get(session.startingPlayerId) || null
        : null;

      const firstEscapeParticipantId = currentHand.winnerId
        ? session.participantMap.get(currentHand.winnerId) || null
        : null;

      const kazhudhaParticipantId = currentHand.kazhudhaPlayerId
        ? session.participantMap.get(currentHand.kazhudhaPlayerId) || null
        : null;

      // 1. Insert match hand
      const { error: handError } = await this.supabase.from('match_hands').insert({
        id: handId,
        match_id: session.matchId,
        hand_number: handNumber,
        lead_participant_id: leadParticipantId,
        first_escape_participant_id: firstEscapeParticipantId,
        kazhudha_participant_id: kazhudhaParticipantId,
        vettu_count: session.currentHandVettuCount,
        started_at: new Date(session.handStartTime || Date.now()).toISOString(),
        ended_at: new Date().toISOString(),
      });

      if (handError) {
        console.error('MatchPersistenceService: Error inserting hand:', handError);
        return null;
      }

      // 2. Insert match hand scores for all players
      const escapedIds = session.getGameState().getEscapedPlayerIds();
      const scoresData = session.getPlayers().map((p) => {
        const participantId = session.participantMap.get(p.getId())!;
        const escapeIndex = escapedIds.indexOf(p.getId());
        const escapeRank = escapeIndex !== -1 ? escapeIndex + 1 : 4;
        const score = currentHand.scores[p.getId()] ?? 0;
        const isKazhudha = p.getId() === currentHand.kazhudhaPlayerId;

        return {
          id: randomUUID(),
          hand_id: handId,
          participant_id: participantId,
          escape_rank: escapeRank,
          score_awarded: score,
          cards_remaining: isKazhudha ? p.getHand().length : 0,
          vettus_performed: session.currentHandVettusPerformed[p.getId()] || 0,
          vettus_received: session.currentHandVettusReceived[p.getId()] || 0,
          is_kazhudha: isKazhudha,
        };
      });

      const { error: scoresError } = await this.supabase
        .from('match_hand_scores')
        .insert(scoresData);

      if (scoresError) {
        console.error(
          'MatchPersistenceService: Error inserting hand scores:',
          scoresError
        );
      }

      // 3. Update total_hands count on match
      await this.supabase
        .from('matches')
        .update({ total_hands: handNumber })
        .eq('id', session.matchId);

      return handId;
    } catch (err) {
      console.error('MatchPersistenceService.recordHandResult exception:', err);
      return null;
    }
  }

  /**
   * Finalizes the tournament when target score is reached.
   * Updates public.matches, public.match_participants, and user profile statistics in public.profiles.
   */
  public async completeMatch(session: GameSession): Promise<void> {
    try {
      if (!session.matchId || session.participantMap.size === 0) return;

      const hands = session.getHands();
      const totals: Record<string, number> = {};
      const handsWonCount: Record<string, number> = {};
      const handsKazhudhaCount: Record<string, number> = {};

      for (const p of session.getPlayers()) {
        totals[p.getId()] = 0;
        handsWonCount[p.getId()] = 0;
        handsKazhudhaCount[p.getId()] = 0;
      }

      for (const hand of hands) {
        for (const [pId, score] of Object.entries(hand.scores)) {
          totals[pId] = (totals[pId] || 0) + score;
        }
        if (hand.winnerId) {
          handsWonCount[hand.winnerId] = (handsWonCount[hand.winnerId] || 0) + 1;
        }
        if (hand.kazhudhaPlayerId) {
          handsKazhudhaCount[hand.kazhudhaPlayerId] =
            (handsKazhudhaCount[hand.kazhudhaPlayerId] || 0) + 1;
        }
      }

      // Sort players by total score descending
      const sortedPlayers = [...session.getPlayers()].sort(
        (a, b) => (totals[b.getId()] || 0) - (totals[a.getId()] || 0)
      );

      const winnerPlayer = sortedPlayers[0];
      const kazhudhaPlayer = sortedPlayers[sortedPlayers.length - 1];

      const winnerParticipantId =
        session.participantMap.get(winnerPlayer.getId()) || null;
      const kazhudhaParticipantId =
        session.participantMap.get(kazhudhaPlayer.getId()) || null;

      // Update match status to COMPLETED
      await this.supabase
        .from('matches')
        .update({
          status: 'COMPLETED',
          winner_participant_id: winnerParticipantId,
          kazhudha_participant_id: kazhudhaParticipantId,
          completed_at: new Date().toISOString(),
          total_hands: hands.length,
        })
        .eq('id', session.matchId);

      // Rewards: Rank 1 -> 100 XP / 50 coins, Rank 2 -> 50 / 25, Rank 3 -> 25 / 10, Rank 4 -> 10 / 0
      const rewardsByRank: Record<number, { xp: number; coins: number }> = {
        1: { xp: 100, coins: 50 },
        2: { xp: 50, coins: 25 },
        3: { xp: 25, coins: 10 },
        4: { xp: 10, coins: 0 },
      };

      // Update participant records
      for (let i = 0; i < sortedPlayers.length; i++) {
        const player = sortedPlayers[i];
        const participantId = session.participantMap.get(player.getId());
        if (!participantId) continue;

        const rank = (i + 1) as 1 | 2 | 3 | 4;
        const isWinner = rank === 1;
        const isKazhudha = rank === 4;
        const rewards = rewardsByRank[rank] || { xp: 0, coins: 0 };

        await this.supabase
          .from('match_participants')
          .update({
            final_score: totals[player.getId()] || 0,
            final_rank: rank,
            is_winner: isWinner,
            is_kazhudha: isKazhudha,
            hands_won: handsWonCount[player.getId()] || 0,
            hands_kazhudha: handsKazhudhaCount[player.getId()] || 0,
            xp_earned: rewards.xp,
            coins_earned: rewards.coins,
          })
          .eq('id', participantId);

        // Update public.profiles if this is an authenticated human player
        if (!player.isBot && session.userMetadata?.userId) {
          await this.updateUserProfile(
            session.userMetadata.userId,
            rewards.xp,
            rewards.coins,
            isWinner
          );
        }
      }
    } catch (err) {
      console.error('MatchPersistenceService.completeMatch exception:', err);
    }
  }

  /**
   * Marks a match as abandoned in public.matches.
   * Does NOT alter user profile points, XP, or rank.
   */
  public async abandonMatch(session: GameSession): Promise<void> {
    try {
      if (!session.matchId) return;

      await this.supabase
        .from('matches')
        .update({
          status: 'ABANDONED',
          completed_at: new Date().toISOString(),
        })
        .eq('id', session.matchId);
    } catch (err) {
      console.error('MatchPersistenceService.abandonMatch exception:', err);
    }
  }

  private async updateUserProfile(
    userId: string,
    xpEarned: number,
    coinsEarned: number,
    isWinner: boolean
  ): Promise<void> {
    try {
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('xp, coins, level, matches_played, matches_won')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        console.warn('Could not fetch profile to update stats:', error);
        return;
      }

      const newXp = Number(profile.xp || 0) + xpEarned;
      const newCoins = Number(profile.coins || 0) + coinsEarned;
      const newMatchesPlayed = (profile.matches_played || 0) + 1;
      const newMatchesWon = (profile.matches_won || 0) + (isWinner ? 1 : 0);
      const newLevel = Math.max(1, Math.floor(newXp / 500) + 1);

      await this.supabase
        .from('profiles')
        .update({
          xp: newXp,
          coins: newCoins,
          matches_played: newMatchesPlayed,
          matches_won: newMatchesWon,
          level: newLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } catch (err) {
      console.error('Error updating user profile:', err);
    }
  }
}

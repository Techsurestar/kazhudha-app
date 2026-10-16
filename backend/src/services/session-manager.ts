import type { Card, HandResult } from '@kazhudha/shared';
import {
  GameState,
  Player,
  DealerService,
  SessionNotFoundException,
  ESCAPE_SCORES,
  TOURNAMENT_THRESHOLD,
} from '@kazhudha/shared';

export class GameSession {
  public readonly gameId: string;
  public readonly gameState: GameState;
  public readonly players: readonly Player[];
  public readonly discardedHistory: Card[];
  public readonly hands: HandResult[];
  private lastAccessedTime: number;

  constructor(gameId: string, gameState: GameState, players: readonly Player[]) {
    if (!gameId) throw new Error('Game ID cannot be null');
    if (!gameState) throw new Error('GameState cannot be null');
    if (!players) throw new Error('Players list cannot be null');

    this.gameId = gameId;
    this.gameState = gameState;
    this.players = [...players];
    this.discardedHistory = [];
    this.hands = [];
    this.lastAccessedTime = Date.now();
  }

  public getGameId(): string {
    return this.gameId;
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public getPlayers(): readonly Player[] {
    return this.players;
  }

  public getDiscardedHistory(): Card[] {
    return this.discardedHistory;
  }

  public getHands(): readonly HandResult[] {
    return this.hands;
  }

  public getLastAccessedTime(): number {
    return this.lastAccessedTime;
  }

  public touch(): void {
    this.lastAccessedTime = Date.now();
  }

  public recordCurrentHand(): void {
    const handNumber = this.hands.length + 1;
    const escaped = this.gameState.getEscapedPlayerIds();

    let kazhudhaId: string | null = null;
    for (const p of this.players) {
      if (!p.hasGottenAway()) {
        kazhudhaId = p.getId();
        break;
      }
    }

    const scores: Record<string, number> = {};
    for (const p of this.players) {
      const pId = p.getId();
      const idx = escaped.indexOf(pId);
      if (idx === 0) scores[pId] = ESCAPE_SCORES[0]; // 20
      else if (idx === 1) scores[pId] = ESCAPE_SCORES[1]; // 15
      else if (idx === 2) scores[pId] = ESCAPE_SCORES[2]; // 10
      else scores[pId] = ESCAPE_SCORES[3]; // 0
    }

    const winnerId = escaped.length > 0 ? escaped[0] : null;
    this.hands.push({
      handNumber,
      winnerId,
      scores,
      kazhudhaPlayerId: kazhudhaId,
    });
  }

  public isTournamentOver(): boolean {
    const totals: Record<string, number> = {};
    for (const hand of this.hands) {
      for (const [playerId, score] of Object.entries(hand.scores)) {
        totals[playerId] = (totals[playerId] || 0) + score;
      }
    }
    return Object.values(totals).some((total) => total > TOURNAMENT_THRESHOLD);
  }

  public resetForNextHand(dealerService: DealerService): void {
    for (const p of this.players) {
      p.clearHand();
      p.setHasGottenAway(false);
    }
    dealerService.shuffleAndDeal(this.players);
    const startingPlayerId = dealerService.determineStartingPlayer(this.players);

    this.gameState.clearTablePile();
    this.gameState.setActiveRoundSuit(null);
    this.gameState.setCurrentTurnPlayerId(startingPlayerId);
    this.gameState.clearEscapedPlayerIds();
    for (const voidSet of this.gameState.getPlayerSuitVoids().values()) {
      voidSet.clear();
    }
    this.discardedHistory.length = 0;
    this.lastAccessedTime = Date.now();
  }
}

export class GameSessionManager {
  private readonly sessionMap = new Map<string, GameSession>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodic cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSessions();
    }, 3600000);
  }

  public createSession(
    gameId: string,
    state: GameState,
    players: readonly Player[]
  ): GameSession {
    if (!gameId) throw new Error('Game ID cannot be null');
    if (!state) throw new Error('GameState cannot be null');
    if (!players) throw new Error('Players list cannot be null');

    const session = new GameSession(gameId, state, players);
    this.sessionMap.set(gameId, session);
    return session;
  }

  public getSession(gameId: string): GameSession {
    if (!gameId) throw new Error('Game ID cannot be null');
    const session = this.sessionMap.get(gameId);
    if (!session) {
      throw new SessionNotFoundException(`Session with ID ${gameId} not found`);
    }
    session.touch();
    return session;
  }

  public hasSession(gameId: string): boolean {
    return this.sessionMap.has(gameId);
  }

  public updateSession(gameId: string, session: GameSession): void {
    if (!gameId) throw new Error('Game ID cannot be null');
    if (!session) throw new Error('GameSession cannot be null');
    this.sessionMap.set(gameId, session);
    session.touch();
  }

  public terminateSession(gameId: string): void {
    if (!gameId) throw new Error('Game ID cannot be null');
    this.sessionMap.delete(gameId);
  }

  public cleanupStaleSessions(): void {
    const now = Date.now();
    const threshold = 3600000; // 1 hour
    for (const [id, session] of this.sessionMap.entries()) {
      if (now - session.getLastAccessedTime() > threshold) {
        this.sessionMap.delete(id);
      }
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

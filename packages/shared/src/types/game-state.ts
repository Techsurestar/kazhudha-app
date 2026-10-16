import type { Card, Suit } from './card.js';
import type { Player } from './player.js';

export interface PlayedCard {
  playerId: string;
  card: Card;
}

export interface GameEvent {
  eventType: string;
  playerId: string;
  card: Card | null;
  description: string;
}

export class GameState {
  private readonly players: Player[];
  private readonly playerMap: Map<string, Player>;
  private readonly tablePile: PlayedCard[];
  private readonly playerSuitVoids: Map<string, Set<Suit>>;
  private readonly escapedPlayerIds: string[];
  private currentTurnPlayerId: string | null = null;
  private activeRoundSuit: Suit | null = null;

  constructor(players: readonly Player[]) {
    this.players = [...players];
    this.playerMap = new Map();
    for (const p of players) {
      this.playerMap.set(p.getId(), p);
    }
    this.tablePile = [];
    this.playerSuitVoids = new Map();
    this.escapedPlayerIds = [];
    for (const p of players) {
      this.playerSuitVoids.set(p.getId(), new Set<Suit>());
    }
  }

  public getPlayers(): readonly Player[] {
    return this.players;
  }

  public getPlayer(playerId: string): Player | undefined {
    return this.playerMap.get(playerId);
  }

  public getTablePile(): readonly PlayedCard[] {
    return this.tablePile;
  }

  public addToTablePile(playedCard: PlayedCard): void {
    this.tablePile.push(playedCard);
  }

  public clearTablePile(): void {
    this.tablePile.length = 0;
  }

  public getCurrentTurnPlayerId(): string | null {
    return this.currentTurnPlayerId;
  }

  public setCurrentTurnPlayerId(currentTurnPlayerId: string | null): void {
    this.currentTurnPlayerId = currentTurnPlayerId;
  }

  public getActiveRoundSuit(): Suit | null {
    return this.activeRoundSuit;
  }

  public setActiveRoundSuit(activeRoundSuit: Suit | null): void {
    this.activeRoundSuit = activeRoundSuit;
  }

  public getPlayerSuitVoids(): Map<string, Set<Suit>> {
    return this.playerSuitVoids;
  }

  public getEscapedPlayerIds(): string[] {
    return this.escapedPlayerIds;
  }

  public clearEscapedPlayerIds(): void {
    this.escapedPlayerIds.length = 0;
  }
}

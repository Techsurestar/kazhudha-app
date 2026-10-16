import type { Card } from '../types/card.js';
import type { GameState } from '../types/game-state.js';
import type { Player } from '../types/player.js';
import { validateAndPlayCard } from './validation.js';
import { handleVettuCondition } from './vettu.js';
import { updatePlayerSheddingStatus } from './escape.js';
import { advanceTurn } from './turn.js';
import { resolveCompletedTrick } from './trick.js';
import { isGameOver } from './game-over.js';

export class GameRuleEngine {
  public validateAndPlayCard(state: GameState, playerId: string, card: Card): { isVettu: boolean } {
    return validateAndPlayCard(state, playerId, card);
  }

  public handleVettuCondition(
    state: GameState,
    players: readonly Player[],
    currentTurnPlayer: Player,
    playedCard: Card
  ): void {
    handleVettuCondition(state, players, currentTurnPlayer, playedCard);
  }

  public updatePlayerSheddingStatus(state: GameState, players: readonly Player[]): void {
    updatePlayerSheddingStatus(state, players);
  }

  public advanceTurn(state: GameState, players: readonly Player[]): void {
    advanceTurn(state, players);
  }

  public resolveCompletedTrick(
    state: GameState,
    discardedHistory: Card[],
    players?: readonly Player[]
  ): void {
    resolveCompletedTrick(state, discardedHistory, players);
  }

  public isGameOver(state: GameState): boolean {
    return isGameOver(state);
  }
}

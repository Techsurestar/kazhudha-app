import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { GameController } from '../engine/index.js';
import type {
  Card,
  Suit,
  Rank,
  PlayedCard,
  PlayerHandSizeDTO,
  HandResult,
  GameViewDTO,
  PlayRequest,
} from '../engine/index.js';

export type {
  Card,
  Suit,
  Rank,
  PlayedCard,
  PlayerHandSizeDTO,
  HandResult,
  GameViewDTO,
  PlayRequest,
};

export interface GameEvent {
  eventType: 'PLAY' | 'VETTU' | 'ESCAPE' | string;
  playerId: string;
  card: Card | null;
  description: string;
}

@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  private readonly controller = new GameController();

  // Writable Signal to store the game state DTO
  gameState = signal<GameViewDTO | null>(null);

  /**
   * Starts a new game session
   * @param sessionId Session identifier
   */
  startGame(sessionId: string = 'default'): Observable<GameViewDTO> {
    try {
      const state = this.controller.startGame(sessionId);
      this.gameState.set(state);
      return of(state);
    } catch (err) {
      console.error('Error starting game:', err);
      throw err;
    }
  }

  /**
   * Plays a card for a player
   * @param playerId Playing player ID
   * @param card Card object
   * @param sessionId Session identifier
   */
  playCard(
    playerId: string,
    card: Card,
    sessionId: string = 'default'
  ): Observable<GameViewDTO> {
    try {
      const state = this.controller.playCard(sessionId, { playerId, card });
      this.gameState.set(state);
      return of(state);
    } catch (err) {
      console.error('Error playing card:', err);
      throw err;
    }
  }
}

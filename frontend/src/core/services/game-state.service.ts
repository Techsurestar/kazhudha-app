import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Card {
  suit: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
  rank: string;
}

export interface PlayedCard {
  playerId: string;
  card: Card;
}

export interface PlayerHandSizeDTO {
  id: string;
  name: string;
  handSize: number;
  isBot: boolean;
  hasGottenAway: boolean;
}

export interface GameEvent {
  eventType: 'PLAY' | 'VETTU' | 'ESCAPE';
  playerId: string;
  card: Card | null;
  description: string;
}

export interface HandResult {
  handNumber: number;
  winnerId: string;
  scores: Record<string, number>;
  kazhudhaPlayerId: string;
}

export interface GameViewDTO {
  tablePile: PlayedCard[];
  activeRoundSuit: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS' | null;
  currentTurnPlayerId: string;
  humanHand: Card[];
  otherPlayers: PlayerHandSizeDTO[];
  gameOver: boolean;
  kazhudhaPlayerId: string | null;
  events: GameEvent[];
  hands: HandResult[];
  tournamentOver: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  private readonly apiUrl = 'http://localhost:8080/api/game';
  
  // Writable Signal to store the game state DTO
  gameState = signal<GameViewDTO | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Starts a new game session
   * @param sessionId Session identifier
   */
  startGame(sessionId: string = 'default'): Observable<GameViewDTO> {
    const url = `${this.apiUrl}/start?sessionId=${encodeURIComponent(sessionId)}`;
    const obs = this.http.get<GameViewDTO>(url).pipe(
      tap({
        next: (state) => this.gameState.set(state),
        error: (err) => console.error('Error starting game:', err)
      })
    );
    obs.subscribe();
    return obs;
  }

  /**
   * Plays a card for a player
   * @param playerId Playing player ID
   * @param card Card object
   * @param sessionId Session identifier
   */
  playCard(playerId: string, card: Card, sessionId: string = 'default'): Observable<GameViewDTO> {
    const url = `${this.apiUrl}/play?sessionId=${encodeURIComponent(sessionId)}`;
    const body = { playerId, card };
    const obs = this.http.post<GameViewDTO>(url, body).pipe(
      tap({
        next: (state) => this.gameState.set(state),
        error: (err) => console.error('Error playing card:', err)
      })
    );
    obs.subscribe();
    return obs;
  }
}

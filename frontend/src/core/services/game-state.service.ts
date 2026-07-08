import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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

export interface GameViewDTO {
  tablePile: PlayedCard[];
  activeRoundSuit: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS' | null;
  currentTurnPlayerId: string;
  humanHand: Card[];
  otherPlayers: PlayerHandSizeDTO[];
  gameOver: boolean;
  kazhudhaPlayerId: string | null;
  events: GameEvent[];
}

const SYMBOL_TO_SUIT: Record<string, 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS'> = {
  '♠': 'SPADES',
  '♥': 'HEARTS',
  '♦': 'DIAMONDS',
  '♣': 'CLUBS',
  'SPADES': 'SPADES',
  'HEARTS': 'HEARTS',
  'DIAMONDS': 'DIAMONDS',
  'CLUBS': 'CLUBS'
};

const SUIT_TO_SYMBOL: Record<'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS', string> = {
  'SPADES': '♠',
  'HEARTS': '♥',
  'DIAMONDS': '♦',
  'CLUBS': '♣'
};

function normalizeSuit(suit: string | null | undefined): 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS' | null {
  if (!suit) return null;
  return SYMBOL_TO_SUIT[suit] || null;
}

function normalizeCard(card: any): Card {
  return {
    ...card,
    suit: normalizeSuit(card.suit) as any
  };
}

function normalizeGameViewDTO(dto: any): GameViewDTO {
  return {
    ...dto,
    activeRoundSuit: normalizeSuit(dto.activeRoundSuit),
    tablePile: (dto.tablePile || []).map((pc: any) => ({
      ...pc,
      card: normalizeCard(pc.card)
    })),
    humanHand: (dto.humanHand || []).map((c: any) => normalizeCard(c)),
    kazhudhaPlayerId: dto.kazhudhaPlayerId || null,
    events: (dto.events || []).map((e: any) => ({
      ...e,
      card: e.card ? normalizeCard(e.card) : null
    }))
  };
}

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  private readonly apiUrl = 'http://localhost:8080/api/game';
  
  // Writable Signal to store the normalized backend game state DTO
  gameState = signal<GameViewDTO | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Starts a new game session
   * @param sessionId Session identifier
   */
  startGame(sessionId: string = 'default'): Observable<GameViewDTO> {
    const url = `${this.apiUrl}/start?sessionId=${encodeURIComponent(sessionId)}`;
    const obs = this.http.get<any>(url).pipe(
      map(dto => normalizeGameViewDTO(dto))
    );
    obs.subscribe({
      next: (state) => this.gameState.set(state),
      error: (err) => console.error('Error starting game:', err)
    });
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
    
    // Map the suit name to symbol for backend compatibility
    const backendCard = {
      ...card,
      suit: SUIT_TO_SYMBOL[card.suit as 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS'] || card.suit
    };
    
    const body = { playerId, card: backendCard };
    const obs = this.http.post<any>(url, body).pipe(
      map(dto => normalizeGameViewDTO(dto))
    );
    obs.subscribe({
      next: (state) => this.gameState.set(state),
      error: (err) => console.error('Error playing card:', err)
    });
    return obs;
  }
}

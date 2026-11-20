import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
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
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly controller = new GameController();
  private readonly apiUrl = environment.apiUrl || 'http://localhost:8080/api/game';

  /**
   * Switch toggle for Engine Mode:
   * - true: Backend Mode (Sends HTTP requests to Express & Supabase DB)
   * - false: Browser Mode (Runs local GameController completely in-memory)
   */
  readonly useBackend = signal<boolean>(this.resolveInitialMode());

  // Writable Signal to store the game state DTO
  readonly gameState = signal<GameViewDTO | null>(null);

  private resolveInitialMode(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const stored = localStorage.getItem('kazhudha_use_backend');
        if (stored === 'true') return true;
        if (stored === 'false') return false;
      } catch (err) {
        console.warn('Could not read localStorage for backend mode:', err);
      }
    }
    return Boolean(environment.useBackendApi);
  }

  /**
   * Explicitly set the engine mode and persist in localStorage
   */
  public setUseBackend(enabled: boolean): void {
    this.useBackend.set(enabled);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem('kazhudha_use_backend', String(enabled));
      } catch (err) {
        console.warn('Could not save to localStorage:', err);
      }
    }
  }

  /**
   * Toggle between backend and browser engine
   */
  public toggleBackendMode(): void {
    this.setUseBackend(!this.useBackend());
  }

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
   * Starts a new game session
   * @param sessionId Session identifier
   */
  startGame(sessionId: string = 'default'): Observable<GameViewDTO> {
    if (this.useBackend()) {
      const user = this.authService.currentUser();
      const payload = {
        sessionId,
        userId: user?.id,
        displayName: this.authService.displayName(),
        avatarUrl: this.authService.avatarUrl(),
      };

      const obs$ = this.http
        .post<GameViewDTO>(`${this.apiUrl}/start?sessionId=${sessionId}`, payload, {
          headers: this.getAuthHeaders(),
        })
        .pipe(
          tap((state) => this.gameState.set(state)),
          catchError((err) => {
            console.warn(
              'Backend API unavailable, falling back to local browser engine:',
              err
            );
            const fallbackState = this.controller.startGame(sessionId);
            this.gameState.set(fallbackState);
            return of(fallbackState);
          }),
          shareReplay(1)
        );

      obs$.subscribe();
      return obs$;
    }

    // Completely in browser mode
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
    if (this.useBackend()) {
      const obs$ = this.http
        .post<GameViewDTO>(
          `${this.apiUrl}/play?sessionId=${sessionId}`,
          {
            playerId,
            card,
          },
          { headers: this.getAuthHeaders() }
        )
        .pipe(
          tap((state) => this.gameState.set(state)),
          catchError((err) => {
            console.warn(
              'Backend API error on playCard, falling back to local browser engine:',
              err
            );
            const fallbackState = this.controller.playCard(sessionId, {
              playerId,
              card,
            });
            this.gameState.set(fallbackState);
            return of(fallbackState);
          }),
          shareReplay(1)
        );

      obs$.subscribe();
      return obs$;
    }

    // Completely in browser mode
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

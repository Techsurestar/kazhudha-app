import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GameStateService } from './game-state.service';
import { AuthService } from './auth.service';
import { signal } from '@angular/core';

describe('GameStateService', () => {
  let service: GameStateService;
  let httpMock: HttpTestingController;

  const mockAuthService = {
    currentUser: signal({ id: 'user-abc-123' }),
    displayName: signal('Test Master'),
    avatarUrl: signal('/avatar/custom.webp'),
    session: signal({ access_token: 'fake-jwt-token' } as any),
  };

  beforeEach(() => {
    localStorage.removeItem('kazhudha_use_backend');

    TestBed.configureTestingModule({
      providers: [
        GameStateService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(GameStateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('kazhudha_use_backend');
  });

  it('should reflect initial environment engine mode', () => {
    expect(service.useBackend()).toBe(true);
  });

  it('should toggle backend mode and persist in localStorage', () => {
    service.setUseBackend(true);
    expect(service.useBackend()).toBe(true);
    expect(localStorage.getItem('kazhudha_use_backend')).toBe('true');

    service.toggleBackendMode();
    expect(service.useBackend()).toBe(false);
    expect(localStorage.getItem('kazhudha_use_backend')).toBe('false');
  });

  it('should run in-browser when useBackend is false', () => {
    service.setUseBackend(false);

    let emittedView: any = null;
    service.startGame('session-local').subscribe((v) => {
      emittedView = v;
    });

    expect(emittedView).toBeDefined();
    expect(emittedView.humanHand.length).toBeGreaterThan(0);
    expect(service.gameState()).toBe(emittedView);

    // Verify NO http calls were made
    httpMock.expectNone((req) => req.url.includes('/api/game'));
  });

  it('should call backend API when useBackend is true on startGame', () => {
    service.setUseBackend(true);

    const mockResponse: any = {
      tablePile: [],
      activeRoundSuit: null,
      currentTurnPlayerId: 'human',
      humanHand: [{ suit: 'SPADES', rank: 'ACE' }],
      otherPlayers: [],
      gameOver: false,
      kazhudhaPlayerId: null,
      events: [],
      hands: [],
      tournamentOver: false,
    };

    let emittedView: any = null;
    service.startGame('session-remote').subscribe((v) => {
      emittedView = v;
    });

    const req = httpMock.expectOne((r) => r.url.includes('/api/game/start'));
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer fake-jwt-token');
    expect(req.request.body).toEqual({
      sessionId: 'session-remote',
      userId: 'user-abc-123',
      displayName: 'Test Master',
      avatarUrl: '/avatar/custom.webp',
    });

    req.flush(mockResponse);

    expect(emittedView).toEqual(mockResponse);
    expect(service.gameState()).toEqual(mockResponse);
  });

  it('should fall back to local engine if backend fails', () => {
    service.setUseBackend(true);

    let emittedView: any = null;
    service.startGame('session-failover').subscribe((v) => {
      emittedView = v;
    });

    const req = httpMock.expectOne((r) => r.url.includes('/api/game/start'));
    req.error(new ProgressEvent('Network error'));

    // Should gracefully fall back to local in-memory controller
    expect(emittedView).toBeDefined();
    expect(emittedView.humanHand.length).toBeGreaterThan(0);
    expect(service.gameState()).toBe(emittedView);
  });
});

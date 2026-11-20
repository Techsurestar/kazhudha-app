import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { LeaderboardService } from './leaderboard.service';
import { AuthService } from '../../../core/services/auth.service';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let httpMock: HttpTestingController;

  const mockAuthService = {
    isAuthenticated: signal(true),
    currentUser: signal({ id: 'user-xyz-999' }),
    displayName: signal('LegendaryDonkey'),
    avatarUrl: signal('/avatar/custom.webp'),
    session: signal({ access_token: 'fake-jwt-token' } as any),
    client: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LeaderboardService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(LeaderboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call backend /api/leaderboard with Authorization header', () => {
    service.fetchLeaderboard('all-time', 1, 10).subscribe((res) => {
      expect(res.topThree.length).toBe(3);
    });

    const req = httpMock.expectOne((r) => r.url.includes('/leaderboard'));
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer fake-jwt-token');

    req.flush({
      topThree: [
        { rank: 1, username: 'RoyalDonkey47', points: 1240 },
        { rank: 2, username: 'LuckyAce98', points: 1080 },
        { rank: 3, username: 'CardMaster21', points: 940 },
      ],
      pagePlayers: [],
      currentUser: { rank: 25, username: 'LegendaryDonkey', points: 320 },
      currentPage: 1,
      totalPages: 20,
      totalPlayers: 200,
      startIndex: 1,
      endIndex: 10,
    });
  });

  it('should fall back to local dataset if backend API fails', () => {
    service.fetchLeaderboard('all-time', 1, 10).subscribe((res) => {
      expect(res).toBeDefined();
      expect(res.topThree[0].username).toBe('RoyalDonkey47');
      expect(res.totalPlayers).toBe(200);
    });

    const req = httpMock.expectOne((r) => r.url.includes('/leaderboard'));
    req.error(new ProgressEvent('Network error'));
  });

  it('should correctly build leaderboard dataset from Supabase profiles', () => {
    const mockProfiles = [
      {
        id: 'db-user-1',
        username: 'ApexPredator',
        avatar_url: '/avatar/apex.webp',
        xp: 3000,
      },
      {
        id: 'db-user-2',
        username: 'CasualGamer',
        avatar_url: '/avatar/casual.webp',
        xp: 500,
      },
    ];

    const result = service.buildLeaderboardFromProfiles(mockProfiles, 'all-time', 1, 10);

    // ApexPredator has 3000 XP, CasualGamer has 500 XP, current user is included
    expect(result.topThree[0].username).toBe('ApexPredator');
    expect(result.topThree[0].points).toBe(3000);
    expect(result.totalPlayers).toBe(3);
    expect(result.topThree.some((p) => p.username === 'RoyalDonkey47')).toBe(false);
  });
});

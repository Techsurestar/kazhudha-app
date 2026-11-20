import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { LeaderboardComponent } from './leaderboard.component';
import { LeaderboardService } from './services/leaderboard.service';
import { AuthService } from '../../core/services/auth.service';

describe('LeaderboardComponent', () => {
  let component: LeaderboardComponent;
  let fixture: ComponentFixture<LeaderboardComponent>;
  let leaderboardService: LeaderboardService;
  let mockRouter: any;
  let mockAuthService: any;

  beforeEach(async () => {
    mockRouter = {
      navigate: vi.fn(),
    };

    mockAuthService = {
      isAuthenticated: signal(true),
      displayName: signal('Player123'),
      avatarUrl: signal('/avatar/avatar.jpeg'),
      session: signal({ access_token: 'test-token' }),
      currentUser: signal({ id: 'current-user-25' }),
      client: null,
    };

    await TestBed.configureTestingModule({
      imports: [LeaderboardComponent],
      providers: [
        LeaderboardService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    leaderboardService = TestBed.inject(LeaderboardService);
    vi.spyOn(leaderboardService, 'fetchLeaderboard').mockImplementation(
      (period = 'all-time', page = 1, pageSize = 10) =>
        of(leaderboardService.getLeaderboardData(period, page, pageSize))
    );

    fixture = TestBed.createComponent(LeaderboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the LeaderboardComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should default to "all-time" period and page 1', () => {
    expect(component.selectedPeriod()).toBe('all-time');
    expect(component.currentPage()).toBe(1);
    expect(component.activeNavTab()).toBe('leaderboard');
  });

  it('should display top 3 players matching the screenshot on the podium', () => {
    const topThree = component.topThree();
    expect(topThree.length).toBe(3);

    const rank1 = component.rankOnePlayer();
    expect(rank1?.username).toBe('RoyalDonkey47');
    expect(rank1?.points).toBe(1240);
    expect(rank1?.rank).toBe(1);

    const rank2 = component.rankTwoPlayer();
    expect(rank2?.username).toBe('LuckyAce98');
    expect(rank2?.points).toBe(1080);
    expect(rank2?.rank).toBe(2);

    const rank3 = component.rankThreePlayer();
    expect(rank3?.username).toBe('CardMaster21');
    expect(rank3?.points).toBe(940);
    expect(rank3?.rank).toBe(3);
  });

  it('should display table players starting from rank 4 on page 1', () => {
    const pagePlayers = component.pagePlayers();
    expect(pagePlayers.length).toBe(7); // Ranks 4 to 10
    expect(pagePlayers[0].rank).toBe(4);
    expect(pagePlayers[0].username).toBe('CleverKazhudha19');
    expect(pagePlayers[0].points).toBe(810);

    expect(pagePlayers[1].rank).toBe(5);
    expect(pagePlayers[1].username).toBe('JollyJack56');
    expect(pagePlayers[1].points).toBe(770);
  });

  it('should display current user highlighted row with "You" badge and rank 25', () => {
    const user = component.currentUser();
    expect(user).toBeDefined();
    expect(user.rank).toBe(25);
    expect(user.userBadge).toBe('You');
    expect(user.points).toBe(320);

    const el = fixture.nativeElement as HTMLElement;
    const userCard = el.querySelector('.current-user-card');
    expect(userCard).not.toBeNull();
    expect(userCard?.textContent).toContain('You');
    expect(userCard?.textContent).toContain('25');
  });

  it('should switch periods between all-time, this-week, and this-month', () => {
    component.setPeriod('this-week');
    fixture.detectChanges();
    expect(component.selectedPeriod()).toBe('this-week');
    expect(component.rankOnePlayer()?.points).toBeLessThan(1240);

    component.setPeriod('this-month');
    fixture.detectChanges();
    expect(component.selectedPeriod()).toBe('this-month');

    component.setPeriod('all-time');
    fixture.detectChanges();
    expect(component.rankOnePlayer()?.points).toBe(1240);
  });

  it('should handle pagination changes', () => {
    expect(component.currentPage()).toBe(1);

    component.nextPage();
    fixture.detectChanges();
    expect(component.currentPage()).toBe(2);

    const page2Players = component.pagePlayers();
    expect(page2Players[0].rank).toBe(11);

    component.prevPage();
    fixture.detectChanges();
    expect(component.currentPage()).toBe(1);

    component.setPage(5);
    fixture.detectChanges();
    expect(component.currentPage()).toBe(5);
  });

  it('should navigate back to home on goBack', () => {
    component.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should toggle info modal dialog', () => {
    expect(component.showInfoModal()).toBe(false);

    component.openInfoModal();
    expect(component.showInfoModal()).toBe(true);

    component.closeInfoModal();
    expect(component.showInfoModal()).toBe(false);
  });

  it('should navigate to routes via bottom navigation bar', () => {
    component.onNavTabClick('home');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);

    component.onNavTabClick('play');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/game']);

    component.onNavTabClick('profile');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/profile']);
  });
});

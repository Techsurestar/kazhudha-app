import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { GameResultComponent } from './game-result.component';
import type { HandResult } from '../../../../core/services/game-state.service';
import { AuthService } from '../../../../core/services/auth.service';

describe('GameResultComponent', () => {
  let component: GameResultComponent;
  let fixture: ComponentFixture<GameResultComponent>;
  let mockAuthService: {
    isAuthenticated: any;
    currentUser: any;
  };

  const mockHands: HandResult[] = [
    {
      handNumber: 1,
      winnerId: 'human',
      kazhudhaPlayerId: 'bot3',
      scores: {
        human: 20,
        bot1: 15,
        bot2: 10,
        bot3: 0
      }
    },
    {
      handNumber: 2,
      winnerId: 'bot1',
      kazhudhaPlayerId: 'bot3',
      scores: {
        human: 10,
        bot1: 20,
        bot2: 15,
        bot3: 0
      }
    }
  ];

  beforeEach(async () => {
    mockAuthService = {
      isAuthenticated: signal(true),
      currentUser: signal({ id: 'user-1', email: 'test@example.com' })
    };

    await TestBed.configureTestingModule({
      imports: [GameResultComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GameResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the GameResultComponent', () => {
    expect(component).toBeTruthy();
  });

  describe('player list fallback & configuration', () => {
    it('should use default 4 players when no players input is provided', () => {
      const players = component.playerList();
      expect(players.length).toBe(4);
      expect(players.map(p => p.id)).toEqual(['human', 'bot1', 'bot2', 'bot3']);
      expect(players.map(p => p.name)).toEqual(['You', 'Bot 1', 'Bot 2', 'Bot 3']);
    });

    it('should use custom players when players input is provided', () => {
      const customPlayers = [
        { id: 'playerA', name: 'Alice' },
        { id: 'playerB', name: 'Bob' }
      ];
      fixture.componentRef.setInput('players', customPlayers);
      fixture.detectChanges();

      const players = component.playerList();
      expect(players).toEqual(customPlayers);
    });
  });

  describe('score calculations', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('hands', mockHands);
      fixture.detectChanges();
    });

    it('should accurately calculate total score across multiple hands for each player', () => {
      expect(component.getPlayerTotalScore('human')).toBe(30); // 20 + 10
      expect(component.getPlayerTotalScore('bot1')).toBe(35); // 15 + 20
      expect(component.getPlayerTotalScore('bot2')).toBe(25); // 10 + 15
      expect(component.getPlayerTotalScore('bot3')).toBe(0); // 0 + 0
    });

    it('should return 0 total score if player has no recorded scores', () => {
      expect(component.getPlayerTotalScore('unknown_player')).toBe(0);
    });

    it('should get score for a single hand and fallback to 0 when missing', () => {
      expect(component.getPlayerHandScore(mockHands[0], 'human')).toBe(20);
      expect(component.getPlayerHandScore(mockHands[0], 'nonexistent')).toBe(0);
    });
  });

  describe('player name resolution', () => {
    it('should return empty string for null or undefined id', () => {
      expect(component.getPlayerName(null)).toBe('');
      expect(component.getPlayerName(undefined)).toBe('');
    });

    it('should return "You" for "human"', () => {
      expect(component.getPlayerName('human')).toBe('You');
    });

    it('should return player name if found in list', () => {
      expect(component.getPlayerName('bot1')).toBe('Bot 1');
    });

    it('should return the id if player is not in playerList', () => {
      expect(component.getPlayerName('stranger')).toBe('stranger');
    });
  });

  describe('winner calculation and hand numbers', () => {
    it('should return winner of latest hand', () => {
      fixture.componentRef.setInput('hands', mockHands);
      fixture.detectChanges();
      // Latest hand is hand 2, winner is bot1
      expect(component.getCurrentHandWinnerName()).toBe('Bot 1');
      expect(component.getCurrentHandNumber()).toBe(2);
    });

    it('should handle empty hands gracefully', () => {
      fixture.componentRef.setInput('hands', []);
      fixture.detectChanges();
      expect(component.getCurrentHandWinnerName()).toBe('');
      expect(component.getCurrentHandNumber()).toBe(1);
      expect(component.getTournamentWinnerName()).toBe('');
    });

    it('should determine tournament winner by highest total score', () => {
      fixture.componentRef.setInput('hands', mockHands);
      fixture.detectChanges();
      // bot1 total = 35, human = 30, bot2 = 25, bot3 = 0
      expect(component.getTournamentWinnerId()).toBe('bot1');
      expect(component.getTournamentWinnerName()).toBe('Bot 1');
    });

    describe('isHumanWinner evaluation', () => {
      it('should return true when human wins the current hand (!tournamentOver)', () => {
        fixture.componentRef.setInput('hands', [mockHands[0]]);
        fixture.componentRef.setInput('tournamentOver', false);
        fixture.detectChanges();

        expect(component.isHumanWinner()).toBe(true);
      });

      it('should return false when a bot wins the current hand (!tournamentOver)', () => {
        fixture.componentRef.setInput('hands', mockHands);
        fixture.componentRef.setInput('tournamentOver', false);
        fixture.detectChanges();

        expect(component.isHumanWinner()).toBe(false);
      });

      it('should return true when human wins the tournament (tournamentOver)', () => {
        const humanWinningHands: HandResult[] = [
          {
            handNumber: 1,
            winnerId: 'human',
            kazhudhaPlayerId: 'bot3',
            scores: { human: 20, bot1: 15, bot2: 10, bot3: 0 }
          },
          {
            handNumber: 2,
            winnerId: 'human',
            kazhudhaPlayerId: 'bot3',
            scores: { human: 20, bot1: 10, bot2: 15, bot3: 0 }
          }
        ];
        fixture.componentRef.setInput('hands', humanWinningHands);
        fixture.componentRef.setInput('tournamentOver', true);
        fixture.detectChanges();

        expect(component.isHumanWinner()).toBe(true);
      });

      it('should return false when a bot wins the tournament (tournamentOver)', () => {
        fixture.componentRef.setInput('hands', mockHands);
        fixture.componentRef.setInput('tournamentOver', true);
        fixture.detectChanges();

        expect(component.isHumanWinner()).toBe(false);
      });

      it('should return false when hands is empty', () => {
        fixture.componentRef.setInput('hands', []);
        fixture.detectChanges();

        expect(component.isHumanWinner()).toBe(false);
      });
    });
  });

  describe('reward calculations', () => {
    describe('hand reward structure', () => {
      it('should calculate 1st position rewards: 20 game points, 12 XP, 8 Coins for score 20', () => {
        const reward = component.getHandRewards(20);
        expect(reward).toEqual({ gamePoints: 20, xp: 12, coins: 8 });
      });

      it('should calculate 2nd position rewards: 15 game points, 8 XP, 5 Coins for score 15', () => {
        const reward = component.getHandRewards(15);
        expect(reward).toEqual({ gamePoints: 15, xp: 8, coins: 5 });
      });

      it('should calculate 3rd position rewards: 10 game points, 5 XP, 3 Coins for score 10', () => {
        const reward = component.getHandRewards(10);
        expect(reward).toEqual({ gamePoints: 10, xp: 5, coins: 3 });
      });

      it('should calculate 4th position rewards: 0 game points, 2 XP, 1 Coin for score 0', () => {
        const reward = component.getHandRewards(0);
        expect(reward).toEqual({ gamePoints: 0, xp: 2, coins: 1 });
      });
    });

    describe('human latest hand rewards', () => {
      it('should calculate human rewards based on latest hand score', () => {
        fixture.componentRef.setInput('hands', mockHands);
        fixture.detectChanges();

        // Latest hand is hand 2, where human scored 10 points
        expect(component.humanLatestHandScore()).toBe(10);
        expect(component.humanLatestHandRewards()).toEqual({
          gamePoints: 10,
          xp: 5,
          coins: 3
        });
      });

      it('should default to 0 points (2 XP, 1 Coin) if no hands have been played', () => {
        fixture.componentRef.setInput('hands', []);
        fixture.detectChanges();

        expect(component.humanLatestHandScore()).toBe(0);
        expect(component.humanLatestHandRewards()).toEqual({
          gamePoints: 0,
          xp: 2,
          coins: 1
        });
      });
    });

    describe('accumulated rewards across hands', () => {
      it('should keep adding game points, XP, and coins each hand', () => {
        // Hand 1 only: human scored 20 -> 20 pts, 12 XP, 8 Coins
        fixture.componentRef.setInput('hands', [mockHands[0]]);
        fixture.detectChanges();

        expect(component.accumulatedRewards()).toEqual({
          gamePoints: 20,
          xp: 12,
          coins: 8
        });

        // Add Hand 2: human scored 10 -> 10 pts, 5 XP, 3 Coins
        // Total = 30 pts, 17 XP, 11 Coins
        fixture.componentRef.setInput('hands', mockHands);
        fixture.detectChanges();

        expect(component.accumulatedRewards()).toEqual({
          gamePoints: 30,
          xp: 17,
          coins: 11
        });

        // Add Hand 3: human scored 15 -> 15 pts, 8 XP, 5 Coins
        // Total = 45 pts, 25 XP, 16 Coins
        const hand3: HandResult = {
          handNumber: 3,
          winnerId: 'bot2',
          kazhudhaPlayerId: 'bot3',
          scores: { human: 15, bot1: 10, bot2: 20, bot3: 0 }
        };
        fixture.componentRef.setInput('hands', [...mockHands, hand3]);
        fixture.detectChanges();

        expect(component.accumulatedRewards()).toEqual({
          gamePoints: 45,
          xp: 25,
          coins: 16
        });
      });

      it('should return 0 game points, 0 XP, and 0 coins when no hands have been played', () => {
        fixture.componentRef.setInput('hands', []);
        fixture.detectChanges();

        expect(component.accumulatedRewards()).toEqual({
          gamePoints: 0,
          xp: 0,
          coins: 0
        });
      });
    });
  });

  describe('score chip classes', () => {
    it('should return amber/gold styling for 20 points', () => {
      const cls = component.getScoreChipClass(20);
      expect(cls).toContain('from-amber-200');
      expect(cls).toContain('via-yellow-400');
    });

    it('should return silver/slate styling for 15 points', () => {
      const cls = component.getScoreChipClass(15);
      expect(cls).toContain('from-slate-100');
      expect(cls).toContain('via-zinc-300');
    });

    it('should return crimson/red styling for 10 points', () => {
      const cls = component.getScoreChipClass(10);
      expect(cls).toContain('from-rose-500');
      expect(cls).toContain('via-red-600');
    });

    it('should return sapphire/blue styling for 0 points', () => {
      const cls0 = component.getScoreChipClass(0);
      expect(cls0).toContain('from-blue-500');
      expect(cls0).toContain('via-indigo-700');
    });
  });

  describe('template rendering', () => {
    it('should render CONGRATULATIONS header when human wins hand', () => {
      fixture.componentRef.setInput('hands', [mockHands[0]]);
      fixture.componentRef.setInput('tournamentOver', false);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('CONGRATULATIONS');
      expect(el.textContent).toContain('You won hand 1');
      expect(el.textContent?.toUpperCase()).toContain('PLAY NEXT HAND');
    });

    it('should NOT render CONGRATULATIONS header when a bot wins hand', () => {
      fixture.componentRef.setInput('hands', mockHands);
      fixture.componentRef.setInput('tournamentOver', false);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).not.toContain('CONGRATULATIONS');
      expect(el.textContent).toContain('Bot 1 won hand 2');
      expect(el.textContent?.toUpperCase()).toContain('PLAY NEXT HAND');
    });

    it('should render CONGRATULATIONS header when human wins tournament', () => {
      const humanWinningHands: HandResult[] = [
        {
          handNumber: 1,
          winnerId: 'human',
          kazhudhaPlayerId: 'bot3',
          scores: { human: 20, bot1: 15, bot2: 10, bot3: 0 }
        },
        {
          handNumber: 2,
          winnerId: 'human',
          kazhudhaPlayerId: 'bot3',
          scores: { human: 20, bot1: 10, bot2: 15, bot3: 0 }
        }
      ];
      fixture.componentRef.setInput('hands', humanWinningHands);
      fixture.componentRef.setInput('tournamentOver', true);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('CONGRATULATIONS');
      expect(el.textContent).toContain('You won the tournament!');
      expect(el.textContent?.toUpperCase()).toContain('START NEW TOURNAMENT');
    });

    it('should NOT render CONGRATULATIONS header when a bot wins tournament', () => {
      fixture.componentRef.setInput('hands', mockHands);
      fixture.componentRef.setInput('tournamentOver', true);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).not.toContain('CONGRATULATIONS');
      expect(el.textContent).toContain('Bot 1 won the tournament!');
      expect(el.textContent?.toUpperCase()).toContain('START NEW TOURNAMENT');
    });

    it('should render hand history rows and total scores in scoreboard', () => {
      fixture.componentRef.setInput('hands', mockHands);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('#1');
      expect(el.textContent).toContain('#2');
      expect(el.textContent).toContain('TOTAL');
      expect(el.textContent).toContain('30');
      expect(el.textContent).toContain('35');
    });

    it('should render REWARDS ACCUMULATED card with accumulated game points, XP, and coins', () => {
      fixture.componentRef.setInput('hands', mockHands);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent?.toUpperCase()).toContain('REWARDS ACCUMULATED');
      expect(el.textContent?.toUpperCase()).not.toContain('YOUR REWARDS THIS HAND');
      expect(el.textContent?.toUpperCase()).toContain('GAME POINTS');
      expect(el.textContent?.toUpperCase()).toContain('COINS');
      // Total accumulated across hand 1 (20 pts, 12 XP, 8 Coins) & hand 2 (10 pts, 5 XP, 3 Coins) = 30 pts, +17 XP, +11 Coins
      expect(el.textContent).toContain('30');
      expect(el.textContent).toContain('+17');
      expect(el.textContent).toContain('+11');
    });

    it('should not render MATCH REWARDS progress card', () => {
      fixture.componentRef.setInput('hands', mockHands);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent?.toUpperCase()).not.toContain('MATCH REWARDS');
      expect(el.textContent).not.toContain('Match progress');
      expect(el.textContent).not.toContain('Complete the match to claim your rewards!');
    });

    it('should not render ornate gold corner flourishes', () => {
      const el: HTMLElement = fixture.nativeElement;
      const cornerGoldDef = el.querySelector('#corner-gold');
      expect(cornerGoldDef).toBeNull();
      const cornerFlourish = el.querySelector('svg path[stroke="url(#corner-gold)"]');
      expect(cornerFlourish).toBeNull();
    });

    it('should not render spades crest, laurel branches, or confetti particles in the congratulations header', () => {
      fixture.componentRef.setInput('hands', [mockHands[0]]);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const headerSvg = el.querySelector('svg[viewBox="0 0 400 40"]');
      expect(headerSvg).not.toBeNull();
      // Crest used transform="translate(186, 4) scale(0.7)" and laurels used translate(20, 20) / translate(380, 20)
      const crest = headerSvg?.querySelector('g[transform*="186, 4"]');
      expect(crest).toBeNull();
      const laurelLeft = headerSvg?.querySelector('g[transform*="20, 20"]');
      expect(laurelLeft).toBeNull();
      const laurelRight = headerSvg?.querySelector('g[transform*="380, 20"]');
      expect(laurelRight).toBeNull();
      // Confetti polygons and circles
      const confettiPolygons = headerSvg?.querySelectorAll('polygon');
      expect(confettiPolygons?.length).toBe(0);
      const confettiCircles = headerSvg?.querySelectorAll('circle');
      expect(confettiCircles?.length).toBe(0);
    });

    it('should not render mini laurels in the rewards accumulated ribbon pill', () => {
      const el: HTMLElement = fixture.nativeElement;
      const ribbonContainer = el.querySelector('.absolute.-top-1');
      expect(ribbonContainer).not.toBeNull();
      const miniLaurels = ribbonContainer?.querySelectorAll('svg');
      expect(miniLaurels?.length).toBe(0);
    });

    it('should render motivational rule text', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Keep playing — first player to reach 100 points wins the match.');
    });
  });

  describe('event emissions', () => {
    it('should emit restart and onRestart when handleRestart() is called', () => {
      const restartSpy = vi.fn();
      const onRestartSpy = vi.fn();
      component.restart.subscribe(restartSpy);
      component.onRestart.subscribe(onRestartSpy);

      component.handleRestart();
      expect(restartSpy).toHaveBeenCalledOnce();
      expect(onRestartSpy).toHaveBeenCalledOnce();
    });

    it('should emit restart and onRestart when action button is clicked', () => {
      const restartSpy = vi.fn();
      const onRestartSpy = vi.fn();
      component.restart.subscribe(restartSpy);
      component.onRestart.subscribe(onRestartSpy);

      const goldButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('.gold-gradient-btn');
      expect(goldButton).not.toBeNull();
      expect(goldButton?.querySelector('chevrons-right-icon')).not.toBeNull();
      goldButton?.click();

      expect(restartSpy).toHaveBeenCalledOnce();
      expect(onRestartSpy).toHaveBeenCalledOnce();
    });

    it('should not render a View Table or Close button', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const viewTableButton = Array.from(buttons).find((b: any) => b.textContent?.includes('View Table'));
      expect(viewTableButton).toBeUndefined();

      const closeBtn = fixture.nativeElement.querySelector('button[aria-label="Close"]');
      expect(closeBtn).toBeNull();
    });
  });

  describe('guest player rewards card visibility', () => {
    it('should not display REWARDS ACCUMULATED card if the player is a guest player (isGuest=true)', () => {
      fixture.componentRef.setInput('hands', mockHands);
      fixture.componentRef.setInput('isGuest', true);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(component.isGuestPlayer()).toBe(true);
      expect(el.textContent?.toUpperCase()).not.toContain('REWARDS ACCUMULATED');
      expect(el.textContent?.toUpperCase()).not.toContain('REWARDS EARNED');
      expect(el.querySelector('.rewards-accumulated-card')).toBeNull();
    });

    it('should display REWARDS ACCUMULATED card if the player is not a guest player (isGuest=false)', () => {
      fixture.componentRef.setInput('hands', mockHands);
      fixture.componentRef.setInput('isGuest', false);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(component.isGuestPlayer()).toBe(false);
      expect(el.textContent?.toUpperCase()).toContain('REWARDS ACCUMULATED');
      expect(el.querySelector('.rewards-accumulated-card')).not.toBeNull();
    });

    it('should not display REWARDS ACCUMULATED card when unauthenticated (guest) and isGuest input is omitted', () => {
      mockAuthService.isAuthenticated.set(false);
      fixture.componentRef.setInput('hands', mockHands);
      fixture.componentRef.setInput('isGuest', undefined);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(component.isGuestPlayer()).toBe(true);
      expect(el.textContent?.toUpperCase()).not.toContain('REWARDS ACCUMULATED');
      expect(el.querySelector('.rewards-accumulated-card')).toBeNull();
    });

    it('should display REWARDS ACCUMULATED card when authenticated and isGuest input is omitted', () => {
      mockAuthService.isAuthenticated.set(true);
      fixture.componentRef.setInput('hands', mockHands);
      fixture.componentRef.setInput('isGuest', undefined);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(component.isGuestPlayer()).toBe(false);
      expect(el.textContent?.toUpperCase()).toContain('REWARDS ACCUMULATED');
      expect(el.querySelector('.rewards-accumulated-card')).not.toBeNull();
    });
  });
});

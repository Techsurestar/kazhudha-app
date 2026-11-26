import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardTableComponent } from './card-table.component';
import { GameStateService } from '../../core/services/game-state.service';

describe('CardTableComponent', () => {
  let component: CardTableComponent;
  let fixture: ComponentFixture<CardTableComponent>;
  let gameStateService: GameStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardTableComponent]
    }).compileComponents();

    gameStateService = TestBed.inject(GameStateService);
    fixture = TestBed.createComponent(CardTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('autoDeal', false);
    fixture.detectChanges();
  });

  it('should create the CardTableComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should have empty center cards and 0 card counts on initial state', () => {
    expect(component.centerCards().length).toBe(0);
    expect(component.humanCards().length).toBe(0);
    expect(component.topPlayer().cardCount).toBe(0);
    expect(component.leftPlayer().cardCount).toBe(0);
    expect(component.rightPlayer().cardCount).toBe(0);
    expect(component.humanPlayer().cardCount).toBe(0);
    expect(component.isDealing()).toBe(false);
  });

  it('should render the top ad slot with allocated height (50-60px)', () => {
    const el: HTMLElement = fixture.nativeElement;
    const adBanner = el.querySelector('app-ad-banner');
    expect(adBanner).not.toBeNull();

    const adAside = el.querySelector('app-ad-banner aside') as HTMLElement;
    expect(adAside).not.toBeNull();
    expect(component.adSlotHeight).toBeGreaterThanOrEqual(50);
    expect(component.adSlotHeight).toBeLessThanOrEqual(60);
    expect(adAside.style.height).toBe(`${component.adSlotHeight}px`);
  });

  it('should render the four player seats (Jenny, Leo, Sofia, You)', () => {
    const el: HTMLElement = fixture.nativeElement;
    const text = el.textContent || '';

    expect(text).toContain('Leo');
    expect(text).toContain('Jenny');
    expect(text).toContain('Sofia');
    expect(text).toContain('You');
  });

  it('should render the Kazhudha Club watermark in the center', () => {
    const text = fixture.nativeElement.textContent || '';
    expect(text).toContain('Kazhudha Club');
  });

  it('should render the center trick pile cards using CenterTrickPileComponent', () => {
    component.centerCards.set([
      { playerId: 'bot1', rank: '2', suit: 'CLUBS', position: 'left' },
      { playerId: 'bot2', rank: '3', suit: 'CLUBS', position: 'top' },
      { playerId: 'bot3', rank: 'J', suit: 'CLUBS', position: 'right' }
    ]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const centerPile = el.querySelector('app-center-trick-pile');
    expect(centerPile).not.toBeNull();

    const cards = centerPile?.querySelectorAll('app-card');
    expect(cards?.length).toBe(3);
  });

  it('should render the human hand component and control Skip Game visibility', () => {
    const el: HTMLElement = fixture.nativeElement;
    const humanHand = el.querySelector('app-human-hand');
    expect(humanHand).not.toBeNull();

    // When cards are empty initially before deal, Skip Game button is NOT rendered
    expect(component.canSkip()).toBe(false);
    expect(humanHand?.querySelector('.skip-game-btn')).toBeNull();

    // When cards are populated, card elements match humanCards count
    component.humanCards.set([
      { rank: 'ACE', suit: 'SPADES' },
      { rank: 'KING', suit: 'HEARTS' }
    ]);
    fixture.detectChanges();

    const cardElements = humanHand?.querySelectorAll('app-card');
    expect(cardElements?.length).toBe(2);
    expect(humanHand?.querySelector('.skip-game-btn')).toBeNull();

    // When game has dealt and human has shed all cards (empty hand during game), Skip Game button IS rendered
    component.hasDealt.set(true);
    component.humanCards.set([]);
    fixture.detectChanges();

    expect(component.canSkip()).toBe(true);
    expect(humanHand?.querySelector('.skip-game-btn')).not.toBeNull();
  });

  it('should render the bottom action bar with Hint button', () => {
    const el: HTMLElement = fixture.nativeElement;
    const actionBar = el.querySelector('app-action-bar');
    expect(actionBar).not.toBeNull();

    const buttons = actionBar?.querySelectorAll('button');
    expect(buttons?.length).toBe(2);

    const buttonTexts = Array.from(buttons || []).map(b => b.textContent?.trim());
    expect(buttonTexts).toContain('Hint');
    expect(buttonTexts).toContain('Info');
    expect(buttonTexts).not.toContain('New');
  });

  it('should render the card flight layer component', () => {
    const el: HTMLElement = fixture.nativeElement;
    const flightLayer = el.querySelector('app-card-flight-layer');
    expect(flightLayer).not.toBeNull();
  });

  it('should update player hand counts when deal flights complete', () => {
    component.visualCardCounts.set({ bot1: 0, bot2: 0, bot3: 0, human: 0 });
    component.humanCards.set([]);

    // Deal to left
    component.onFlightComplete({
      flightId: 'd-1',
      item: { id: 'd-1', rank: 'A', suit: 'SPADES', from: 'bottom', to: 'left', mode: 'deal' }
    });
    expect(component.leftPlayer().cardCount).toBe(1);

    // Deal to top
    component.onFlightComplete({
      flightId: 'd-2',
      item: { id: 'd-2', rank: 'K', suit: 'HEARTS', from: 'bottom', to: 'top', mode: 'deal' }
    });
    expect(component.topPlayer().cardCount).toBe(1);

    // Deal to right
    component.onFlightComplete({
      flightId: 'd-3',
      item: { id: 'd-3', rank: 'Q', suit: 'DIAMONDS', from: 'bottom', to: 'right', mode: 'deal' }
    });
    expect(component.rightPlayer().cardCount).toBe(1);

    // Deal to bottom (human)
    component.onFlightComplete({
      flightId: 'd-4',
      item: { id: 'd-4', rank: 'J', suit: 'CLUBS', from: 'bottom', to: 'bottom', mode: 'deal' }
    });
    expect(component.humanPlayer().cardCount).toBe(1);
    expect(component.humanCards().length).toBe(1);
    expect(component.humanCards()[0]).toEqual({ rank: 'J', suit: 'CLUBS' });
  });

  it('should generate 52 unique cards in generateDeck()', () => {
    const deck = component.generateDeck();
    expect(deck.length).toBe(52);

    const keys = new Set(deck.map(c => `${c.rank}-${c.suit}`));
    expect(keys.size).toBe(52);
  });

  it('should trigger startNewGameDeal when starting new game', () => {
    expect(component.isDealing()).toBe(false);
    component.startNewGameDeal(true);
    fixture.detectChanges();
    expect(component.isDealing()).toBe(true);
    expect(component.remainingDeck()).toBeLessThanOrEqual(52);
  });

  it('should sort cards by suit and rank correctly', () => {
    const unsorted = [
      { rank: 'K', suit: 'DIAMONDS' as const },
      { rank: '2', suit: 'SPADES' as const },
      { rank: 'A', suit: 'SPADES' as const },
      { rank: '10', suit: 'HEARTS' as const },
      { rank: '4', suit: 'CLUBS' as const }
    ];

    const sorted = component.sortCards(unsorted);
    expect(sorted.map(c => `${c.rank}-${c.suit}`)).toEqual([
      '2-SPADES',
      'A-SPADES',
      '10-HEARTS',
      '4-CLUBS',
      'K-DIAMONDS'
    ]);
  });

  it('should correctly calculate rank chips for escaped players', () => {
    component.escapedOrder.set(['bot1', 'human', 'bot2']);
    expect(component.getRankChip('bot1')).toEqual({ label: '1st', type: 'gold' });
    expect(component.getRankChip('human')).toEqual({ label: '2nd', type: 'silver' });
    expect(component.getRankChip('bot2')).toEqual({ label: '3rd', type: 'bronze' });
    expect(component.getRankChip('bot3')).toBeNull();
  });

  it('should give a hint when it is human turn', () => {
    component.currentTurnPlayerId.set('human');
    component.humanCards.set([
      { rank: 'ACE', suit: 'SPADES' },
      { rank: 'FOUR', suit: 'CLUBS' }
    ]);

    component.onHintClick();
    expect(component.toastMessage()).toContain('Hint: Play');
  });

  it('should recommend advanced safe dump (highest undercard) when an opponent already played a high card', () => {
    // P1 played 2 of Diamonds, P2 played K of Diamonds
    component.centerCards.set([
      { playerId: 'bot1', rank: '2', suit: 'DIAMONDS', position: 'left' },
      { playerId: 'bot2', rank: 'K', suit: 'DIAMONDS', position: 'top' }
    ]);
    component.currentTurnPlayerId.set('human');

    // Human holds 3, 9, and J of Diamonds
    component.humanCards.set([
      { rank: '3', suit: 'DIAMONDS' },
      { rank: '9', suit: 'DIAMONDS' },
      { rank: 'J', suit: 'DIAMONDS' }
    ]);

    component.onHintClick();

    // With K of Diamonds on the pile, J of Diamonds is the highest safe under-card!
    expect(component.toastMessage()).toBe('💡 Hint: Play J of DIAMONDS');
  });

  it('should recommend lowest overcard when forced to play higher than current pile', () => {
    // P1 played 2 of Diamonds, P2 played 4 of Diamonds
    component.centerCards.set([
      { playerId: 'bot1', rank: '2', suit: 'DIAMONDS', position: 'left' },
      { playerId: 'bot2', rank: '4', suit: 'DIAMONDS', position: 'top' }
    ]);
    component.currentTurnPlayerId.set('human');

    // Human holds 9 and J of Diamonds (both higher than 4)
    component.humanCards.set([
      { rank: '9', suit: 'DIAMONDS' },
      { rank: 'J', suit: 'DIAMONDS' }
    ]);

    component.onHintClick();

    // Forced to play higher; recommends lowest over-card (9) to minimize waste
    expect(component.toastMessage()).toBe('💡 Hint: Play 9 of DIAMONDS');
  });

  it('should warn when human attempts to play out of turn', () => {
    component.currentTurnPlayerId.set('bot1');
    component.humanCards.set([{ rank: 'ACE', suit: 'SPADES' }]);

    component.onCardPlayed({ rank: 'ACE', suit: 'SPADES' });
    expect(component.toastMessage()).toBe('It is not your turn!');
  });

  it('should display showToast messages including Hint: Play message in the action bar text badge', () => {
    // 1. Non-hint message should display in actionBadgeText and inside action bar text badge
    component.showToast('It is not your turn!');
    fixture.detectChanges();

    expect(component.actionBadgeText()).toBe('It is not your turn!');
    const badgeEl = fixture.nativeElement.querySelector('app-action-bar .text-area-badge');
    expect(badgeEl?.textContent).toContain('It is not your turn!');

    // 2. Hint: Play message should also update actionBadgeText and display inside action bar text badge
    component.currentTurnPlayerId.set('human');
    component.humanCards.set([{ rank: 'ACE', suit: 'SPADES' }]);
    component.onHintClick();
    fixture.detectChanges();

    expect(component.toastMessage()).toContain('Hint: Play');
    expect(component.actionBadgeText()).toContain('Hint: Play');

    // Action bar badge contains the hint play message
    const badgeAfterHint = fixture.nativeElement.querySelector('app-action-bar .text-area-badge');
    expect(badgeAfterHint?.textContent).toContain('Hint: Play');

    // Toast banner element should not be present in card table
    const hintBanner = fixture.nativeElement.querySelector('.top-16');
    expect(hintBanner).toBeNull();
  });

  it('should display vettuAlertMessage in the action bar text badge', () => {
    component.vettuAlertMessage.set('💥 Vettu! Jenny strikes! Leo will lead the next turn!');
    fixture.detectChanges();

    expect(component.actionBadgeText()).toBe('💥 Vettu! Jenny strikes! Leo will lead the next turn!');
    const badgeEl = fixture.nativeElement.querySelector('app-action-bar .text-area-badge');
    expect(badgeEl?.textContent).toContain('💥 Vettu! Jenny strikes! Leo will lead the next turn!');

    component.vettuAlertMessage.set(null);
    fixture.detectChanges();
    expect(component.actionBadgeText()).toBe('');
    expect(badgeEl?.textContent?.trim()).toBe('');
  });

  it('should not display the badge text in the action bar text badge when info button is toggled off', () => {
    component.showToast('It is not your turn!');
    fixture.detectChanges();

    const badgeEl = fixture.nativeElement.querySelector('app-action-bar .text-area-badge');
    expect(badgeEl?.textContent).toContain('It is not your turn!');

    // Click Info button on the action bar to toggle it off
    const infoBtn = fixture.nativeElement.querySelector('app-action-bar button[aria-label="Information"]') as HTMLButtonElement;
    infoBtn.click();
    fixture.detectChanges();

    // Text area badge should not display the info message now
    expect(badgeEl?.textContent?.trim()).toBe('');
  });

  it('should display the hint message in the action bar text badge even when info button is toggled off', () => {
    // Click Info button on the action bar to toggle it off
    const infoBtn = fixture.nativeElement.querySelector('app-action-bar button[aria-label="Information"]') as HTMLButtonElement;
    infoBtn.click();
    fixture.detectChanges();

    // Trigger hint on human turn
    component.currentTurnPlayerId.set('human');
    component.humanCards.set([{ rank: 'ACE', suit: 'SPADES' }]);
    component.onHintClick();
    fixture.detectChanges();

    expect(component.actionBadgeText()).toContain('Hint: Play');

    const badgeEl = fixture.nativeElement.querySelector('app-action-bar .text-area-badge');
    expect(badgeEl?.textContent).toContain('Hint: Play');
  });

  it('should correctly identify red vs black suits', () => {
    expect(component.isRedSuit('HEARTS')).toBe(true);
    expect(component.isRedSuit('DIAMONDS')).toBe(true);
    expect(component.isRedSuit('SPADES')).toBe(false);
    expect(component.isRedSuit('CLUBS')).toBe(false);
  });

  it('should return correct suit symbols', () => {
    expect(component.getSuitSymbol('SPADES')).toBe('♠');
    expect(component.getSuitSymbol('HEARTS')).toBe('♥');
    expect(component.getSuitSymbol('DIAMONDS')).toBe('♦');
    expect(component.getSuitSymbol('CLUBS')).toBe('♣');
  });

  it('should determine the active players count dynamically based on escaped players', () => {
    expect(component.getActivePlayersCount()).toBe(4);
    component.escapedOrder.set(['bot1']);
    expect(component.getActivePlayersCount()).toBe(3);
    component.escapedOrder.set(['bot1', 'human']);
    expect(component.getActivePlayersCount()).toBe(2);
    // Minimum 2
    component.escapedOrder.set(['bot1', 'human', 'bot2']);
    expect(component.getActivePlayersCount()).toBe(2);
  });

  it('should determine trick winner by highest card of the lead suit', () => {
    const trickCards = [
      { playerId: 'bot1', rank: '7', suit: 'SPADES' as const, position: 'left' as const },
      { playerId: 'bot2', rank: 'K', suit: 'SPADES' as const, position: 'top' as const },
      { playerId: 'bot3', rank: 'A', suit: 'HEARTS' as const, position: 'right' as const }, // off-suit (discard)
      { playerId: 'human', rank: '10', suit: 'SPADES' as const, position: 'bottom' as const }
    ];

    const winner = component.getTrickWinner(trickCards);
    expect(winner).not.toBeNull();
    expect(winner?.playerId).toBe('bot2');
    expect(winner?.name).toBe('Leo');
  });

  it('should not duplicate card in centerCards when human plays Vettu', async () => {
    vi.useFakeTimers();
    // Lead card is Hearts
    component.centerCards.set([
      { playerId: 'bot1', rank: 'KING', suit: 'HEARTS', position: 'left' }
    ]);
    component.visualCardCounts.set({ bot1: 12, bot2: 13, bot3: 13, human: 13 });

    // Simulate human already placed off-suit card (SPADES) in pile on click
    component.centerCards.update(pile => [
      ...pile,
      { playerId: 'human', rank: '7', suit: 'SPADES', position: 'bottom' }
    ]);

    expect(component.centerCards().length).toBe(2);

    // Call runNextEvent with human VETTU event
    const fakeState = {
      sessionId: 'test',
      currentTurnPlayerId: 'human',
      humanHand: [],
      otherPlayers: [
        { id: 'bot1', name: 'Jenny', handSize: 12, hasGottenAway: false },
        { id: 'bot2', name: 'Leo', handSize: 13, hasGottenAway: false },
        { id: 'bot3', name: 'Sofia', handSize: 13, hasGottenAway: false }
      ],
      tablePile: [],
      kazhudhaPlayerId: null,
      gameOver: false,
      events: []
    };

    (component as any).eventQueue = [
      {
        eventType: 'VETTU',
        playerId: 'human',
        card: { rank: '7', suit: 'SPADES' }
      }
    ];

    // Spy on flightLayer to make sure no second flight was triggered
    const flightSpy = vi.fn();
    (component as any).flightLayer = () => ({ triggerFlight: flightSpy });

    const eventPromise = (component as any).runNextEvent(fakeState);

    // Human vettu should NOT trigger a second flight
    expect(flightSpy).not.toHaveBeenCalled();

    // Vettu flash and message should be set for human
    expect(component.isVettuFlashing()).toBe(true);
    expect(component.vettuAlertMessage()).toBe('💥 Vettu! You strikes! Jenny will lead the next turn!');
    expect(component.actionBadgeText()).toBe('💥 Vettu! You strikes! Jenny will lead the next turn!');

    // Wait for the vettu animation delay via fake timers
    await vi.advanceTimersByTimeAsync(1700);
    await eventPromise;

    // Center cards should be cleared after Vettu finishes
    expect(component.centerCards().length).toBe(0);

    vi.useRealTimers();
  });

  it('should display You will lead the next turn when human played highest lead card before Vettu', async () => {
    vi.useFakeTimers();
    component.centerCards.set([
      { playerId: 'human', rank: 'ACE', suit: 'CLUBS', position: 'bottom' },
      { playerId: 'bot1', rank: 'KING', suit: 'CLUBS', position: 'left' }
    ]);
    const fakeState: any = {
      sessionId: 'test',
      currentTurnPlayerId: 'human',
      humanHand: [],
      otherPlayers: [
        { id: 'bot1', name: 'Jenny', handSize: 10, hasGottenAway: false },
        { id: 'bot2', name: 'Leo', handSize: 10, hasGottenAway: false },
        { id: 'bot3', name: 'Sofia', handSize: 10, hasGottenAway: false }
      ],
      tablePile: [],
      kazhudhaPlayerId: null,
      gameOver: false,
      events: []
    };
    (component as any).eventQueue = [
      {
        eventType: 'VETTU',
        playerId: 'bot2',
        card: { rank: '2', suit: 'HEARTS' }
      }
    ];

    const flightSpy = vi.fn().mockResolvedValue(undefined);
    (component as any).flightLayer = () => ({ triggerFlight: flightSpy });

    const eventPromise = (component as any).runNextEvent(fakeState);
    await vi.advanceTimersByTimeAsync(600);

    expect(component.vettuAlertMessage()).toBe('💥 Vettu! Leo strikes! You will lead the next turn!');
    expect(component.actionBadgeText()).toBe('💥 Vettu! Leo strikes! You will lead the next turn!');

    await vi.advanceTimersByTimeAsync(1700);
    await eventPromise;
    vi.useRealTimers();
  });

  it('should immediately flush event queue and update state when onSkipGame is called on a finished game', () => {
    (component as any).eventQueue = [
      { eventType: 'PLAY', playerId: 'bot1', card: { rank: '2', suit: 'SPADES' } },
      { eventType: 'PLAY', playerId: 'bot2', card: { rank: '3', suit: 'SPADES' } }
    ];
    (component as any).isReplaying.set(true);

    const fakeFinishedState: any = {
      sessionId: 'test',
      currentTurnPlayerId: '',
      humanHand: [],
      otherPlayers: [
        { id: 'bot1', name: 'Jenny', handSize: 0, hasGottenAway: true },
        { id: 'bot2', name: 'Leo', handSize: 0, hasGottenAway: true },
        { id: 'bot3', name: 'Sofia', handSize: 5, hasGottenAway: false }
      ],
      tablePile: [],
      kazhudhaPlayerId: 'bot3',
      gameOver: true,
      events: []
    };
    (component as any).lastProcessedState = fakeFinishedState;

    component.onSkipGame();

    expect((component as any).eventQueue.length).toBe(0);
    expect(component.isReplaying()).toBe(false);
    expect(component.showGameResultModal()).toBe(true);
    expect(component.escapedOrder()).toContain('human');
    expect(component.escapedOrder()).toContain('bot1');
    expect(component.escapedOrder()).toContain('bot2');
  });

  describe('Game Result Modal integration', () => {
    it('should not display app-game-result by default when showGameResultModal is false', () => {
      expect(component.showGameResultModal()).toBe(false);
      const modal = fixture.nativeElement.querySelector('app-game-result');
      expect(modal).toBeNull();
    });

    it('should display app-game-result and pass playersList, hands, tournamentOver, kazhudhaPlayerId, and isGuest when showGameResultModal is true', () => {
      component.showGameResultModal.set(true);
      fixture.detectChanges();

      const modal = fixture.nativeElement.querySelector('app-game-result');
      expect(modal).not.toBeNull();
      expect(component.playersList().length).toBe(4);
      expect(component.playersList().map(p => p.id)).toEqual(['human', 'bot1', 'bot2', 'bot3']);
      expect(typeof component.isGuest()).toBe('boolean');
    });

    it('should continue existing match session when onRestartGame is triggered between hands (!tournamentOver)', () => {
      component.showGameResultModal.set(true);
      const originalSessionId = component.sessionId;
      fixture.detectChanges();

      component.onRestartGame();
      fixture.detectChanges();

      expect(component.showGameResultModal()).toBe(false);
      expect(component.isDealing()).toBe(true);
      // sessionId must be preserved to continue match towards 100 points
      expect(component.sessionId).toBe(originalSessionId);
    });

    it('should create a fresh session when onRestartGame is triggered after tournament completion (tournamentOver)', () => {
      component.showGameResultModal.set(true);
      const initialSessionId = 'old_session_123';
      component.sessionId = initialSessionId;
      // Mock gameState with tournamentOver = true
      vi.spyOn(component, 'tournamentOver').mockReturnValue(true);
      fixture.detectChanges();

      component.onRestartGame();
      fixture.detectChanges();

      expect(component.showGameResultModal()).toBe(false);
      expect(component.isDealing()).toBe(true);
      // Fresh session ID must be generated when starting new tournament
      expect(component.sessionId).not.toBe(initialSessionId);
      expect(component.sessionId).toContain('session_');
    });

    it('should show game result modal when runNextEvent finishes with gameOver true', async () => {
      const gameOverState: any = {
        sessionId: 'test',
        currentTurnPlayerId: '',
        humanHand: [],
        otherPlayers: [
          { id: 'bot1', name: 'Jenny', handSize: 0, hasGottenAway: true },
          { id: 'bot2', name: 'Leo', handSize: 0, hasGottenAway: true },
          { id: 'bot3', name: 'Sofia', handSize: 4, hasGottenAway: false }
        ],
        tablePile: [],
        kazhudhaPlayerId: 'bot3',
        gameOver: true,
        events: []
      };

      (component as any).eventQueue = [];
      await (component as any).runNextEvent(gameOverState);
      fixture.detectChanges();

      expect(component.showGameResultModal()).toBe(true);
      const modal = fixture.nativeElement.querySelector('app-game-result');
      expect(modal).not.toBeNull();
    });
  });
});

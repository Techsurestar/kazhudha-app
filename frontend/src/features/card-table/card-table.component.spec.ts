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

  it('should render the bottom action bar with Information button', () => {
    const el: HTMLElement = fixture.nativeElement;
    const actionBar = el.querySelector('app-action-bar');
    expect(actionBar).not.toBeNull();

    const buttons = actionBar?.querySelectorAll('button');
    expect(buttons?.length).toBe(1);

    const buttonTexts = Array.from(buttons || []).map(b => b.textContent?.trim());
    expect(buttonTexts).not.toContain('Hint');
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

  it('should warn when human attempts to play out of turn', () => {
    component.currentTurnPlayerId.set('bot1');
    component.humanCards.set([{ rank: 'ACE', suit: 'SPADES' }]);

    component.onCardPlayed({ rank: 'ACE', suit: 'SPADES' });
    expect(component.toastMessage()).toBe('It is not your turn!');
  });

  it('should display showToast messages in the action bar text badge', () => {
    component.showToast('It is not your turn!');
    fixture.detectChanges();

    expect(component.actionBadgeText()).toBe('It is not your turn!');
    const badgeEl = fixture.nativeElement.querySelector('app-action-bar .text-area-badge');
    expect(badgeEl?.textContent).toContain('It is not your turn!');

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

  it('should maintain trick pile synchronization when multiple players escape in the same trick', async () => {
    vi.useFakeTimers();

    component.centerCards.set([]);
    component.escapedOrder.set([]);
    (component as any).updateActiveTrickPlayerCount();

    expect(component.getActivePlayersCount()).toBe(4);

    const flightSpy = vi.fn().mockResolvedValue(undefined);
    (component as any).flightLayer = () => ({ triggerFlight: flightSpy });

    const fakeState: any = {
      sessionId: 'test',
      currentTurnPlayerId: 'human',
      humanHand: [{ rank: '3', suit: 'SPADES' }],
      otherPlayers: [
        { id: 'bot1', name: 'Jenny', handSize: 0, hasGottenAway: true },
        { id: 'bot2', name: 'Leo', handSize: 0, hasGottenAway: true },
        { id: 'bot3', name: 'Sofia', handSize: 4, hasGottenAway: false }
      ],
      tablePile: [],
      kazhudhaPlayerId: null,
      gameOver: false,
      events: []
    };

    (component as any).eventQueue = [
      // 1. Human plays lead card
      { eventType: 'PLAY', playerId: 'human', card: { rank: '7', suit: 'SPADES' } },
      // 2. Bot 1 plays card and escapes
      { eventType: 'PLAY', playerId: 'bot1', card: { rank: '9', suit: 'SPADES' } },
      { eventType: 'ESCAPE', playerId: 'bot1', card: null, description: 'Jenny escaped!' },
      // 3. Bot 2 plays card and escapes
      { eventType: 'PLAY', playerId: 'bot2', card: { rank: 'JACK', suit: 'SPADES' } },
      { eventType: 'ESCAPE', playerId: 'bot2', card: null, description: 'Leo escaped!' },
      // 4. Bot 3 plays last card of trick
      { eventType: 'PLAY', playerId: 'bot3', card: { rank: 'ACE', suit: 'SPADES' } }
    ];

    const runPromise = (component as any).runNextEvent(fakeState);

    // Human plays (immediate)
    await vi.advanceTimersByTimeAsync(200);
    expect(component.centerCards().length).toBe(1);

    // Bot 1 plays + escapes (deferred while trick is active)
    await vi.advanceTimersByTimeAsync(1200);
    expect(component.centerCards().length).toBe(2);
    expect(component.pendingEscapes).toContain('bot1');
    expect(component.escapedOrder()).not.toContain('bot1');
    expect(component.getRankChip('bot1')).toBeNull();

    // Bot 2 plays + escapes (Trick must NOT clear prematurely here despite 2 escapes!)
    await vi.advanceTimersByTimeAsync(1200);
    expect(component.centerCards().length).toBe(3);
    expect(component.pendingEscapes).toContain('bot2');
    expect(component.escapedOrder()).not.toContain('bot2');
    expect(component.getRankChip('bot2')).toBeNull();

    // Bot 3 plays 4th card (Now all 4 active players for this trick have played)
    await vi.advanceTimersByTimeAsync(1200);
    expect(component.centerCards().length).toBe(4);

    // Allow trick completion pause (1200ms) + buffer to clear pile
    await vi.advanceTimersByTimeAsync(1500);
    await runPromise;

    // Center cards must now be cleanly cleared
    expect(component.centerCards().length).toBe(0);

    // After trick resolves, both escaped players are confirmed in escapedOrder
    expect(component.escapedOrder()).toEqual(['bot1', 'bot2']);
    expect(component.pendingEscapes.length).toBe(0);
    expect(component.getRankChip('bot1')).toEqual({ label: '1st', type: 'gold' });
    expect(component.getRankChip('bot2')).toEqual({ label: '2nd', type: 'silver' });

    // Active players count for the next trick should now reflect the 2 escaped players
    expect(component.getActivePlayersCount()).toBe(2);

    vi.useRealTimers();
  });

  it('should not display position chip when a bot receives vettu on their last card', async () => {
    vi.useFakeTimers();

    const flightSpy = vi.fn().mockResolvedValue(undefined);
    (component as any).flightLayer = () => ({ triggerFlight: flightSpy });

    const fakeState: any = {
      sessionId: 'test',
      currentTurnPlayerId: 'bot1',
      humanHand: [{ rank: '3', suit: 'SPADES' }],
      otherPlayers: [
        { id: 'bot1', name: 'Jenny', handSize: 2, hasGottenAway: false },
        { id: 'bot2', name: 'Leo', handSize: 3, hasGottenAway: false },
        { id: 'bot3', name: 'Sofia', handSize: 4, hasGottenAway: false }
      ],
      tablePile: [],
      kazhudhaPlayerId: null,
      gameOver: false,
      events: []
    };

    component.centerCards.set([]);
    component.escapedOrder.set([]);
    component.pendingEscapes = [];

    (component as any).eventQueue = [
      // 1. Bot 1 leads King of Spades (shedding last card)
      { eventType: 'PLAY', playerId: 'bot1', card: { rank: 'KING', suit: 'SPADES' } },
      { eventType: 'ESCAPE', playerId: 'bot1', card: null, description: 'Jenny escaped!' },
      // 2. Bot 2 plays 4 of Hearts (Vettu strike! Cutting the trick)
      { eventType: 'VETTU', playerId: 'bot2', card: { rank: '4', suit: 'HEARTS' } }
    ];

    const runPromise = (component as any).runNextEvent(fakeState);

    // Bot 1 plays King of Spades + escape event arrives
    await vi.advanceTimersByTimeAsync(1200);
    expect(component.centerCards().length).toBe(1);
    // Position chip MUST NOT be displayed before Vettu is applied!
    expect(component.escapedOrder()).not.toContain('bot1');
    expect(component.getRankChip('bot1')).toBeNull();
    expect(component.pendingEscapes).toContain('bot1');

    // Bot 2 executes Vettu strike (Vettu flight + banner pause 1600ms)
    await vi.advanceTimersByTimeAsync(3000);
    await runPromise;

    // Vettu has cleared the pile and penalized Bot 1 (highest card of lead suit SPADES)
    expect(component.centerCards().length).toBe(0);
    // Bot 1 took the penalty pile, so Bot 1 NEVER escaped and position chip was never awarded
    expect(component.escapedOrder()).not.toContain('bot1');
    expect(component.getRankChip('bot1')).toBeNull();
    expect(component.pendingEscapes).not.toContain('bot1');
    // Bot 1's card count increased by the pile size (2 cards)
    expect(component.visualCardCounts()['bot1']).toBe(2);

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

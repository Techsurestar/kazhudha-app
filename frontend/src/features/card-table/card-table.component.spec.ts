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

  it('should render the human hand component', () => {
    const el: HTMLElement = fixture.nativeElement;
    const humanHand = el.querySelector('app-human-hand');
    expect(humanHand).not.toBeNull();

    const cardButtons = humanHand?.querySelectorAll('button');
    expect(cardButtons?.length).toBe(component.humanCards().length);
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

  it('should trigger startNewGameDeal when onNewGameClick is called', () => {
    expect(component.isDealing()).toBe(false);
    component.onNewGameClick();
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

  it('should warn when human attempts to play out of turn', () => {
    component.currentTurnPlayerId.set('bot1');
    component.humanCards.set([{ rank: 'ACE', suit: 'SPADES' }]);

    component.onCardPlayed({ rank: 'ACE', suit: 'SPADES' });
    expect(component.toastMessage()).toBe('It is not your turn!');
  });

  it('should display showToast messages in the action bar text badge except for Hint: Play message', () => {
    // 1. Non-hint message should display in actionBadgeText and inside action bar text badge
    component.showToast('It is not your turn!');
    fixture.detectChanges();

    expect(component.actionBadgeText()).toBe('It is not your turn!');
    const badgeEl = fixture.nativeElement.querySelector('app-action-bar .text-area-badge');
    expect(badgeEl?.textContent).toContain('It is not your turn!');

    // 2. Hint: Play message should update toastMessage but NOT actionBadgeText
    component.currentTurnPlayerId.set('human');
    component.humanCards.set([{ rank: 'ACE', suit: 'SPADES' }]);
    component.onHintClick();
    fixture.detectChanges();

    expect(component.toastMessage()).toContain('Hint: Play');
    expect(component.actionBadgeText()).not.toContain('Hint: Play');

    // Action bar badge does not contain the hint play message
    const badgeAfterHint = fixture.nativeElement.querySelector('app-action-bar .text-area-badge');
    expect(badgeAfterHint?.textContent).not.toContain('Hint: Play');
  });

  it('should display vettuAlertMessage in the action bar text badge', () => {
    component.vettuAlertMessage.set('💥 Vettu! Jenny cut the trick!');
    fixture.detectChanges();

    expect(component.actionBadgeText()).toBe('💥 Vettu! Jenny cut the trick!');
    const badgeEl = fixture.nativeElement.querySelector('app-action-bar .text-area-badge');
    expect(badgeEl?.textContent).toContain('💥 Vettu! Jenny cut the trick!');

    component.vettuAlertMessage.set(null);
    fixture.detectChanges();
    expect(component.actionBadgeText()).toBe('');
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
    expect(component.vettuAlertMessage()).toBe('💥 Vettu! You cut the trick!');
    expect(component.actionBadgeText()).toBe('💥 Vettu! You cut the trick!');

    // Wait for the vettu animation delay via fake timers
    await vi.advanceTimersByTimeAsync(1700);
    await eventPromise;

    // Center cards should be cleared after Vettu finishes
    expect(component.centerCards().length).toBe(0);

    vi.useRealTimers();
  });
});

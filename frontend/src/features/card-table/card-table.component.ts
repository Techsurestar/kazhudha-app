import { Component, signal, computed, viewChild, input, AfterViewInit, inject, DestroyRef } from '@angular/core';
import { GameStateService, Card, PlayedCard, GameViewDTO, GameEvent } from '../../core/services/game-state.service';
import { AdBannerComponent } from '../shared/ad-banner/ad-banner.component';
import { OpponentSeatComponent, RankChip } from './components/opponent-seat/opponent-seat.component';
import { HumanHandComponent, HandCard } from './components/human-hand/human-hand.component';
import { CenterTrickPileComponent, TrickCard } from './components/center-trick-pile/center-trick-pile.component';
import { ActionBarComponent } from './components/action-bar/action-bar.component';
import { CardFlightLayerComponent, FlightItem } from './components/card-flight-layer/card-flight-layer.component';

export interface PlayerSeatState {
  id: string;
  name: string;
  score: number;
  cardCount: number;
  isCurrentTurn: boolean;
  position: 'top' | 'left' | 'right' | 'bottom';
}

export interface PlayedCardItem {
  playerId: string;
  rank: string;
  suit: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
  position: 'top' | 'left' | 'right' | 'bottom';
}

@Component({
  selector: 'app-card-table',
  imports: [
    AdBannerComponent,
    OpponentSeatComponent,
    HumanHandComponent,
    CenterTrickPileComponent,
    ActionBarComponent,
    CardFlightLayerComponent
  ],
  templateUrl: './card-table.component.html',
  styleUrls: ['./card-table.component.css']
})
export class CardTableComponent implements AfterViewInit {
  private readonly gameStateService = inject(GameStateService);
  private readonly destroyRef = inject(DestroyRef);
  private isDestroyed = false;

  readonly flightLayer = viewChild(CardFlightLayerComponent);

  /** Whether to automatically start dealing cards on page load (defaults to true) */
  readonly autoDeal = input<boolean>(true);

  /** Height in pixels allocated for the top ad banner (between 50px and 60px) */
  readonly adSlotHeight = 54;

  /** Pause duration in ms after all players have played their card in a trick before clearing the pile */
  readonly TRICK_COMPLETION_PAUSE_MS = 1200;

  /** Session ID for the active game session */
  sessionId = 'default';

  /** Whether a 52-card deal animation is actively in progress */
  readonly isDealing = signal<boolean>(false);

  /** Whether event animations (bot plays, vettu flash, escapes) are actively running */
  readonly isReplaying = signal<boolean>(false);

  /** Remaining cards in the center deck stack during new game dealing */
  readonly remainingDeck = signal<number>(0);

  /** Active player turn ID ('human', 'bot1', 'bot2', 'bot3') */
  readonly currentTurnPlayerId = signal<string | null>(null);

  /** Card counts for all players tracked during visual animations */
  readonly visualCardCounts = signal<Record<string, number>>({
    human: 0,
    bot1: 0,
    bot2: 0,
    bot3: 0
  });

  /** Active cards currently played on the center trick pile */
  readonly centerCards = signal<PlayedCardItem[]>([]);

  /** Human player's hand cards */
  readonly humanCards = signal<HandCard[]>([]);

  /** Temporary toast alert message */
  readonly toastMessage = signal<string | null>(null);

  /** Temporary toast alert message for action bar text badge */
  readonly toastBadgeText = signal<string>('');

  /** Vettu strike alert notification message */
  readonly vettuAlertMessage = signal<string | null>(null);

  /** Text currently displayed in the action bar text badge */
  readonly actionBadgeText = computed<string>(() => {
    return this.vettuAlertMessage() || this.toastBadgeText();
  });

  /** Whether a vettu flash effect is actively animating on the center table */
  readonly isVettuFlashing = signal<boolean>(false);

  /** Order of players who have successfully escaped (shed all cards) */
  readonly escapedOrder = signal<string[]>([]);

  /** Whether the game over / round over modal is open */
  readonly showGameOverModal = signal<boolean>(false);

  /** Raw reactive game state signal from backend service */
  readonly gameState = computed(() => this.gameStateService.gameState());

  /** Leading suit for the active trick */
  readonly activeRoundSuit = computed(() => this.gameState()?.activeRoundSuit || null);

  private eventQueue: GameEvent[] = [];
  private lastProcessedState: GameViewDTO | null = null;

  /** Top player (Opponent: Leo - bot2) */
  readonly topPlayer = computed<PlayerSeatState>(() => ({
    id: 'bot2',
    name: 'Leo',
    score: this.getPlayerTotalScore('bot2'),
    cardCount: this.visualCardCounts()['bot2'] ?? 0,
    isCurrentTurn: this.currentTurnPlayerId() === 'bot2',
    position: 'top'
  }));

  /** Left player (Opponent: Jenny - bot1) */
  readonly leftPlayer = computed<PlayerSeatState>(() => ({
    id: 'bot1',
    name: 'Jenny',
    score: this.getPlayerTotalScore('bot1'),
    cardCount: this.visualCardCounts()['bot1'] ?? 0,
    isCurrentTurn: this.currentTurnPlayerId() === 'bot1',
    position: 'left'
  }));

  /** Right player (Opponent: Sofia - bot3) */
  readonly rightPlayer = computed<PlayerSeatState>(() => ({
    id: 'bot3',
    name: 'Sofia',
    score: this.getPlayerTotalScore('bot3'),
    cardCount: this.visualCardCounts()['bot3'] ?? 0,
    isCurrentTurn: this.currentTurnPlayerId() === 'bot3',
    position: 'right'
  }));

  /** Bottom player (Human: You) */
  readonly humanPlayer = computed<PlayerSeatState>(() => ({
    id: 'human',
    name: 'You',
    score: this.getPlayerTotalScore('human'),
    cardCount: this.humanCards().length,
    isCurrentTurn: this.currentTurnPlayerId() === 'human',
    position: 'bottom'
  }));

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;
    });
  }

  ngAfterViewInit(): void {
    if (this.autoDeal()) {
      setTimeout(() => {
        if (!this.isDestroyed) {
          this.startNewGameDeal();
        }
      }, 0);
    }
  }

  getPlayerName(id: string): string {
    switch (id) {
      case 'human': return 'You';
      case 'bot1': return 'Jenny';
      case 'bot2': return 'Leo';
      case 'bot3': return 'Sofia';
      default: return id;
    }
  }

  getPlayerPosition(id: string): 'top' | 'left' | 'right' | 'bottom' {
    switch (id) {
      case 'bot1': return 'left';
      case 'bot2': return 'top';
      case 'bot3': return 'right';
      case 'human': return 'bottom';
      default: return 'bottom';
    }
  }

  getPlayerTotalScore(playerId: string): number {
    const hands = this.gameState()?.hands || [];
    return hands.reduce((sum, h) => sum + (h.scores[playerId] || 0), 0);
  }

  getActivePlayersCount(): number {
    const escaped = this.escapedOrder().length;
    return Math.max(2, 4 - escaped);
  }

  getTrickWinner(cards: PlayedCardItem[]): { playerId: string; name: string } | null {
    if (cards.length === 0) return null;
    const leadSuit = cards[0].suit;
    const rankVals: Record<string, number> = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 11, 'Q': 12, 'K': 13, 'A': 14,
      'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5, 'SIX': 6, 'SEVEN': 7, 'EIGHT': 8,
      'NINE': 9, 'TEN': 10, 'JACK': 11, 'QUEEN': 12, 'KING': 13, 'ACE': 14
    };
    let highestVal = -1;
    let winnerId = cards[0].playerId;
    for (const c of cards) {
      if (c.suit === leadSuit) {
        const val = rankVals[c.rank] || 0;
        if (val > highestVal) {
          highestVal = val;
          winnerId = c.playerId;
        }
      }
    }
    return { playerId: winnerId, name: this.getPlayerName(winnerId) };
  }

  getRankChip(playerId: string): RankChip | null {
    const order = this.escapedOrder();
    const idx = order.indexOf(playerId);
    if (idx === 0) return { label: '1st', type: 'gold' };
    if (idx === 1) return { label: '2nd', type: 'silver' };
    if (idx === 2) return { label: '3rd', type: 'bronze' };
    return null;
  }

  getSuitSymbol(suit: string): string {
    switch (suit) {
      case 'SPADES': return '♠';
      case 'HEARTS': return '♥';
      case 'DIAMONDS': return '♦';
      case 'CLUBS': return '♣';
      default: return '♠';
    }
  }

  isRedSuit(suit: string): boolean {
    return suit === 'HEARTS' || suit === 'DIAMONDS';
  }

  sortCards(cards: HandCard[]): HandCard[] {
    const suitOrder: Record<string, number> = { 'SPADES': 0, 'HEARTS': 1, 'CLUBS': 2, 'DIAMONDS': 3 };
    const rankOrder: Record<string, number> = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 11, 'Q': 12, 'K': 13, 'A': 14,
      'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5, 'SIX': 6, 'SEVEN': 7, 'EIGHT': 8,
      'NINE': 9, 'TEN': 10, 'JACK': 11, 'QUEEN': 12, 'KING': 13, 'ACE': 14
    };
    return [...cards].sort((a, b) => {
      const sDiff = (suitOrder[a.suit] ?? 0) - (suitOrder[b.suit] ?? 0);
      if (sDiff !== 0) return sDiff;
      return (rankOrder[a.rank] ?? 0) - (rankOrder[b.rank] ?? 0);
    });
  }

  generateDeck(): Array<{ rank: string; suit: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS' }> {
    const suits: Array<'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS'> = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck: Array<{ rank: string; suit: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS' }> = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ rank, suit });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  isHintPlayMessage(message: string | null): boolean {
    return !!message && message.includes('Hint: Play');
  }

  showToast(message: string, durationMs: number = 2200): void {
    this.toastMessage.set(message);

    const isHint = this.isHintPlayMessage(message);
    if (!isHint) {
      this.toastBadgeText.set(message);
    }

    setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set(null);
      }
      if (!isHint && this.toastBadgeText() === message) {
        this.toastBadgeText.set('');
      }
    }, durationMs);
  }

  onNewGameClick(): void {
    this.startNewGameDeal(true);
  }

  onHintClick(): void {
    if (this.isDealing() || this.isReplaying()) return;

    if (this.currentTurnPlayerId() !== 'human') {
      this.showToast('Hints are available during your turn!');
      return;
    }

    const cards = this.humanCards();
    if (cards.length === 0) return;

    const leadSuit = this.activeRoundSuit();
    let playable = cards;
    if (this.centerCards().length > 0 && leadSuit) {
      const matching = cards.filter(c => c.suit === leadSuit);
      if (matching.length > 0) {
        playable = matching;
      }
    }

    // Recommend lowest card from playable pool
    const sorted = this.sortCards(playable);
    const recommended = sorted[0];
    const rankDisplay = recommended.rank.length > 2 ? recommended.rank.charAt(0) : recommended.rank;
    this.showToast(`💡 Hint: Play ${rankDisplay} of ${recommended.suit}`);
  }

  async startNewGameDeal(isFreshSession: boolean = false): Promise<void> {
    if (this.isDealing() || this.isDestroyed) return;

    this.isDealing.set(true);

    if (isFreshSession) {
      this.sessionId = 'session_' + Date.now();
    }

    // Reset table state for new deal
    this.centerCards.set([]);
    this.humanCards.set([]);
    this.eventQueue = [];
    this.isReplaying.set(false);
    this.toastMessage.set(null);
    this.toastBadgeText.set('');
    this.vettuAlertMessage.set(null);
    this.showGameOverModal.set(false);
    this.visualCardCounts.set({ bot1: 0, bot2: 0, bot3: 0, human: 0 });
    this.currentTurnPlayerId.set(null);

    // Call backend service to start/deal new game
    let initialState: GameViewDTO;
    try {
      initialState = await new Promise<GameViewDTO>((resolve, reject) => {
        this.gameStateService.startGame(this.sessionId).subscribe({
          next: state => resolve(state),
          error: err => reject(err)
        });
      });
    } catch (err) {
      console.error('Failed to start game via backend:', err);
      this.isDealing.set(false);
      return;
    }

    if (this.isDestroyed) return;

    // Reset escape sequence if new tournament or empty escape state
    if (!initialState.gameOver) {
      this.escapedOrder.set([]);
    }

    // Stack full 52-card deck in center
    this.remainingDeck.set(52);

    const initialHumanHand = [...initialState.humanHand];
    const targets: Array<'left' | 'top' | 'right' | 'bottom'> = ['left', 'top', 'right', 'bottom'];

    // Distribute cards round-robin from center deck (pitching 52 cards)
    let humanCardIndex = 0;
    for (let i = 0; i < 52; i++) {
      if (this.isDestroyed) return;

      const target = targets[i % 4];
      const isHumanTarget = target === 'bottom';
      const card = isHumanTarget ? initialHumanHand[humanCardIndex++] : undefined;

      this.flightLayer()?.triggerFlight({
        id: `deal-${i}-${Date.now()}`,
        rank: card?.rank,
        suit: card?.suit,
        from: 'bottom',
        to: target,
        mode: 'deal',
        isFaceDown: true,
        durationMs: 200
      });

      this.remainingDeck.update(c => Math.max(0, c - 1));
      await new Promise(resolve => setTimeout(resolve, 45));
    }

    // Wait for final card to land
    await new Promise(resolve => setTimeout(resolve, 220));
    if (this.isDestroyed) return;

    // Hand populated from backend state & sorted cleanly
    this.humanCards.set(this.sortCards(initialHumanHand as HandCard[]));

    // Initialize player hand counts
    this.visualCardCounts.set({
      bot1: 13,
      bot2: 13,
      bot3: 13,
      human: initialHumanHand.length
    });

    this.isDealing.set(false);

    // Process initial turn and any bot plays if bot started with Ace of Spades
    this.processNewState(initialState);
  }

  async onCardPlayed(card: HandCard): Promise<void> {
    if (this.isDealing() || this.isReplaying() || this.isDestroyed) return;

    if (this.currentTurnPlayerId() !== 'human') {
      this.showToast('It is not your turn!');
      return;
    }

    // Check suit following rule
    const activeSuit = this.activeRoundSuit();
    if (this.centerCards().length > 0 && activeSuit && card.suit !== activeSuit) {
      const hasActiveSuit = this.humanCards().some(c => c.suit === activeSuit);
      if (hasActiveSuit) {
        this.showToast(`Must follow active suit (${activeSuit})!`);
        return;
      }
    }

    this.isReplaying.set(true);

    // Remove played card from human visual hand immediately
    this.humanCards.update(cards => cards.filter(c => !(c.rank === card.rank && c.suit === card.suit)));
    this.visualCardCounts.update(counts => ({
      ...counts,
      human: Math.max(0, (counts['human'] || 0) - 1)
    }));

    // Trigger flight animation from bottom to table center and await its landing (linear slow motion)
    await this.flightLayer()?.triggerFlight({
      id: 'play-human-' + Date.now(),
      rank: card.rank,
      suit: card.suit,
      from: 'bottom',
      durationMs: 800
    });

    if (this.isDestroyed) return;

    // Place the card in the center trick pile upon landing
    const currentPile = this.centerCards();
    const alreadyPlayed = currentPile.some(c => c.playerId === 'human');
    const nextPile = alreadyPlayed ? [] : [...currentPile];
    nextPile.push({
      playerId: 'human',
      rank: card.rank,
      suit: card.suit as any,
      position: 'bottom'
    });
    this.centerCards.set(nextPile);

    // If this play is a Vettu strike, let the Vettu event handler process the penalty and pile clearing
    const isVettuPlay = currentPile.length > 0 && activeSuit && card.suit !== activeSuit;

    // If all active players have played a card in this trick, pause before clearing
    if (!isVettuPlay && nextPile.length >= this.getActivePlayersCount()) {
      const winner = this.getTrickWinner(nextPile);
      if (winner) {
        this.showToast(`👑 ${winner.name} won the trick!`, 1200);
      }
      await new Promise(r => setTimeout(r, this.TRICK_COMPLETION_PAUSE_MS));
      if (this.isDestroyed) return;
      this.centerCards.set([]);
      await new Promise(r => setTimeout(r, 200));
    }

    // Call backend engine to process card play
    const engineCard: Card = { rank: card.rank as any, suit: card.suit as any };
    this.gameStateService.playCard('human', engineCard, this.sessionId).subscribe({
      next: (newState: GameViewDTO) => {
        // Human card is already landed; filter out initial human play event from replay queue
        const remainingEvents = [...newState.events];
        if (remainingEvents.length > 0 && remainingEvents[0].eventType === 'PLAY' && remainingEvents[0].playerId === 'human') {
          remainingEvents.shift();
        }
        this.lastProcessedState = newState;
        this.eventQueue = remainingEvents;
        this.runNextEvent(newState);
      },
      error: (err: any) => {
        console.error('Error playing card:', err);
        this.isReplaying.set(false);
        this.showToast(err?.message || 'Invalid card play!');
        // Restore hand from current backend state
        const current = this.gameState();
        if (current) {
          this.humanCards.set(this.sortCards(current.humanHand as HandCard[]));
        }
      }
    });
  }

  onFlightComplete(result: { flightId: string; item: FlightItem }): void {
    // Handling dealt card landing into a player's hand during deal mode
    if (result.item.mode === 'deal') {
      const target = result.item.to || 'bottom';
      switch (target) {
        case 'left':
          this.visualCardCounts.update(c => ({ ...c, bot1: (c['bot1'] || 0) + 1 }));
          break;
        case 'top':
          this.visualCardCounts.update(c => ({ ...c, bot2: (c['bot2'] || 0) + 1 }));
          break;
        case 'right':
          this.visualCardCounts.update(c => ({ ...c, bot3: (c['bot3'] || 0) + 1 }));
          break;
        case 'bottom':
          if (result.item.rank && result.item.suit) {
            this.humanCards.update(cards => [
              ...cards,
              { rank: result.item.rank!, suit: result.item.suit as any }
            ]);
          }
          this.visualCardCounts.update(c => ({ ...c, human: (c['human'] || 0) + 1 }));
          break;
      }
      return;
    }
  }

  private processNewState(state: GameViewDTO): void {
    if (this.lastProcessedState === state) return;
    this.lastProcessedState = state;

    // Queue up events from backend
    this.eventQueue = [...state.events];

    if (!this.isReplaying()) {
      this.runNextEvent(state);
    }
  }

  private async runNextEvent(finalState: GameViewDTO): Promise<void> {
    if (this.isDestroyed) return;

    if (this.eventQueue.length === 0) {
      this.isReplaying.set(false);

      // Synchronize visual state with final state
      this.currentTurnPlayerId.set(finalState.currentTurnPlayerId);
      this.humanCards.set(this.sortCards(finalState.humanHand as HandCard[]));

      const finalCounts: Record<string, number> = {
        human: finalState.humanHand.length,
        bot1: finalState.otherPlayers.find(p => p.id === 'bot1')?.handSize ?? 0,
        bot2: finalState.otherPlayers.find(p => p.id === 'bot2')?.handSize ?? 0,
        bot3: finalState.otherPlayers.find(p => p.id === 'bot3')?.handSize ?? 0
      };
      this.visualCardCounts.set(finalCounts);

      // Sync trick pile: if table pile is empty, clear it
      if (finalState.tablePile.length === 0) {
        if (this.centerCards().length >= this.getActivePlayersCount()) {
          const winner = this.getTrickWinner(this.centerCards());
          if (winner) {
            this.showToast(`👑 ${winner.name}  trick!`, 1200);
          }
          await new Promise(r => setTimeout(r, this.TRICK_COMPLETION_PAUSE_MS));
          if (this.isDestroyed) return;
        }
        this.centerCards.set([]);
      } else {
        this.centerCards.set(
          finalState.tablePile.map(pc => ({
            playerId: pc.playerId,
            rank: pc.card.rank,
            suit: pc.card.suit,
            position: this.getPlayerPosition(pc.playerId)
          }))
        );
      }

      // Check for escaped players
      for (const bot of finalState.otherPlayers) {
        if (bot.hasGottenAway && !this.escapedOrder().includes(bot.id)) {
          this.escapedOrder.update(order => [...order, bot.id]);
        }
      }
      if (finalState.humanHand.length === 0 && finalState.kazhudhaPlayerId !== 'human' && !this.escapedOrder().includes('human')) {
        this.escapedOrder.update(order => [...order, 'human']);
      }

      // Show Game Over modal if round or tournament is complete
      if (finalState.gameOver) {
        this.showGameOverModal.set(true);
      }
      return;
    }

    this.isReplaying.set(true);
    const event = this.eventQueue.shift()!;

    if (event.eventType === 'PLAY' && event.card) {
      this.currentTurnPlayerId.set(event.playerId);

      if (event.playerId === 'human') {
        // Human card flight was already executed upon user click; ensure pile reflects it
        const currentPile = this.centerCards();
        const alreadyInPile = currentPile.some(c => c.playerId === 'human');
        if (!alreadyInPile) {
          const nextPile: PlayedCardItem[] = [
            ...currentPile,
            {
              playerId: 'human',
              rank: event.card.rank,
              suit: event.card.suit,
              position: 'bottom'
            }
          ];
          this.centerCards.set(nextPile);

          if (nextPile.length >= this.getActivePlayersCount()) {
            const winner = this.getTrickWinner(nextPile);
            if (winner) {
              this.showToast(`👑 ${winner.name} won the trick!`, 1200);
            }
            await new Promise(r => setTimeout(r, this.TRICK_COMPLETION_PAUSE_MS));
            if (this.isDestroyed) return;
            this.centerCards.set([]);
            await new Promise(r => setTimeout(r, 200));
          }
        }

        await new Promise(r => setTimeout(r, 150));
        this.runNextEvent(finalState);
      } else {
        // Bot turn!
        // 1. Thinking delay so player can track the game flow
        await new Promise(r => setTimeout(r, 550));
        if (this.isDestroyed) return;

        // 2. Launch flight animation from bot seat to table center (linear slow motion)
        const position = this.getPlayerPosition(event.playerId);
        await this.flightLayer()?.triggerFlight({
          id: `bot-play-${Date.now()}`,
          rank: event.card.rank,
          suit: event.card.suit,
          from: position,
          durationMs: 600
        });

        // 3. Add to center trick pile
        const currentPile = this.centerCards();
        const alreadyPlayed = currentPile.some(c => c.playerId === event.playerId);
        const nextPile = alreadyPlayed ? [] : [...currentPile];
        nextPile.push({
          playerId: event.playerId,
          rank: event.card.rank,
          suit: event.card.suit,
          position
        });
        this.centerCards.set(nextPile);

        // 4. Decrement bot's visual card count
        this.visualCardCounts.update(counts => ({
          ...counts,
          [event.playerId]: Math.max(0, (counts[event.playerId] || 0) - 1)
        }));

        // If trick completed by this bot play, pause before clearing
        if (nextPile.length >= this.getActivePlayersCount()) {
          const winner = this.getTrickWinner(nextPile);
          if (winner) {
            this.showToast(`👑 ${winner.name} won the trick!`, 1200);
          }
          await new Promise(r => setTimeout(r, this.TRICK_COMPLETION_PAUSE_MS));
          if (this.isDestroyed) return;
          this.centerCards.set([]);
          await new Promise(r => setTimeout(r, 200));
        } else {
          await new Promise(r => setTimeout(r, 250));
        }
        this.runNextEvent(finalState);
      }

    } else if (event.eventType === 'VETTU' && event.card) {
      this.currentTurnPlayerId.set(event.playerId);

      const isHumanVettu = event.playerId === 'human';

      if (!isHumanVettu) {
        await new Promise(r => setTimeout(r, 550));
        if (this.isDestroyed) return;

        // Fly the cutting card to the center trick pile (linear slow motion)
        const position = this.getPlayerPosition(event.playerId);
        await this.flightLayer()?.triggerFlight({
          id: `vettu-play-${Date.now()}`,
          rank: event.card.rank,
          suit: event.card.suit,
          from: position,
          durationMs: 800
        });

        const currentPile = this.centerCards();
        const nextPile: PlayedCardItem[] = [...currentPile, {
          playerId: event.playerId,
          rank: event.card.rank,
          suit: event.card.suit,
          position
        }];
        this.centerCards.set(nextPile);

        // Decrement cutter's count
        this.visualCardCounts.update(counts => ({
          ...counts,
          [event.playerId]: Math.max(0, (counts[event.playerId] || 0) - 1)
        }));
      } else {
        // Human Vettu: flight animation, hand decrement, and card placement were ALREADY executed on user click!
        // Ensure pile contains the human card without duplicating
        const currentPile = this.centerCards();
        const alreadyInPile = currentPile.some(c => c.playerId === 'human');
        if (!alreadyInPile) {
          const nextPile: PlayedCardItem[] = [...currentPile, {
            playerId: 'human',
            rank: event.card.rank,
            suit: event.card.suit,
            position: 'bottom'
          }];
          this.centerCards.set(nextPile);
        }
      }

      // Calculate penalized player (highest card of lead round suit)
      const currentPile = this.centerCards();
      const leadSuit = currentPile[0]?.suit;
      let penalizedPlayerId: string | null = null;
      if (leadSuit) {
        let maxRankVal = -1;
        const rankVals: Record<string, number> = {
          '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
          'J': 11, 'Q': 12, 'K': 13, 'A': 14,
          'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5, 'SIX': 6, 'SEVEN': 7, 'EIGHT': 8,
          'NINE': 9, 'TEN': 10, 'JACK': 11, 'QUEEN': 12, 'KING': 13, 'ACE': 14
        };
        for (const pc of currentPile) {
          if (pc.suit === leadSuit) {
            const val = rankVals[pc.rank] || 0;
            if (val > maxRankVal) {
              maxRankVal = val;
              penalizedPlayerId = pc.playerId;
            }
          }
        }
      }

      if (penalizedPlayerId) {
        const pileSize = currentPile.length;
        this.visualCardCounts.update(counts => ({
          ...counts,
          [penalizedPlayerId!]: (counts[penalizedPlayerId!] || 0) + pileSize
        }));
        // Remove from escaped if penalized
        this.escapedOrder.update(order => order.filter(id => id !== penalizedPlayerId));
      }

      // Trigger Vettu flash and message banner
      this.isVettuFlashing.set(true);
      const cutterName = this.getPlayerName(event.playerId);
      this.vettuAlertMessage.set(`💥 Vettu! ${cutterName} cut the trick!`);

      await new Promise(r => setTimeout(r, 1600));
      if (this.isDestroyed) return;

      this.centerCards.set([]);
      this.isVettuFlashing.set(false);
      this.vettuAlertMessage.set(null);

      this.runNextEvent(finalState);

    } else if (event.eventType === 'ESCAPE') {
      this.visualCardCounts.update(counts => ({
        ...counts,
        [event.playerId]: 0
      }));

      if (!this.escapedOrder().includes(event.playerId)) {
        this.escapedOrder.update(order => [...order, event.playerId]);
      }
      this.showToast(`🎉 ${this.getPlayerName(event.playerId)} escaped!`);

      await new Promise(r => setTimeout(r, 400));
      this.runNextEvent(finalState);

    } else {
      this.runNextEvent(finalState);
    }
  }
}

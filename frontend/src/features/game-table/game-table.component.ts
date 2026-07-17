import { Component, signal, computed, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService, Card, PlayedCard, GameViewDTO, GameEvent } from '../../core/services/game-state.service';
import { PlayerProfileComponent } from './components/player-profile/player-profile.component';
import { FeltTableComponent } from './components/felt-table/felt-table.component';
import { HumanHandComponent } from './components/human-hand/human-hand.component';
import { GameOverModalComponent } from './components/game-over-modal/game-over-modal.component';

const SUIT_ORDER: Record<'SPADES' | 'HEARTS' | 'CLUBS' | 'DIAMONDS', number> = {
  'SPADES': 0,
  'HEARTS': 1,
  'CLUBS': 2,
  'DIAMONDS': 3
};

const RANK_ORDER: Record<string, number> = {
  'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5, 'SIX': 6, 'SEVEN': 7, 'EIGHT': 8, 'NINE': 9, 'TEN': 10,
  'JACK': 11, 'QUEEN': 12, 'KING': 13, 'ACE': 14
};

@Component({
  selector: 'app-game-table',
  standalone: true,
  imports: [
    CommonModule,
    PlayerProfileComponent,
    FeltTableComponent,
    HumanHandComponent,
    GameOverModalComponent
  ],
  templateUrl: './game-table.component.html'
})
export class GameTableComponent implements OnInit {
  protected readonly Math = Math;

  // Local signals for tracking visual animations and overlays
  visualTablePile = signal<PlayedCard[]>([]);
  visualCardCounts = signal<Record<string, number>>({});
  visualCurrentTurnPlayerId = signal<string | null>(null);
  vettuAlertMessage = signal<string | null>(null);
  isVettuFlashing = signal<boolean>(false);
  showGameOverModal = signal<boolean>(false);
  escapedOrder = signal<string[]>([]);
  
  private lastProcessedState: GameViewDTO | null = null;
  private eventQueue: GameEvent[] = [];
  protected isReplaying = false;

  // Computed signals bound directly to the service's raw gameState DTO
  gameState = computed(() => this.gameStateService.gameState());
  
  activeRoundSuit = computed(() => this.gameState()?.activeRoundSuit || null);

  humanHand = computed(() => this.gameState()?.humanHand || []);

  sortedHumanHand = computed(() => {
    return [...this.humanHand()].sort((a, b) => {
      const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
      if (suitDiff !== 0) {
        return suitDiff;
      }
      return (RANK_ORDER[a.rank] || 0) - (RANK_ORDER[b.rank] || 0);
    });
  });

  kazhudhaPlayer = computed(() => {
    const id = this.gameState()?.kazhudhaPlayerId;
    if (!id) return null;
    return this.getPlayerById(id);
  });

  allPlayersMap = computed(() => {
    return {
      'human': this.getPlayerById('human'),
      'bot1': this.getPlayerById('bot1'),
      'bot2': this.getPlayerById('bot2'),
      'bot3': this.getPlayerById('bot3')
    };
  });

  constructor(private gameStateService: GameStateService) {
    // Process new game states reactively
    effect(() => {
      const state = this.gameState();
      if (state) {
        this.processNewState(state);
      }
    });
  }

  ngOnInit() {
    // Start session on init
    this.gameStateService.startGame('default');
  }

  /**
   * Action handler when a human clicks on a card in their hand
   * @param card Selected Card
   */
  playCard(card: Card) {
    if (this.isReplaying) {
      return; // Prevent interactions during event animations
    }
    const state = this.gameState();
    if (!state) return;
    if (state.currentTurnPlayerId !== 'human') {
      alert("It is not your turn!");
      return;
    }
    this.gameStateService.playCard('human', card, 'default');
  }

  /**
   * Restarts the game session
   */
  restartGame() {
    this.gameStateService.startGame('default');
  }

  /**
   * Helper to extract player hand size map from GameViewDTO
   */
  private getHandSizes(state: GameViewDTO): Record<string, number> {
    const counts: Record<string, number> = {};
    counts['human'] = state.humanHand.length;
    for (const bot of state.otherPlayers) {
      counts[bot.id] = bot.handSize;
    }
    return counts;
  }

  /**
   * Replays actions and handles Vettu animations before updating local visual states
   * @param state New GameViewDTO from server
   */
  private processNewState(state: GameViewDTO) {
    if (this.lastProcessedState === state) {
      return;
    }

    // Set dynamic initial counts and turn for playback based on previous state
    const initialCounts = this.lastProcessedState 
      ? this.getHandSizes(this.lastProcessedState)
      : this.getHandSizes(state);

    const initialTurn = this.lastProcessedState
      ? this.lastProcessedState.currentTurnPlayerId
      : state.currentTurnPlayerId;

    this.visualCardCounts.set(initialCounts);
    this.visualCurrentTurnPlayerId.set(initialTurn);
    
    // Reset escape sequence only if starting a fresh round (no one has gotten away)
    const isRestart = !state.gameOver && state.otherPlayers.every(p => !p.hasGottenAway) && state.humanHand.length > 0;
    if (isRestart) {
      this.escapedOrder.set([]);
    }

    this.lastProcessedState = state;

    // Reset game over modal visibility if starting a new game
    if (!state.gameOver) {
      this.showGameOverModal.set(false);
    }

    // Queue up the new events to replay sequentially
    this.eventQueue = [...state.events];

    if (!this.isReplaying) {
      this.runNextEvent(state);
    }
  }

  /**
   * Runs the next event in the queue, rendering played cards or Vettu animations in sequence
   * @param finalState The destination state to target once replay finishes
   */
  private runNextEvent(finalState: GameViewDTO) {
    if (this.eventQueue.length === 0) {
      this.isReplaying = false;
      
      // Fallback/Final sync: ensure the visual table pile exactly matches the server's final state
      this.visualTablePile.set(finalState.tablePile);
      this.vettuAlertMessage.set(null);
      this.isVettuFlashing.set(false);
      this.visualCardCounts.set(this.getHandSizes(finalState));
      this.visualCurrentTurnPlayerId.set(finalState.currentTurnPlayerId);

      // Re-evaluate escaped order based on final state in case any escaped players are not recorded
      const finalEscaped: string[] = [];
      for (const bot of finalState.otherPlayers) {
        if (bot.hasGottenAway) {
          finalEscaped.push(bot.id);
        }
      }
      if (finalState.humanHand.length === 0 && finalState.kazhudhaPlayerId !== 'human') {
        finalEscaped.push('human');
      }

      const currentOrder = [...this.escapedOrder()];
      for (const id of finalEscaped) {
        if (!currentOrder.includes(id)) {
          currentOrder.push(id);
        }
      }
      
      // Filter out any players who are NOT escaped in the final state (e.g. they inherited cards)
      const validEscaped = currentOrder.filter(id => {
        if (id === 'human') {
          return finalState.humanHand.length === 0;
        }
        return finalState.otherPlayers.find(p => p.id === id)?.hasGottenAway || false;
      });
      this.escapedOrder.set(validEscaped);

      // Trigger Game Over modal only after the final card play / Vettu animation finishes
      if (finalState.gameOver) {
        this.showGameOverModal.set(true);
      }
      return;
    }

    this.isReplaying = true;
    const event = this.eventQueue.shift()!;

    if (event.eventType === 'PLAY' && event.card) {
      // 1. Highlight the active player immediately
      this.visualCurrentTurnPlayerId.set(event.playerId);

      // Instantly throw card for human, wait 1.5s thinking time for bots
      const thinkDelay = event.playerId === 'human' ? 0 : 1500;

      // 2. Wait thinkDelay before sliding the card
      setTimeout(() => {
        const currentPile = this.visualTablePile();
        
        // If the player playing has already contributed a card to the current visual pile,
        // it implies a new round has started, so we clear the old round's pile.
        const alreadyPlayed = currentPile.some(c => c.playerId === event.playerId);
        const nextPile = alreadyPlayed ? [] : [...currentPile];

        nextPile.push({ playerId: event.playerId, card: event.card! });
        this.visualTablePile.set(nextPile);

        // Decrement cards count for player
        const counts = { ...this.visualCardCounts() };
        if (counts[event.playerId] > 0) {
          counts[event.playerId]--;
        }
        this.visualCardCounts.set(counts);

        // 3. Wait 500ms (card flight animation time) before moving to the next player's turn
        setTimeout(() => {
          this.runNextEvent(finalState);
        }, 500);

      }, thinkDelay);

    } else if (event.eventType === 'VETTU' && event.card) {
      // 1. Highlight the cutting active player immediately
      this.visualCurrentTurnPlayerId.set(event.playerId);

      // Instantly throw card for human, wait 1.5s thinking time for bots
      const thinkDelay = event.playerId === 'human' ? 0 : 1500;

      // 2. Wait thinkDelay before sliding the Vettu card
      setTimeout(() => {
        const currentPile = this.visualTablePile();
        const nextPile = [...currentPile, { playerId: event.playerId, card: event.card! }];
        
        // Show the Vettu cutting card on the table pile
        this.visualTablePile.set(nextPile);

        // Decrement cutting player's cards
        const counts = { ...this.visualCardCounts() };
        if (counts[event.playerId] > 0) {
          counts[event.playerId]--;
        }

        // Calculate which player gets penalized (played highest card matching lead round suit)
        const firstCard = currentPile[0]?.card;
        let penalizedPlayerId: string | null = null;
        if (firstCard) {
          const leadSuit = firstCard.suit;
          let maxRankValue = -1;
          for (const pc of currentPile) {
            if (pc.card.suit === leadSuit) {
              const rankVal = RANK_ORDER[pc.card.rank] || 0;
              if (rankVal > maxRankValue) {
                maxRankValue = rankVal;
                penalizedPlayerId = pc.playerId;
              }
            }
          }
          if (penalizedPlayerId) {
            // Penalized player absorbs all cards currently played on the table
            counts[penalizedPlayerId] += nextPile.length;

            // Remove penalized player from escapedOrder since they are back in the game!
            const currentOrder = this.escapedOrder();
            if (currentOrder.includes(penalizedPlayerId)) {
              this.escapedOrder.set(currentOrder.filter(id => id !== penalizedPlayerId));
            }
          }
        }
        this.visualCardCounts.set(counts);

        // 3. Wait 500ms (card flight animation time) before initiating the Vettu flash/banner
        setTimeout(() => {
          if (penalizedPlayerId) {
            // Highlight the penalized player who now inherits the lead turn for the next round
            this.visualCurrentTurnPlayerId.set(penalizedPlayerId);
          }
          
          // Trigger the warning glow and alert message banner
          this.vettuAlertMessage.set(event.description);
          this.isVettuFlashing.set(true);

          // 4. Wait 2 seconds of warning flash before clearing pile and advancing to next event
          setTimeout(() => {
            this.visualTablePile.set([]);
            this.vettuAlertMessage.set(null);
            this.isVettuFlashing.set(false);
            this.runNextEvent(finalState);
          }, 2000);

        }, 500);

      }, thinkDelay);

    } else if (event.eventType === 'ESCAPE') {
      // Escaping player sets card count to 0
      const counts = { ...this.visualCardCounts() };
      counts[event.playerId] = 0;
      this.visualCardCounts.set(counts);

      // Track the escape order sequence dynamically
      const currentOrder = this.escapedOrder();
      if (!currentOrder.includes(event.playerId)) {
        this.escapedOrder.set([...currentOrder, event.playerId]);
      }

      this.runNextEvent(finalState);

    } else {
      // Handle other events by skipping
      this.runNextEvent(finalState);
    }
  }

  /**
   * Helper to retrieve chip level (gold, silver, bronze) for escaped players
   */
  getPlayerChip(playerId: string): { type: 'gold' | 'silver' | 'bronze', value: number, label: string } | null {
    const idx = this.escapedOrder().indexOf(playerId);
    if (idx === 0) {
      return { type: 'gold', value: 20, label: '20' };
    } else if (idx === 1) {
      return { type: 'silver', value: 15, label: '15' };
    } else if (idx === 2) {
      return { type: 'bronze', value: 10, label: '10' };
    }
    return null;
  }

  /**
   * Maps player IDs to mock avatar properties and counts from DTO
   */
  getPlayerById(id: string): any {
    const state = this.gameState();
    if (!state) return null;

    const visualCounts = this.visualCardCounts();
    const count = (visualCounts && visualCounts[id] !== undefined)
      ? visualCounts[id]
      : (id === 'human' ? state.humanHand.length : (state.otherPlayers.find(p => p.id === id)?.handSize || 0));

    const turnId = this.visualCurrentTurnPlayerId() || state.currentTurnPlayerId;
    const isTurn = turnId === id;

    if (id === 'human') {
      return {
        id: 'human',
        name: 'Player 1 (You)',
        avatar: 'P1',
        cardCount: count,
        isBot: false,
        isCurrentTurn: isTurn
      };
    }

    const bot = state.otherPlayers.find(p => p.id === id);
    if (!bot) return null;

    return {
      id: bot.id,
      name: bot.name,
      avatar: id === 'bot1' ? 'B1' : id === 'bot2' ? 'B2' : 'B3',
      cardCount: count,
      isBot: true,
      isCurrentTurn: isTurn,
      hasGottenAway: bot.hasGottenAway
    };
  }

  /**
   * Fetches played card from visual pile representation
   */
  getPlayedCardByPlayer(playerId: string): PlayedCard | undefined {
    return this.visualTablePile().find(pc => pc.playerId === playerId);
  }

  /**
   * Transforms raw rank strings (e.g. 'FOUR') to clean symbols ('4')
   */
  getCardRankDisplay(rank: string): string {
    const symbols: Record<string, string> = {
      'TWO': '2', 'THREE': '3', 'FOUR': '4', 'FIVE': '5', 'SIX': '6', 'SEVEN': '7', 'EIGHT': '8', 'NINE': '9', 'TEN': '10',
      'JACK': 'J', 'QUEEN': 'Q', 'KING': 'K', 'ACE': 'A'
    };
    return symbols[rank] || rank;
  }
}

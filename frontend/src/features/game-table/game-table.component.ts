import { Component, signal, computed, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService, Card, PlayedCard, GameViewDTO, GameEvent } from '../../core/services/game-state.service';

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
  imports: [CommonModule],
  templateUrl: './game-table.component.html'
})
export class GameTableComponent implements OnInit {
  protected readonly Math = Math;

  // Local signals for tracking visual animations and overlays
  visualTablePile = signal<PlayedCard[]>([]);
  vettuAlertMessage = signal<string | null>(null);
  isVettuFlashing = signal<boolean>(false);
  
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
   * Replays actions and handles Vettu animations before updating local visual states
   * @param state New GameViewDTO from server
   */
  private processNewState(state: GameViewDTO) {
    if (this.lastProcessedState === state) {
      return;
    }
    this.lastProcessedState = state;

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
      return;
    }

    this.isReplaying = true;
    const event = this.eventQueue.shift()!;

    if (event.eventType === 'PLAY' && event.card) {
      const currentPile = this.visualTablePile();
      
      // If the player playing has already contributed a card to the current visual pile,
      // it implies a new round has started, so we clear the old round's pile.
      const alreadyPlayed = currentPile.some(c => c.playerId === event.playerId);
      const nextPile = alreadyPlayed ? [] : [...currentPile];

      nextPile.push({ playerId: event.playerId, card: event.card });
      this.visualTablePile.set(nextPile);

      setTimeout(() => {
        this.runNextEvent(finalState);
      }, 600); // 600ms per normal card play animation

    } else if (event.eventType === 'VETTU' && event.card) {
      const currentPile = this.visualTablePile();
      
      // Show the Vettu cutting card on the table pile
      this.visualTablePile.set([...currentPile, { playerId: event.playerId, card: event.card }]);

      // Trigger the warning glow and alert message banner
      this.vettuAlertMessage.set(event.description);
      this.isVettuFlashing.set(true);

      // Abruptly clear table pile after 2 seconds to simulate penalized player picking it up
      setTimeout(() => {
        this.visualTablePile.set([]);
        this.vettuAlertMessage.set(null);
        this.isVettuFlashing.set(false);
        this.runNextEvent(finalState);
      }, 2000);

    } else {
      // Handle other events like ESCAPE by skipping or running immediately
      this.runNextEvent(finalState);
    }
  }

  /**
   * Maps player IDs to mock avatar properties and counts from DTO
   */
  getPlayerById(id: string): any {
    const state = this.gameState();
    if (!state) return null;

    if (id === 'human') {
      return {
        id: 'human',
        name: 'Player 1 (You)',
        avatar: 'P1',
        cardCount: state.humanHand.length,
        isBot: false,
        isCurrentTurn: state.currentTurnPlayerId === 'human'
      };
    }

    const bot = state.otherPlayers.find(p => p.id === id);
    if (!bot) return null;

    return {
      id: bot.id,
      name: bot.name,
      avatar: id === 'bot1' ? 'B1' : id === 'bot2' ? 'B2' : 'B3',
      cardCount: bot.handSize,
      isBot: true,
      isCurrentTurn: state.currentTurnPlayerId === bot.id,
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

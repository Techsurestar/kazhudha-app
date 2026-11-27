import { Component, input, output, computed, signal, effect, untracked, OnDestroy } from '@angular/core';
import { CardComponent } from '../../../shared/card/card.component';

export interface HandCard {
  rank: string;
  suit: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS' | string;
}

export interface HumanPlayerState {
  id?: string;
  name: string;
  score: number;
  cardCount?: number;
  isCurrentTurn?: boolean;
}

@Component({
  selector: 'app-human-hand',
  imports: [CardComponent],
  templateUrl: './human-hand.component.html',
  styleUrls: ['./human-hand.component.css']
})
export class HumanHandComponent implements OnDestroy {
  /** Hand cards available to the human player */
  readonly cards = input<HandCard[]>([]);

  /** Player profile information */
  readonly player = input<HumanPlayerState>();

  /** Overrides or direct inputs */
  readonly name = input<string>('You');
  readonly score = input<number>(0);
  readonly cardCount = input<number>(0);
  readonly isCurrentTurn = input<boolean>(true);
  readonly disabled = input<boolean>(false);

  /** Whether the Skip Game button can be displayed when hand is empty */
  readonly canSkip = input<boolean>(true);

  /** Duration of the turn countdown in seconds (default 60 seconds) */
  readonly timerDuration = input<number>(60);

  /** Dev flag to set the turn countdown timer off (dev purpose) */
  readonly isDev = input<boolean>(false);

  /** Emitted when the user taps/clicks a playable card */
  readonly cardPlay = output<HandCard>();

  /** Emitted when the user taps/clicks the Skip Game button when hand is empty */
  readonly skipGame = output<void>();

  /** Emitted when the turn countdown timer expires (reaches 0) */
  readonly timeUp = output<void>();

  /** Remaining seconds on the turn timer, or null if timer is inactive */
  readonly remainingSeconds = signal<number | null>(null);

  /**
   * Color class for the turn timer badge:
   * - Remaining > 10s: 'timer-normal'
   * - Remaining <= 10s and >= 5s: 'timer-orange' (when time goes beyond 10s)
   * - Remaining < 5s: 'timer-red' (when time goes below 5 seconds)
   */
  readonly timerColorClass = computed(() => {
    const sec = this.remainingSeconds();
    if (sec === null) return '';
    if (sec < 15) return 'timer-red';
    if (sec <= 30) return 'timer-orange';
    return 'timer-normal';
  });

  readonly effectiveName = computed(() => this.player()?.name ?? this.name());
  readonly effectiveScore = computed(() => this.player()?.score ?? this.score());
  readonly effectiveCardCount = computed(() => {
    if (this.player()?.cardCount !== undefined) {
      return this.player()!.cardCount!;
    }
    const cLen = this.cards().length;
    if (cLen > 0) {
      return cLen;
    }
    return this.cardCount();
  });
  readonly effectiveIsTurn = computed(() => this.player()?.isCurrentTurn ?? this.isCurrentTurn());

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const isTurn = this.effectiveIsTurn();
      const isDisabled = this.disabled();
      const isDev = this.isDev();
      const isActive = isTurn && !isDisabled && !isDev;

      untracked(() => {
        if (isActive) {
          if (this.timerInterval === null) {
            this.startTimer();
          }
        } else {
          this.stopTimer();
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  startTimer(): void {
    if (this.isDev()) {
      this.clearTimerInterval();
      this.remainingSeconds.set(null);
      return;
    }
    this.clearTimerInterval();
    this.remainingSeconds.set(this.timerDuration());
    this.timerInterval = setInterval(() => {
      const current = this.remainingSeconds();
      if (current === null || current <= 1) {
        this.remainingSeconds.set(0);
        this.clearTimerInterval();
        this.timeUp.emit();
      } else {
        this.remainingSeconds.set(current - 1);
      }
    }, 1000);
  }

  private clearTimerInterval(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  stopTimer(): void {
    this.clearTimerInterval();
    this.remainingSeconds.set(null);
  }

  getSuitSymbol(suit: string): string {
    switch (suit?.toUpperCase()) {
      case 'SPADES': return '♠';
      case 'HEARTS': return '♥';
      case 'DIAMONDS': return '♦';
      case 'CLUBS': return '♣';
      default: return '♠';
    }
  }

  isRedSuit(suit: string): boolean {
    const s = suit?.toUpperCase();
    return s === 'HEARTS' || s === 'DIAMONDS';
  }

  getRankDisplay(rank: string): string {
    const symbols: Record<string, string> = {
      'TWO': '2', 'THREE': '3', 'FOUR': '4', 'FIVE': '5', 'SIX': '6',
      'SEVEN': '7', 'EIGHT': '8', 'NINE': '9', 'TEN': '10',
      'JACK': 'J', 'QUEEN': 'Q', 'KING': 'K', 'ACE': 'A'
    };
    return symbols[rank] || rank;
  }

  onCardClick(card: HandCard): void {
    if (this.disabled()) return;
    this.stopTimer();
    this.cardPlay.emit(card);
  }

  onSkipGameClick(): void {
    this.stopTimer();
    this.skipGame.emit();
  }
}

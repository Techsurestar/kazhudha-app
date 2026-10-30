import { Component, input, output, computed } from '@angular/core';
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
export class HumanHandComponent {
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

  /** Emitted when the user taps/clicks a playable card */
  readonly cardPlay = output<HandCard>();

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
    this.cardPlay.emit(card);
  }
}

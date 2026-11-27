import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuitIconComponent, CardSuit } from '../icon/suit-icon.component';

export interface LoaderCardItem {
  id: string;
  rank: string;
  rankDisplay: string;
  suit: CardSuit;
  rankClass: string;
  suitClass: string;
  isRed: boolean;
  isCourt: boolean;
}

export const DEFAULT_LOADER_CARDS: Array<{ rank: string; suit: CardSuit }> = [
  { rank: 'A', suit: 'CLUBS' },
  { rank: 'K', suit: 'CLUBS' },
  { rank: 'Q', suit: 'CLUBS' },
  { rank: 'J', suit: 'CLUBS' },
  { rank: '10', suit: 'CLUBS' },
  { rank: 'A', suit: 'HEARTS' },
  { rank: 'K', suit: 'HEARTS' },
  { rank: 'Q', suit: 'HEARTS' },
  { rank: 'J', suit: 'HEARTS' },
  { rank: '10', suit: 'HEARTS' }
];

@Component({
  selector: 'app-custom-loader',
  standalone: true,
  imports: [CommonModule, SuitIconComponent],
  templateUrl: './custom-loader.component.html',
  styleUrls: ['./custom-loader.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomLoaderComponent {
  /** Optional caption message beneath the animated cards */
  readonly text = input<string>('Loading...');

  /** Whether the loader displays as a fullscreen modal overlay */
  readonly fullScreen = input<boolean>(false);

  /** Whether to render the classic casino green felt background from the CodePen */
  readonly showFelt = input<boolean>(true);

  /** Scale factor to resize the animated cards (useful for smaller widgets/mobile) */
  readonly scale = input<number>(1);

  /** Custom cards list (defaults to the 10 Clubs & Hearts from the pen) */
  readonly cards = input<Array<{ rank: string; suit: CardSuit }>>(DEFAULT_LOADER_CARDS);

  /** Normalized and enriched cards list for template rendering */
  readonly cardList = computed<LoaderCardItem[]>(() => {
    return this.cards().map((item, index) => {
      const rankUpper = item.rank.toUpperCase();
      const suitUpper = item.suit.toUpperCase() as CardSuit;
      const isRed = suitUpper === 'HEARTS' || suitUpper === 'DIAMONDS';
      const isCourt = rankUpper === 'K' || rankUpper === 'Q' || rankUpper === 'J';

      const rankClassMap: Record<string, string> = {
        A: 'ace',
        K: 'king',
        Q: 'queen',
        J: 'jack',
        '10': 'ten',
        '9': 'nine',
        '8': 'eight',
        '7': 'seven',
        '6': 'six',
        '5': 'five',
        '4': 'four',
        '3': 'three',
        '2': 'two'
      };

      return {
        id: `${suitUpper}-${rankUpper}-${index}`,
        rank: rankUpper,
        rankDisplay: rankUpper,
        suit: suitUpper,
        rankClass: rankClassMap[rankUpper] || rankUpper.toLowerCase(),
        suitClass: suitUpper.toLowerCase(),
        isRed,
        isCourt
      };
    });
  });
}

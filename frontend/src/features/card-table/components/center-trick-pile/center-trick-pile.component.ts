import { Component, input } from '@angular/core';
import { CardComponent } from '../../../shared/card/card.component';

export interface TrickCard {
  playerId: string;
  rank: string;
  suit: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS' | string;
  position?: 'top' | 'left' | 'right' | 'bottom';
}

@Component({
  selector: 'app-center-trick-pile',
  imports: [CardComponent],
  templateUrl: './center-trick-pile.component.html',
  styleUrls: ['./center-trick-pile.component.css']
})
export class CenterTrickPileComponent {
  /** Active cards currently played on the center trick pile */
  readonly cards = input<TrickCard[]>([]);

  /** Remaining cards in the 52-card center deck during new game deal */
  readonly deckCount = input<number>(0);

  /** Leading suit of the active trick */
  readonly activeRoundSuit = input<string | null>(null);

  /** Whether a vettu (strike/cut) alert animation is actively flashing */
  readonly isVettuFlashing = input<boolean>(false);

  /** Computes the non-overlapping cardinal coordinates for each played card */
  getPositionClass(position?: string): string {
    switch (position) {
      case 'top':
        return '-translate-y-[50px] sm:-translate-y-[56px] z-10';
      case 'left':
        return '-translate-x-[56px] sm:-translate-x-[64px] z-10';
      case 'right':
        return 'translate-x-[56px] sm:translate-x-[64px] z-10';
      case 'bottom':
        return 'translate-y-[50px] sm:translate-y-[56px] z-10';
      default:
        return 'z-10';
    }
  }
}

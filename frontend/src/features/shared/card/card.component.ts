import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardSuit, SuitIconComponent } from '../icon/suit-icon.component';

@Component({
  selector: 'app-card, [app-card], card-view',
  standalone: true,
  imports: [CommonModule, SuitIconComponent],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css']
})
export class CardComponent {
  @Input() rank: string = '';
  @Input() suit: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS' | string = 'SPADES';
  @Input() card?: { rank: string; suit: string };
  @Input() cardClass: string = '';
  @Input() cornerSize: string = 'text-xs';
  @Input() cornerIconSize: string = 'w-3 h-3';
  @Input() centerSize: string = 'w-4 h-4';
  @Input() centerClass: string = '';

  get effectiveRank(): string {
    const raw = this.card?.rank ?? this.rank ?? '';
    const symbols: Record<string, string> = {
      'TWO': '2', 'THREE': '3', 'FOUR': '4', 'FIVE': '5', 'SIX': '6',
      'SEVEN': '7', 'EIGHT': '8', 'NINE': '9', 'TEN': '10',
      'JACK': 'J', 'QUEEN': 'Q', 'KING': 'K', 'ACE': 'A'
    };
    return symbols[raw] || raw;
  }

  get effectiveSuit(): CardSuit {
    return (this.card?.suit ?? this.suit ?? 'SPADES').toUpperCase() as CardSuit;
  }

  get isRed(): boolean {
    return this.effectiveSuit === 'HEARTS' || this.effectiveSuit === 'DIAMONDS';
  }
}

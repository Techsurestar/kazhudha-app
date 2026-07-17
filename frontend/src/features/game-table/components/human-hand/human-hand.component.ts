import { Component, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../../../../core/services/game-state.service';

@Component({
  selector: 'app-human-hand',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './human-hand.component.html'
})
export class HumanHandComponent {
  @Input() cards: Card[] = [];
  @Input() isReplaying = false;
  @Input() suitIconTemplate!: TemplateRef<any>;

  @Output() onPlayCard = new EventEmitter<Card>();

  getCardRankDisplay(rank: string): string {
    const symbols: Record<string, string> = {
      'TWO': '2', 'THREE': '3', 'FOUR': '4', 'FIVE': '5', 'SIX': '6', 'SEVEN': '7', 'EIGHT': '8', 'NINE': '9', 'TEN': '10',
      'JACK': 'J', 'QUEEN': 'Q', 'KING': 'K', 'ACE': 'A'
    };
    return symbols[rank] || rank;
  }

  play(card: Card) {
    this.onPlayCard.emit(card);
  }
}

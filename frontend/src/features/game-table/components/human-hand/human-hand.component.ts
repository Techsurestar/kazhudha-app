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
  @Input() isCurrentTurn = false;
  @Input() suitIconTemplate!: TemplateRef<any>;

  @Output() onPlayCard = new EventEmitter<Card>();

  getCardRankDisplay(rank: string): string {
    const symbols: Record<string, string> = {
      'TWO': '2', 'THREE': '3', 'FOUR': '4', 'FIVE': '5', 'SIX': '6', 'SEVEN': '7', 'EIGHT': '8', 'NINE': '9', 'TEN': '10',
      'JACK': 'J', 'QUEEN': 'Q', 'KING': 'K', 'ACE': 'A'
    };
    return symbols[rank] || rank;
  }

  getCardRotation(idx: number, total: number): number {
    if (total <= 1) return 0;
    const mid = (total - 1) / 2;
    const maxSpan = Math.min(60, total * 8);
    const angleStep = maxSpan / (total - 1);
    const baseRotation = (idx - mid) * angleStep;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return isMobile ? baseRotation * 0.2 : baseRotation;
  }

  getCardTranslateY(idx: number, total: number): number {
    if (total <= 1) return 0;
    const mid = (total - 1) / 2;
    const offset = idx - mid;
    const factor = Math.max(1.2, 3.5 - total * 0.08);
    const baseTranslate = Math.pow(offset, 2) * factor;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return isMobile ? baseTranslate * 0.15 : baseTranslate;
  }

  play(card: Card) {
    this.onPlayCard.emit(card);
  }
}

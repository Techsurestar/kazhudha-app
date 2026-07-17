import { Component, Input, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayedCard } from '../../../../core/services/game-state.service';

@Component({
  selector: 'app-felt-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './felt-table.component.html'
})
export class FeltTableComponent {
  @Input() visualTablePile: PlayedCard[] = [];
  @Input() activeRoundSuit: string | null = null;
  @Input() isVettuFlashing = false;
  @Input() showGameOverModal = false;
  @Input() cardTemplate!: TemplateRef<any>;

  getPlayedCardByPlayer(playerId: string): PlayedCard | undefined {
    return this.visualTablePile.find(pc => pc.playerId === playerId);
  }
}

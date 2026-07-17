import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game-over-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-over-modal.component.html'
})
export class GameOverModalComponent {
  @Input() kazhudhaPlayer: any;
  @Input() escapedOrder: string[] = [];
  @Input() allPlayersMap: Record<string, any> = {};

  @Output() onRestart = new EventEmitter<void>();

  getPlayerName(id: string): string {
    return id === 'human' ? 'You' : (this.allPlayersMap[id]?.name || id);
  }

  restart() {
    this.onRestart.emit();
  }
}

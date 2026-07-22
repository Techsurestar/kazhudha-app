import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HandResult } from '../../../../core/services/game-state.service';

@Component({
  selector: 'app-game-over-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-over-modal.component.html'
})
export class GameOverModalComponent {
  @Input() players: { id: string; name: string }[] = [];
  @Input() hands: HandResult[] = [];
  @Input() tournamentOver: boolean = false;

  @Output() onRestart = new EventEmitter<void>();

  getPlayerTotalScore(playerId: string): number {
    return this.hands.reduce((sum, hand) => sum + (hand.scores[playerId] || 0), 0);
  }

  getPlayerHandScore(hand: HandResult, playerId: string): number {
    return hand.scores[playerId] !== undefined ? hand.scores[playerId] : 0;
  }

  getPlayerName(id: string): string {
    const p = this.players.find(player => player.id === id);
    if (!p) return id === 'human' ? 'You' : id;
    return p.id === 'human' ? 'You' : p.name;
  }

  getCurrentHandWinnerName(): string {
    if (!this.hands || this.hands.length === 0) return '';
    const currentHand = this.hands[this.hands.length - 1];
    return this.getPlayerName(currentHand.winnerId);
  }

  getCurrentHandNumber(): number {
    return this.hands ? this.hands.length : 1;
  }

  getTournamentWinnerName(): string {
    if (!this.hands || this.hands.length === 0) return '';
    let highestScore = -1;
    let winnerName = '';
    this.players.forEach(p => {
      const total = this.getPlayerTotalScore(p.id);
      if (total > highestScore) {
        highestScore = total;
        winnerName = this.getPlayerName(p.id);
      }
    });
    return winnerName;
  }

  getScoreChipClass(score: number): string {
    const base = 'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black shadow-md ';
    if (score === 20) {
      return base + 'bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 border border-amber-200 text-slate-950 shadow-yellow-500/20';
    } else if (score === 15) {
      return base + 'bg-gradient-to-br from-slate-100 via-zinc-300 to-slate-500 border border-zinc-200 text-slate-950 shadow-slate-400/20';
    } else if (score === 10) {
      return base + 'bg-gradient-to-br from-amber-700 via-orange-600 to-amber-800 border border-orange-500 text-amber-100 shadow-orange-700/20';
    }
    return base + 'bg-slate-900/90 border border-slate-800 text-slate-500';
  }

  restart() {
    this.onRestart.emit();
  }
}

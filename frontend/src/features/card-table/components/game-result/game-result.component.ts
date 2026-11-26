import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { HandResult } from '../../../../core/services/game-state.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ChevronsRightComponent } from '../../../shared/icon/chevrons-right.component';

export interface GameResultPlayer {
  id: string;
  name: string;
}

export interface HandReward {
  gamePoints: number;
  xp: number;
  coins: number;
}

export type AccumulatedRewards = HandReward;

@Component({
  selector: 'app-game-result',
  standalone: true,
  imports: [CommonModule, ChevronsRightComponent],
  templateUrl: './game-result.component.html',
  styleUrls: ['./game-result.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameResultComponent {
  private readonly authService = inject(AuthService, { optional: true });

  /** List of participating players */
  readonly players = input<GameResultPlayer[]>([]);

  /** History of completed hand results */
  readonly hands = input<HandResult[]>([]);

  /** Whether the full tournament has completed */
  readonly tournamentOver = input<boolean>(false);

  /** Kazhudha player ID for the round if applicable */
  readonly kazhudhaPlayerId = input<string | null>(null);

  /** Whether the current player is playing as a guest (if omitted, falls back to AuthService) */
  readonly isGuest = input<boolean | undefined>(undefined);

  /** Emitted when the restart/deal button is triggered */
  readonly restart = output<void>();

  /** Emitted for compatibility with GameOverModalComponent onRestart */
  readonly onRestart = output<void>();

  /** Effective guest status (hides rewards accumulated card when true) */
  readonly isGuestPlayer = computed<boolean>(() => {
    const explicit = this.isGuest();
    if (explicit !== undefined) {
      return explicit;
    }
    if (this.authService) {
      return !this.authService.isAuthenticated();
    }
    return false;
  });

  /** Effective list of players (falls back to standard 4-seat setup) */
  readonly playerList = computed<GameResultPlayer[]>(() => {
    const custom = this.players();
    if (custom && custom.length > 0) {
      return custom;
    }
    return [
      { id: 'human', name: 'You' },
      { id: 'bot1', name: 'Bot 1' },
      { id: 'bot2', name: 'Bot 2' },
      { id: 'bot3', name: 'Bot 3' }
    ];
  });

  getPlayerTotalScore(playerId: string): number {
    return this.hands().reduce((sum, hand) => sum + (hand.scores?.[playerId] || 0), 0);
  }

  getPlayerHandScore(hand: HandResult, playerId: string): number {
    return hand.scores?.[playerId] !== undefined ? hand.scores[playerId] : 0;
  }

  getPlayerName(id: string | null | undefined): string {
    if (!id) return '';
    const p = this.playerList().find(player => player.id === id);
    if (!p) return id === 'human' ? 'You' : id;
    return p.id === 'human' ? 'You' : p.name;
  }

  getCurrentHandWinnerName(): string {
    const list = this.hands();
    if (!list || list.length === 0) return '';
    const currentHand = list[list.length - 1];
    return this.getPlayerName(currentHand.winnerId);
  }

  getCurrentHandNumber(): number {
    const list = this.hands();
    return list && list.length > 0 ? list.length : 1;
  }

  getTournamentWinnerId(): string {
    const list = this.hands();
    if (!list || list.length === 0) return '';
    let highestScore = -1;
    let winnerId = '';
    this.playerList().forEach(p => {
      const total = this.getPlayerTotalScore(p.id);
      if (total > highestScore) {
        highestScore = total;
        winnerId = p.id;
      }
    });
    return winnerId;
  }

  getTournamentWinnerName(): string {
    const winnerId = this.getTournamentWinnerId();
    return winnerId ? this.getPlayerName(winnerId) : '';
  }

  /** Whether the human player is the winner of the current hand or tournament */
  readonly isHumanWinner = computed<boolean>(() => {
    if (this.tournamentOver()) {
      return this.getTournamentWinnerId() === 'human';
    }
    const currentHand = this.latestHand();
    return currentHand?.winnerId === 'human';
  });

  /**
   * Reward calculation based on position/game points in each hand:
   * 1st: 20 pts -> 12 XP, 8 Coins
   * 2nd: 15 pts -> 8 XP, 5 Coins
   * 3rd: 10 pts -> 5 XP, 3 Coins
   * 4th: 0 pts  -> 2 XP, 1 Coin
   */
  getHandRewards(score: number): HandReward {
    if (score >= 20) {
      return { gamePoints: 20, xp: 12, coins: 8 };
    } else if (score >= 15) {
      return { gamePoints: 15, xp: 8, coins: 5 };
    } else if (score >= 10) {
      return { gamePoints: 10, xp: 5, coins: 3 };
    } else {
      return { gamePoints: 0, xp: 2, coins: 1 };
    }
  }

  /** Latest completed hand */
  readonly latestHand = computed<HandResult | null>(() => {
    const list = this.hands();
    return list && list.length > 0 ? list[list.length - 1] : null;
  });

  /** Human player's score in the latest hand */
  readonly humanLatestHandScore = computed<number>(() => {
    const hand = this.latestHand();
    if (!hand || !hand.scores) return 0;
    return hand.scores['human'] ?? 0;
  });

  /** Human player's rewards for the latest hand */
  readonly humanLatestHandRewards = computed<HandReward>(() => {
    return this.getHandRewards(this.humanLatestHandScore());
  });

  /** Accumulated rewards (game points, XP, coins) across all completed hands */
  readonly accumulatedRewards = computed<AccumulatedRewards>(() => {
    let gamePoints = 0;
    let xp = 0;
    let coins = 0;
    const list = this.hands();
    if (!list || list.length === 0) {
      return { gamePoints: 0, xp: 0, coins: 0 };
    }
    for (const hand of list) {
      const score = this.getPlayerHandScore(hand, 'human');
      const reward = this.getHandRewards(score);
      gamePoints += reward.gamePoints;
      xp += reward.xp;
      coins += reward.coins;
    }
    return { gamePoints, xp, coins };
  });

  /**
   * Authentic coin/chip styles matching the casino table theme:
   * 20: Gold coin with inner border and bold text
   * 15: Silver coin with inner border and bold text
   * 10: Crimson/Red coin with inner border and white text
   * 0: Sapphire/Navy Blue coin with inner border and white text
   */
  getScoreChipClass(score: number): string {
    const base = 'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black shadow-md border-2 transition-transform duration-200 ';
    if (score === 20) {
      return base + 'bg-gradient-to-b from-amber-200 via-yellow-400 to-amber-600 border-yellow-200 text-slate-950 shadow-yellow-500/30';
    } else if (score === 15) {
      return base + 'bg-gradient-to-b from-slate-100 via-zinc-300 to-slate-400 border-slate-200 text-slate-950 shadow-slate-400/30';
    } else if (score === 10) {
      return base + 'bg-gradient-to-b from-rose-500 via-red-600 to-rose-900 border-rose-300 text-white shadow-red-700/30';
    }
    return base + 'bg-gradient-to-b from-blue-500 via-indigo-700 to-slate-900 border-indigo-400/80 text-white shadow-indigo-600/20';
  }

  handleRestart(): void {
    this.restart.emit();
    this.onRestart.emit();
  }
}

import { Component, input, computed } from '@angular/core';

export interface OpponentData {
  id?: string;
  name: string;
  score: number;
  cardCount: number;
  isCurrentTurn?: boolean;
  position?: 'top' | 'left' | 'right' | string;
}

export interface RankChip {
  label: string;
  type: 'gold' | 'silver' | 'bronze';
}

@Component({
  selector: 'app-opponent-seat',
  templateUrl: './opponent-seat.component.html',
  styleUrls: ['./opponent-seat.component.css']
})
export class OpponentSeatComponent {
  /** Combined opponent player data object input */
  readonly player = input<OpponentData>();

  /** Individual input signals */
  readonly name = input<string>('');
  readonly score = input<number>(0);
  readonly cardCount = input<number>(0);
  readonly position = input<'top' | 'left' | 'right'>('top');
  readonly isCurrentTurn = input<boolean>(false);
  readonly chip = input<RankChip | null>(null);

  readonly effectiveName = computed(() => this.player()?.name ?? this.name());
  readonly effectiveScore = computed(() => this.player()?.score ?? this.score());
  readonly effectiveCardCount = computed(() => this.player()?.cardCount ?? this.cardCount());

  readonly effectivePosition = computed<'top' | 'left' | 'right'>(() => {
    const pos = this.player()?.position ?? this.position();
    if (pos === 'left' || pos === 'right') return pos;
    return 'top';
  });

  readonly effectiveIsTurn = computed(() => this.player()?.isCurrentTurn ?? this.isCurrentTurn());

  /** Display up to 12 stacked card backs for the visual deck fan */
  readonly visibleCardIndices = computed<number[]>(() => {
    const count = Math.min(Math.max(0, this.effectiveCardCount()), 12);
    return Array.from({ length: count }, (_, i) => i);
  });

  readonly chipClass = computed<string>(() => {
    const c = this.chip();
    if (!c) return '';
    switch (c.type) {
      case 'gold':
        return 'bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 border-amber-200 text-slate-950 shadow-yellow-500/30';
      case 'silver':
        return 'bg-gradient-to-br from-slate-200 via-zinc-400 to-slate-500 border-zinc-200 text-slate-950 shadow-slate-400/30';
      case 'bronze':
        return 'bg-gradient-to-br from-amber-700 via-orange-600 to-amber-800 border-orange-500 text-amber-100 shadow-orange-700/30';
    }
  });
}

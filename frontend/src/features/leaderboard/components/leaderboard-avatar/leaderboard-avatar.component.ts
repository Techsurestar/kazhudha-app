import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { DonkeyAccessory } from '../../models/leaderboard.model';

@Component({
  selector: 'app-leaderboard-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard-avatar.component.html',
  styleUrls: ['./leaderboard-avatar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardAvatarComponent {
  avatarUrl = input<string>('/avatar/avatar.jpeg');
  accessory = input<DonkeyAccessory | undefined>('sunglasses');
  rank = input<number | undefined>(undefined);
  size = input<number>(44);
  hasLaurel = input<boolean>(false);
  hasCrown = input<boolean>(false);
  showRankBadge = input<boolean>(false);

  readonly resolvedBorderClass = computed(() => {
    const r = this.rank();
    if (r === 1) return 'border-2 border-amber-300 shadow-[0_0_15px_rgba(245,197,24,0.7)]';
    if (r === 2) return 'border-2 border-slate-300 shadow-[0_0_12px_rgba(226,232,240,0.6)]';
    if (r === 3) return 'border-2 border-amber-600 shadow-[0_0_12px_rgba(217,119,6,0.6)]';
    return 'border border-amber-400/40';
  });

  readonly resolvedBadgeBg = computed(() => {
    const r = this.rank();
    if (r === 1) return 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 border border-amber-200';
    if (r === 2) return 'bg-gradient-to-b from-slate-200 to-slate-400 text-slate-950 border border-slate-100';
    if (r === 3) return 'bg-gradient-to-b from-amber-600 to-amber-800 text-amber-100 border border-amber-400';
    return 'bg-slate-900 text-amber-400 border border-amber-400/50';
  });
}

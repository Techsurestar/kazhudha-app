import { Component, input } from '@angular/core';
import { LucideChartNoAxesColumn } from '@lucide/angular';

@Component({
  selector: 'leaderboard-icon',
  standalone: true,
  imports: [LucideChartNoAxesColumn],
    template: `
      <svg
        lucideChartNoAxesColumn
        [size]="size()"
        [strokeWidth]="strokeWidth()"
        aria-hidden="true">
      </svg>
    `
  })
export class LeadboardIconComponent {
  size = input<number>(20);
  strokeWidth = input<number>(2);
}
import { Component, input } from '@angular/core';
import { LucidePlayingCardsFan } from '@lucide/angular';

@Component({
  selector: 'gameplay-icon',
  standalone: true,
  imports: [LucidePlayingCardsFan],
  template: `
    <svg
      lucidePlayingCardsFan
      [size]="size()"
      [strokeWidth]="strokeWidth()"
      aria-hidden="true">
    </svg>
  `
})
export class GameplayIconComponent {
  size = input<number>(20);
  strokeWidth = input<number>(2);
}

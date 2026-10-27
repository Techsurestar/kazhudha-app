import { Component, input } from '@angular/core';
import { LucideHouse } from '@lucide/angular';

@Component({
  selector: 'home-icon',
  standalone: true,
  imports: [LucideHouse],
  template: `
    <svg
      lucideHouse
      [size]="size()"
      [strokeWidth]="strokeWidth()"
      aria-hidden="true">
    </svg>
  `
})
export class HomeIconComponent {
  size = input<number>(20);
  strokeWidth = input<number>(2);
}
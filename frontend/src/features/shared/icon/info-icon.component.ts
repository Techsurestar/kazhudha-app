import { Component, input } from '@angular/core';
import { LucideInfo } from '@lucide/angular';

@Component({
  selector: 'info-icon',
  standalone: true,
  imports: [LucideInfo],
  template: `
    <svg
      lucideInfo
      [size]="size()"
      [strokeWidth]="strokeWidth()"
      aria-hidden="true">
    </svg>
  `
})
export class InfoIconComponent {
  size = input<number>(20);
  strokeWidth = input<number>(2);
}
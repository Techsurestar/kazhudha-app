import { Component, input } from '@angular/core';
import { LucideCrown } from '@lucide/angular';

@Component({
  selector: 'crown-icon',
  standalone: true,
  imports: [LucideCrown],
  template: `
    <svg
      lucideCrown
      [size]="size()"
      [strokeWidth]="strokeWidth()"
      class="fill-current text-[#f5c518]"
      aria-hidden="true">
    </svg>
  `
})
export class CrownIconComponent {
  size = input<number>(14);
  strokeWidth = input<number>(2);
}

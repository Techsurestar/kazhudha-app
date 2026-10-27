import { Component, input } from '@angular/core';
import { LucideChevronsLeft } from '@lucide/angular';

@Component({
  selector: 'chevrons-left-icon',
  standalone: true,
  imports: [LucideChevronsLeft],
  template: `
    <svg
      lucideChevronsLeft
      [size]="size()"
      [strokeWidth]="strokeWidth()"
      aria-hidden="true">
    </svg>
  `
})
export class ChevronsLeftComponent {
  size = input<number>(20);
  strokeWidth = input<number>(2);
}
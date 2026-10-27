import { Component, input } from '@angular/core';
import { LucideChevronsRight } from '@lucide/angular';

@Component({
  selector: 'chevrons-right-icon',
  standalone: true,
  imports: [LucideChevronsRight],
  template: `
    <svg
      lucideChevronsRight
      [size]="size()"
      [strokeWidth]="strokeWidth()"
      aria-hidden="true">
    </svg>
  `
})
export class ChevronsRightComponent {
  size = input<number>(20);
  strokeWidth = input<number>(2);
}
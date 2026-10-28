import { Component, input } from '@angular/core';
import { LucideBookOpen } from '@lucide/angular';

@Component({
  selector: 'book-open-icon',
  standalone: true,
  imports: [LucideBookOpen],
  template: `
    <svg
      lucideBookOpen
      [size]="size()"
      [strokeWidth]="strokeWidth()"
      aria-hidden="true">
    </svg>
  `
})
export class BookOpenIconComponent {
  size = input<number>(20);
  strokeWidth = input<number>(2);
}
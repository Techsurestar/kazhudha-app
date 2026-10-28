import { Component, input } from '@angular/core';
import { LucideUser } from '@lucide/angular';

@Component({
  selector: 'user-icon',
  standalone: true,
  imports: [LucideUser],
  template: `
    <svg
      lucideUser
      [size]="size()"
      [strokeWidth]="strokeWidth()"
      aria-hidden="true">
    </svg>
  `
})
export class UserIconComponent {
  size = input<number>(20);
  strokeWidth = input<number>(2);
}
import { Component, input } from '@angular/core';
import { LucideGamepad2 } from '@lucide/angular';

@Component({
  selector: 'gamepad-icon',
  standalone: true,
  imports: [LucideGamepad2],
  template: `
    <svg
      lucideGamepad2
      [size]="size()"
      [strokeWidth]="strokeWidth()"
      aria-hidden="true">
    </svg>
  `
})
export class GamepadIconComponent {
  size = input<number>(20);
  strokeWidth = input<number>(2);
}

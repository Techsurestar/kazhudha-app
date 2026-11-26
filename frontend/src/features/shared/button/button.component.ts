import { Component, ChangeDetectionStrategy, input, output, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  private readonly router = inject(Router, { optional: true });

  /** Visual variant: primary (gold gradient), secondary (glass), outline (green with gold border) */
  readonly variant = input<ButtonVariant>('primary');

  /** Sizing scale: sm, md (default), lg */
  readonly size = input<ButtonSize>('md');

  /** Whether the button spans full width of its parent */
  readonly fullWidth = input<boolean>(true);

  /** Disabled state */
  readonly disabled = input<boolean>(false);

  /** Loading state with animated spinner */
  readonly loading = input<boolean>(false);

  /** HTML button type */
  readonly type = input<'button' | 'submit' | 'reset'>('button');

  /** Optional router link target */
  readonly routerLink = input<string | any[]>();

  /** Emitted when button is clicked (and not disabled/loading) */
  readonly clicked = output<MouseEvent>();

  /** Dynamically compute CSS classes for the native button */
  readonly buttonClasses = computed(() => {
    const classes = [
      'app-btn',
      `btn-${this.variant()}`,
      `btn-${this.size()}`
    ];

    if (this.fullWidth()) {
      classes.push('w-full');
    }

    return classes.join(' ');
  });

  @HostListener('click', ['$event'])
  onHostClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('button')) {
      this.handleClick(event);
    }
  }

  handleClick(event: MouseEvent): void {
    if (this.disabled() || this.loading()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    this.clicked.emit(event);

    const link = this.routerLink();
    if (link && this.router) {
      if (typeof link === 'string') {
        this.router.navigate([link]);
      } else {
        this.router.navigate(link);
      }
    }
  }
}

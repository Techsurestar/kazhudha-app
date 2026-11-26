import { Component, input, output, model, computed } from '@angular/core';
import { InfoIconComponent } from './../../../shared/icon/info-icon.component';

@Component({
  selector: 'app-action-bar',
  imports: [InfoIconComponent],
  templateUrl: './action-bar.component.html',
  styleUrls: ['./action-bar.component.css']
})
export class ActionBarComponent {
  /** Two-way bindable on/off state for the Information button (defaults to true / on) */
  readonly isInfoOn = model<boolean>(true);

  /** Optional input override for on/off state */
  readonly isInfoActive = input<boolean | undefined>(undefined);

  /** Optional text displayed inside the central text area badge */
  readonly badgeText = input<string>('');
  readonly text = input<string>('');

  /** Effective on/off state of the Information button */
  readonly effectiveIsInfoOn = computed(() => {
    if (this.isInfoActive() !== undefined) {
      return this.isInfoActive()!;
    }
    return this.isInfoOn();
  });

  /** Whether the text area badge should display content */
  readonly shouldShowBadge = computed(() => {
    const rawText = this.badgeText() || this.text();
    return !!rawText && this.effectiveIsInfoOn();
  });

  /** Effective text displayed inside the text area badge */
  readonly effectiveBadgeText = computed(() => {
    const rawText = this.badgeText() || this.text();
    if (!rawText || !this.effectiveIsInfoOn()) return '';
    return rawText;
  });

  onInfoClick(): void {
    this.isInfoOn.update(current => !current);
  }
}

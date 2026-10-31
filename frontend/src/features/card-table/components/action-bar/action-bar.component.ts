import { Component, input, output, model, computed } from '@angular/core';
import { InfoIconComponent } from './../../../shared/icon/info-icon.component';

@Component({
  selector: 'app-action-bar',
  imports: [InfoIconComponent],
  templateUrl: './action-bar.component.html',
  styleUrls: ['./action-bar.component.css']
})
export class ActionBarComponent {
  /** When true, disables clicking the hint button */
  readonly isHintDisabled = input<boolean>(false);

  /** Emitted when the "Hint" action is triggered */
  readonly hint = output<void>();

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

  /** Checks if a message is a hint message */
  isHintMessage(message: string | null | undefined): boolean {
    return !!message && /hint/i.test(message);
  }

  /** Whether the text area badge should display content */
  readonly shouldShowBadge = computed(() => {
    const rawText = this.badgeText() || this.text();
    if (this.isHintMessage(rawText)) {
      return true;
    }
    return this.effectiveIsInfoOn();
  });

  /** Effective text displayed inside the text area badge */
  readonly effectiveBadgeText = computed(() => {
    const rawText = this.badgeText() || this.text();
    if (!rawText) return '';
    if (this.isHintMessage(rawText)) {
      return rawText;
    }
    if (!this.effectiveIsInfoOn()) {
      return '';
    }
    return rawText;
  });

  onHintClick(): void {
    if (this.isHintDisabled()) return;
    this.hint.emit();
  }

  onInfoClick(): void {
    this.isInfoOn.update(current => !current);
  }
}

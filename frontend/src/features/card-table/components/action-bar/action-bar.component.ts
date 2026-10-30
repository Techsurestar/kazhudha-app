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

  /** Two-way bindable on/off state for the Information button (defaults to false / off) */
  readonly isInfoOn = model<boolean>(false);

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

  /** Effective text displayed inside the text area badge */
  readonly effectiveBadgeText = computed(() => this.badgeText() || this.text());

  onHintClick(): void {
    if (this.isHintDisabled()) return;
    this.hint.emit();
  }

  onInfoClick(): void {
    this.isInfoOn.update(current => !current);
  }
}

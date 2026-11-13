import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home-profile-meta, home-profile-meta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-profile-meta.component.html',
  styleUrls: ['./home-profile-meta.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeProfileMetaComponent {
  /** Player display name (defaults to 'Guest Player') */
  readonly playerName = input<string>('Guest Player');
  readonly name = input<string>('');
  readonly displayName = computed(() => this.name() || this.playerName());

  /** Mode pill text (defaults to 'Guest Mode') */
  readonly badgeText = input<string>('Guest Mode');
  readonly mode = input<string>('');
  readonly displayMode = computed(() => this.mode() || this.badgeText());

  /** Subtitle / status description (defaults to "You're playing as a guest") */
  readonly subtitle = input<string>("You're playing as a guest");
  readonly statusText = input<string>('');
  readonly displaySubtitle = computed(() => this.statusText() || this.subtitle());

  /** Avatar image URL (defaults to '/avatar/guest_avatar.webp') */
  readonly avatarSrc = input<string>('/avatar/guest_avatar.webp');
  readonly avatarUrl = input<string>('');
  readonly displayAvatarSrc = computed(() => {
    return this.avatarUrl() || this.avatarSrc() || '/avatar/guest_avatar.webp';
  });

  /** Alt text for the avatar image */
  readonly avatarAlt = input<string>('Guest Player Avatar');

  /** Whether the profile meta element should present interactive cursor & styles */
  readonly clickable = input<boolean>(false);

  /** Emitted when the overall profile card is clicked */
  readonly profileClick = output<void>();

  /** Emitted specifically when the avatar is clicked */
  readonly avatarClick = output<void>();

  /** Emitted specifically when the mode badge pill is clicked */
  readonly badgeClick = output<void>();

  onCardClick(event: MouseEvent): void {
    this.profileClick.emit();
  }

  onAvatarClick(event: MouseEvent): void {
    event.stopPropagation();
    this.avatarClick.emit();
    this.profileClick.emit();
  }

  onBadgeClick(event: MouseEvent): void {
    event.stopPropagation();
    this.badgeClick.emit();
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.src.includes('app-logo.png')) {
      img.src = 'assets/app-logo.png';
    }
  }
}

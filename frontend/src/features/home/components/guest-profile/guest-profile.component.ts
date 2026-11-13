import { Component, ChangeDetectionStrategy, input, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HomeProfileMetaComponent } from '../home-profile-meta/home-profile-meta.component';
import { HomeIconComponent } from '../../../shared/icon/home-icon.component';
import { BookOpenIconComponent } from '../../../shared/icon/book-open-icon.component';
import { LeadboardIconComponent } from '../../../shared/icon/leadboard-icon.component';
import { UserIconComponent } from '../../../shared/icon/user-icon.component';
import { ChevronsRightComponent } from '../../../shared/icon/chevrons-right.component';

@Component({
  selector: 'app-guest-profile, guest-profile',
  standalone: true,
  imports: [
    CommonModule,
    HomeProfileMetaComponent,
    HomeIconComponent,
    BookOpenIconComponent,
    LeadboardIconComponent,
    UserIconComponent,
    ChevronsRightComponent
  ],
  templateUrl: './guest-profile.component.html',
  styleUrls: ['./guest-profile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuestProfileComponent {
  private router = inject(Router);

  /** Active navigation tab (defaults to 'profile') */
  readonly activeTab = signal<'home' | 'rules' | 'leaderboard' | 'profile'>('profile');

  /** Whether the leaderboard modal is open */
  readonly showLeaderboardModal = signal<boolean>(false);

  /** Player display name (defaults to 'Guest Player') */
  readonly playerName = input<string>('Guest Player');

  /** Avatar image URL (defaults to '/avatar/guest_avatar.webp') */
  readonly avatarSrc = input<string>('/avatar/guest_avatar.webp');

  /** Whether the component is rendered inside a modal wrapper */
  readonly isModal = input<boolean>(false);

  /** Emitted when "Play as Guest" is clicked */
  readonly playAsGuest = output<void>();

  /** Emitted when "Maybe Later" is clicked (kept for backwards compatibility) */
  readonly maybeLater = output<void>();

  /** Emitted when "Continue with Google" is clicked */
  readonly continueWithGoogle = output<void>();

  /** Emitted when "Continue with Email" is clicked */
  readonly continueWithEmail = output<void>();

  setActiveTab(tab: 'home' | 'rules' | 'leaderboard' | 'profile'): void {
    this.activeTab.set(tab);
    if (tab === 'home') {
      this.router.navigate(['/']);
    } else if (tab === 'rules') {
      this.router.navigate(['/how-to-play']);
    } else if (tab === 'leaderboard') {
      this.showLeaderboardModal.set(true);
    }
  }

  closeLeaderboard(): void {
    this.showLeaderboardModal.set(false);
    this.activeTab.set('profile');
  }

  onPlayAsGuest(): void {
    this.playAsGuest.emit();
    if (!this.isModal()) {
      this.router.navigate(['/game']);
    }
  }

  onMaybeLater(): void {
    this.maybeLater.emit();
    if (!this.isModal()) {
      this.router.navigate(['/']);
    }
  }

  onGoogleSignIn(): void {
    this.continueWithGoogle.emit();
  }

  onEmailSignIn(): void {
    this.continueWithEmail.emit();
  }
}

import { Component, ChangeDetectionStrategy, input, output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HomeProfileMetaComponent } from '../home-profile-meta/home-profile-meta.component';
import { ChevronsRightComponent } from '../../../shared/icon/chevrons-right.component';
import { BottomNavComponent } from '../../../shared/bottom-nav/bottom-nav.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-guest-profile, guest-profile',
  standalone: true,
  imports: [
    CommonModule,
    HomeProfileMetaComponent,
    ChevronsRightComponent,
    BottomNavComponent
  ],
  templateUrl: './guest-profile.component.html',
  styleUrls: ['./guest-profile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuestProfileComponent {
  private router = inject(Router);
  readonly authService = inject(AuthService);

  readonly isSigningIn = signal<boolean>(false);

  /** Player display name (defaults to 'Guest Player') */
  readonly playerName = input<string>('Guest Player');

  /** Avatar image URL (defaults to '/avatar/guest_avatar.webp') */
  readonly avatarSrc = input<string>('/avatar/guest_avatar.webp');

  /** Dynamic display name reflecting auth status if available */
  readonly effectiveDisplayName = computed(() => {
    return this.authService.isAuthenticated() ? this.authService.displayName() : this.playerName();
  });

  /** Dynamic avatar URL reflecting auth status if available */
  readonly effectiveAvatarUrl = computed(() => {
    return this.authService.isAuthenticated() ? this.authService.avatarUrl() : this.avatarSrc();
  });

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
    if (tab === 'home') {
      this.router.navigate(['/']);
    } else if (tab === 'rules') {
      this.router.navigate(['/how-to-play']);
    } else if (tab === 'leaderboard') {
      this.router.navigate(['/leaderboard']);
    } else if (tab === 'profile') {
      if (this.authService.isAuthenticated()) {
        this.router.navigate(['/profile']);
      }
    }
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

  async onGoogleSignIn(): Promise<void> {
    this.continueWithGoogle.emit();
    try {
      this.isSigningIn.set(true);
      await this.authService.signInWithGoogle();
    } catch (err) {
      console.error('GuestProfileComponent: Google Sign-In error', err);
    } finally {
      this.isSigningIn.set(false);
    }
  }

  async onSignOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch (err) {
      console.error('GuestProfileComponent: Sign-Out error', err);
    }
  }

  onEmailSignIn(): void {
    this.continueWithEmail.emit();
  }
}

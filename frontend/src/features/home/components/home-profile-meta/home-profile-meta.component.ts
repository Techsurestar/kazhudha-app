import { Component, ChangeDetectionStrategy, input, output, computed, inject, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { resolveAvatarUrl } from '../../../../core/utils/avatar.util';

@Component({
  selector: 'app-home-profile-meta, home-profile-meta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-profile-meta.component.html',
  styleUrls: ['./home-profile-meta.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeProfileMetaComponent implements OnInit {
  readonly authService = inject(AuthService, { optional: true });

  /** Loaded profile data from Supabase profiles table for logged-in user */
  readonly profileUsername = signal<string>('');
  readonly profileAvatarUrl = signal<string>('');

  /** Player display name (defaults to 'Guest Player') */
  readonly playerName = input<string>('Guest Player');
  readonly name = input<string>('');

  /** Helper getters to safely access AuthService signals across mocks and real instances */
  private get isAuthenticated(): boolean {
    return typeof this.authService?.isAuthenticated === 'function' ? this.authService.isAuthenticated() : false;
  }

  private get currentUser(): any {
    return typeof this.authService?.currentUser === 'function' ? this.authService.currentUser() : null;
  }

  readonly displayName = computed(() => {
    // For logged-in user: wire strictly to profiles table username (never Google info)
    if (this.isAuthenticated) {
      if (this.profileUsername()) {
        return this.profileUsername();
      }
      const authProfile = this.authService && typeof (this.authService as any).userProfile === 'function' ? (this.authService as any).userProfile() : null;
      if (authProfile?.username) {
        return authProfile.username;
      }
      if (this.name()) return this.name();
      return 'Player123';
    }
    // For guest user: use input properties
    return this.name() || this.playerName();
  });

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
    // For logged-in user: wire strictly to profiles table avatar_url (never Google info)
    if (this.isAuthenticated) {
      if (this.profileAvatarUrl()) {
        return resolveAvatarUrl(this.profileAvatarUrl());
      }
      const authProfile = this.authService && typeof (this.authService as any).userProfile === 'function' ? (this.authService as any).userProfile() : null;
      if (authProfile?.avatar_url) {
        return resolveAvatarUrl(authProfile.avatar_url);
      }
      return '/avatar/avatar.jpeg';
    }
    // For guest user: use input properties
    return this.avatarUrl() || this.avatarSrc() || '/avatar/guest_avatar.webp';
  });

  /** Alt text for the avatar image */
  readonly avatarAlt = input<string>('Guest Player Avatar');

  readonly displayAvatarAlt = computed(() => {
    if (this.avatarAlt() && this.avatarAlt() !== 'Guest Player Avatar') {
      return this.avatarAlt();
    }
    if (this.isAuthenticated) {
      return `${this.displayName()} Avatar`;
    }
    return this.avatarAlt();
  });

  /** Whether the profile meta element should present interactive cursor & styles */
  readonly clickable = input<boolean>(false);

  /** Emitted when the overall profile card is clicked */
  readonly profileClick = output<void>();

  /** Emitted specifically when the avatar is clicked */
  readonly avatarClick = output<void>();

  /** Emitted specifically when the mode badge pill is clicked */
  readonly badgeClick = output<void>();

  constructor() {
    // Immediately seed from AuthService's cached profile (0ms delay)
    this.seedFromAuthService();

    // React to auth state changes to fetch or clear profiles table data
    effect(() => {
      const user = this.currentUser;
      if (user) {
        this.seedFromAuthService();
        this.fetchProfile();
      } else {
        this.profileUsername.set('');
        this.profileAvatarUrl.set('');
      }
    });
  }

  private seedFromAuthService(): void {
    if (this.authService && typeof (this.authService as any).userProfile === 'function') {
      const p = (this.authService as any).userProfile();
      if (p) {
        if (p.username && !this.profileUsername()) {
          this.profileUsername.set(p.username);
        }
        if (p.avatar_url && !this.profileAvatarUrl()) {
          this.profileAvatarUrl.set(p.avatar_url);
        }
      }
    }
  }

  async ngOnInit(): Promise<void> {
    if (this.isAuthenticated) {
      await this.fetchProfile();
    }
  }

  async fetchProfile(): Promise<void> {
    if (!this.authService) return;
    let user = this.currentUser;
    if (!user && typeof this.authService.waitForAuthReady === 'function') {
      await this.authService.waitForAuthReady();
      user = this.currentUser;
    }
    const client = this.authService.client;
    if (!user || !client) return;

    try {
      const { data, error } = await client
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('HomeProfileMetaComponent: Could not fetch profile from Supabase', error.message);
        return;
      }

      if (data) {
        if (data.username) {
          this.profileUsername.set(data.username);
        }
        if (data.avatar_url) {
          this.profileAvatarUrl.set(data.avatar_url);
        }
        if (this.authService && typeof (this.authService as any).setProfile === 'function') {
          (this.authService as any).setProfile({
            id: user.id,
            username: data.username,
            avatar_url: data.avatar_url
          });
        }
      }
    } catch (err) {
      console.warn('HomeProfileMetaComponent: Error fetching profile from Supabase', err);
    }
  }

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

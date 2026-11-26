import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BottomNavComponent } from '../shared/bottom-nav/bottom-nav.component';

export interface ProfileStat {
  iconType: 'goldTrophy' | 'greenTrophy' | 'target' | 'coins';
  value: string | number;
  label: string;
}

export interface AvatarOption {
  id: string;
  name: string;
  src: string;
  unlocked: boolean;
}

/**
 * Profile record schema from public.profiles table
 */
export interface ProfileRecord {
  id: string;
  username: string;
  avatar_url?: string | null;
  xp?: number;
  coins?: number;
  level?: number;
  matches_played?: number;
  matches_won?: number;
  created_at?: string;
  created_date?: string;
  updated_at?: string;
}

export { resolveAvatarUrl } from '../../core/utils/avatar.util';
import { resolveAvatarUrl } from '../../core/utils/avatar.util';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BottomNavComponent
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent implements OnInit {
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  /** Active navigation tab ('profile' is default) */
  readonly activeTab = signal<'home' | 'play' | 'leaderboard' | 'profile'>('profile');

  /** Modals state */
  readonly showEditNameModal = signal<boolean>(false);
  readonly showAvatarsModal = signal<boolean>(false);
  readonly showStatsModal = signal<boolean>(false);
  readonly showAchievementsModal = signal<boolean>(false);
  readonly showSettingsModal = signal<boolean>(false);
  readonly showRankModal = signal<boolean>(false);

  /** Loaded profile record from Supabase profiles table */
  readonly profile = signal<ProfileRecord | null>(null);

  /** Profile database table fields */
  readonly profileUsername = signal<string>('');
  readonly profileAvatarUrl = signal<string>('');
  readonly profileCreatedAt = signal<string | null>(null);

  /** Editing custom name */
  readonly customName = signal<string>('');
  readonly editNameInput = signal<string>('');

  /** Custom selected avatar */
  readonly selectedAvatarSrc = signal<string>('');

  /** Current Rank & Progress details (mapped from profiles table xp & level) */
  readonly userRank = signal<string>('Rookie');
  readonly userLevel = signal<number>(1);
  readonly currentXp = signal<number>(0);
  readonly targetXp = signal<number>(500);
  readonly nextRank = signal<string>('Amateur');
  readonly unlockedAvatarsCount = signal<number>(3);
  readonly hasUnclaimedAchievements = signal<boolean>(true);

  /** Flag to toggle upcoming features (Rank progress & menu items) for later releases */
  readonly showUpcomingFeatures = signal<boolean>(false);

  /** Sound & Notifications settings */
  readonly soundEnabled = signal<boolean>(true);
  readonly hapticsEnabled = signal<boolean>(true);

  /** Available avatars for selection */
  readonly availableAvatars = signal<AvatarOption[]>([
    { id: '1', name: 'Cool Donkey', src: '/avatar/avatar.jpeg', unlocked: true },
    { id: '2', name: 'Classic Donkey', src: '/avatar/guest_avatar.webp', unlocked: true },
    { id: '3', name: 'Golden Ace', src: '/assets/app-logo.png', unlocked: true },
    { id: '4', name: 'Card Master', src: '/assets/achievement.webp', unlocked: false }
  ]);

  /** Derived display name (from custom edit, profiles.username, Google auth, or default 'Player123') */
  readonly displayName = computed(() => {
    if (this.customName()) return this.customName();
    if (this.profileUsername()) return this.profileUsername();
    const authName = this.authService.displayName();
    if (authName && authName !== 'Guest Player') return authName;
    return 'Player123';
  });

  /** Derived avatar URL mapped from profiles.avatar_url, selection, Google picture, or default avatar */
  readonly avatarUrl = computed(() => {
    if (this.selectedAvatarSrc()) return resolveAvatarUrl(this.selectedAvatarSrc());
    if (this.profileAvatarUrl()) return resolveAvatarUrl(this.profileAvatarUrl());
    const authAvatar = this.authService.avatarUrl();
    if (authAvatar && authAvatar !== '/avatar/guest_avatar.webp') return authAvatar;
    return '/avatar/avatar.jpeg';
  });

  /** Formatted Join Date (from profiles.created_date or profiles.created_at or auth signup date) */
  readonly joinedDate = computed(() => {
    const rawDate = this.profileCreatedAt() || this.authService.currentUser()?.created_at;
    if (rawDate) {
      const date = new Date(rawDate);
      if (!isNaN(date.getTime())) {
        return `Joined ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
    }
    return 'Joined Oct 27, 2026';
  });

  /** Games statistics mapped from profiles table (matches_played, matches_won, coins) */
  readonly matchesPlayed = signal<number>(0);
  readonly matchesWon = signal<number>(0);
  readonly coinsCount = signal<number>(0);

  /** Games Played display (matches_played) */
  readonly gamesPlayed = computed(() => this.matchesPlayed());

  /** Wins display (matches_won) */
  readonly wins = computed(() => this.matchesWon());

  /** Win Rate derived from matches_won and matches_played */
  readonly winRate = computed(() => {
    const played = this.matchesPlayed();
    if (played <= 0) return '0%';
    const won = this.matchesWon();
    return `${Math.round((won / played) * 100)}%`;
  });

  /** Coins display (coins formatted with comma) */
  readonly coins = computed(() => {
    return this.coinsCount().toLocaleString('en-US');
  });

  readonly xpRemaining = computed(() => {
    const remaining = this.targetXp() - this.currentXp();
    return remaining > 0 ? remaining : 0;
  });

  readonly xpProgressPercent = computed(() => {
    const pct = (this.currentXp() / this.targetXp()) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  });

  async ngOnInit(): Promise<void> {
    await this.fetchProfile();
  }

  async fetchProfile(): Promise<void> {
    let user = this.authService.currentUser();
    if (!user) {
      await this.authService.waitForAuthReady();
      user = this.authService.currentUser();
    }
    const client = this.authService.client;
    if (!user || !client) return;

    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('ProfileComponent: Could not fetch profile from Supabase', error.message);
        return;
      }

      if (data) {
        this.profile.set(data as ProfileRecord);

        // 1. username - username mapping
        if (data.username) {
          this.profileUsername.set(data.username);
        }

        // 2. Avatar_url with avatars present in the assets avatar folder
        if (data.avatar_url) {
          this.profileAvatarUrl.set(data.avatar_url);
        }

        // 3. Games Played - matches_played
        if (typeof data.matches_played === 'number') {
          this.matchesPlayed.set(data.matches_played);
        }

        // 4. wins - matches_won
        if (typeof data.matches_won === 'number') {
          this.matchesWon.set(data.matches_won);
        }

        // 5. coins - coins
        if (typeof data.coins === 'number') {
          this.coinsCount.set(data.coins);
        }

        // 6. joined date - created_date (or created_at)
        const createdDate = (data as any).created_date || data.created_at;
        if (createdDate) {
          this.profileCreatedAt.set(createdDate);
        }

        // 7. xp & level mapping
        if (typeof data.xp === 'number') {
          this.currentXp.set(data.xp);
        }
        if (typeof data.level === 'number') {
          this.userLevel.set(data.level);
          this.userRank.set(data.level > 1 ? `Level ${data.level}` : 'Rookie');
        }
      }
    } catch (err) {
      console.warn('ProfileComponent: Could not fetch profile from Supabase', err);
    }
  }

  // Navigation handlers
  goBack(): void {
    this.router.navigate(['/']);
  }

  setActiveTab(tab: 'home' | 'play' | 'leaderboard' | 'profile'): void {
    this.activeTab.set(tab);
    if (tab === 'home') {
      this.router.navigate(['/']);
    } else if (tab === 'play') {
      this.router.navigate(['/game']);
    } else if (tab === 'leaderboard') {
      this.router.navigate(['/leaderboard']);
    } else if (tab === 'profile') {
      if (!this.authService.isAuthenticated()) {
        this.router.navigate(['/guest-profile']);
      }
    }
  }

  // Name editing
  openEditName(): void {
    this.editNameInput.set(this.displayName());
    this.showEditNameModal.set(true);
  }

  closeEditName(): void {
    this.showEditNameModal.set(false);
  }

  async saveName(): Promise<void> {
    const trimmed = this.editNameInput().trim();
    if (trimmed && trimmed.length >= 3 && trimmed.length <= 20) {
      this.customName.set(trimmed);
      this.profileUsername.set(trimmed);
      const user = this.authService.currentUser();
      const client = this.authService.client;
      if (user && client) {
        try {
          await client.from('profiles').update({
            username: trimmed,
            updated_at: new Date().toISOString()
          }).eq('id', user.id);
        } catch (err) {
          console.warn('ProfileComponent: Could not persist username to Supabase', err);
        }
      }
    }
    this.closeEditName();
  }

  // Avatar choosing
  openAvatars(): void {
    this.showAvatarsModal.set(true);
  }

  closeAvatars(): void {
    this.showAvatarsModal.set(false);
  }

  async selectAvatar(avatar: AvatarOption): Promise<void> {
    if (avatar.unlocked) {
      this.selectedAvatarSrc.set(avatar.src);
      this.profileAvatarUrl.set(avatar.src);
      this.closeAvatars();
      const user = this.authService.currentUser();
      const client = this.authService.client;
      if (user && client) {
        try {
          await client.from('profiles').update({
            avatar_url: avatar.src,
            updated_at: new Date().toISOString()
          }).eq('id', user.id);
        } catch (err) {
          console.warn('ProfileComponent: Could not persist avatar to Supabase', err);
        }
      }
    }
  }

  // Modals for menu items
  openStatistics(): void {
    this.showStatsModal.set(true);
  }

  closeStatistics(): void {
    this.showStatsModal.set(false);
  }

  openAchievements(): void {
    this.showAchievementsModal.set(true);
  }

  closeAchievements(): void {
    this.showAchievementsModal.set(false);
  }

  openSettings(): void {
    this.showSettingsModal.set(true);
  }

  closeSettings(): void {
    this.showSettingsModal.set(false);
  }

  openRankInfo(): void {
    this.showRankModal.set(true);
  }

  closeRankInfo(): void {
    this.showRankModal.set(false);
  }

  openHelpRules(): void {
    this.router.navigate(['/how-to-play']);
  }

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch (err) {
      console.error('ProfileComponent: Sign-Out error', err);
    } finally {
      this.router.navigate(['/guest-profile']);
    }
  }
}

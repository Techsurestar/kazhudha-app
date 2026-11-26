import { Injectable, signal, computed, inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { createClient, SupabaseClient, User, Session, Subscription } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { resolveAvatarUrl } from '../utils/avatar.util';

export interface CachedProfile {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
}

export const PROFILE_CACHE_KEY = 'kazhudha_profile_cache';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private supabaseClient: SupabaseClient | null = null;
  private authSubscription: Subscription | null = null;

  /** Currently authenticated Supabase user */
  readonly currentUser = signal<User | null>(null);

  /** Active user profile loaded from Supabase profiles table or local cache */
  readonly userProfile = signal<CachedProfile | null>(null);

  /** Active Supabase session */
  readonly session = signal<Session | null>(null);

  /** Whether the initial auth state is loading */
  readonly isLoading = signal<boolean>(true);

  /** Whether a user is currently signed in */
  readonly isAuthenticated = computed(() => !!this.currentUser());

  /** Display name for the user (profiles table > default Player123, never Google info) */
  readonly displayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'Guest Player';

    // 1. Custom username from profiles table (cached or fetched)
    const profile = this.userProfile();
    if (profile && profile.id === user.id && profile.username && profile.username.trim()) {
      return profile.username.trim();
    }

    // Default in-game name (do NOT use Google metadata)
    return 'Player123';
  });

  /** Avatar image URL (profiles table > default avatar, never Google info) */
  readonly avatarUrl = computed(() => {
    const user = this.currentUser();
    if (!user) return '/avatar/guest_avatar.webp';

    // 1. Custom avatar from profiles table (cached or fetched)
    const profile = this.userProfile();
    if (profile && profile.id === user.id && profile.avatar_url && profile.avatar_url.trim()) {
      return resolveAvatarUrl(profile.avatar_url);
    }

    // Default logged-in game avatar (do NOT use Google metadata)
    return '/avatar/avatar.jpeg';
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Pre-load cached profile synchronously from localStorage
      const cached = this.loadCachedProfile();
      if (cached) {
        this.userProfile.set(cached);
      }

      this.supabaseClient = createClient(environment.supabase.url, environment.supabase.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce'
        }
      });

      this.initAuth();
    } else {
      this.isLoading.set(false);
    }
  }

  /**
   * Loads cached profile from localStorage synchronously.
   */
  loadCachedProfile(): CachedProfile | null {
    if (!isPlatformBrowser(this.platformId) || typeof localStorage === 'undefined') {
      return null;
    }
    try {
      const raw = localStorage.getItem(PROFILE_CACHE_KEY);
      if (raw) {
        return JSON.parse(raw) as CachedProfile;
      }
    } catch (e) {
      console.warn('AuthService: Failed to parse cached profile', e);
    }
    return null;
  }

  /**
   * Sets the user profile in signal and syncs with localStorage cache.
   */
  setProfile(profile: CachedProfile | null): void {
    this.userProfile.set(profile);
    if (isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined') {
      try {
        if (profile) {
          localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
        } else {
          localStorage.removeItem(PROFILE_CACHE_KEY);
        }
      } catch (e) {
        console.warn('AuthService: Failed to update profile cache', e);
      }
    }
  }

  /**
   * Clears the user profile cache from signal and localStorage.
   */
  clearProfileCache(): void {
    this.setProfile(null);
  }

  /**
   * Fetches the user profile from Supabase profiles table in the background.
   */
  async fetchProfile(): Promise<CachedProfile | null> {
    if (!this.supabaseClient) return null;
    const user = this.currentUser();
    if (!user) {
      this.clearProfileCache();
      return null;
    }

    try {
      const { data, error } = await this.supabaseClient
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        const profile: CachedProfile = {
          id: data.id || user.id,
          username: data.username,
          avatar_url: data.avatar_url
        };
        this.setProfile(profile);
        return profile;
      }
    } catch (err) {
      console.warn('AuthService: Failed to fetch profile from Supabase', err);
    }
    return this.userProfile();
  }

  /**
   * Initializes session retrieval and registers auth state change listener.
   */
  private async initAuth(): Promise<void> {
    if (!this.supabaseClient) return;

    try {
      // 1. Restore existing session if present
      const { data: { session } } = await this.supabaseClient.auth.getSession();
      this.session.set(session);
      const user = session?.user ?? null;
      this.currentUser.set(user);

      if (user) {
        const cached = this.loadCachedProfile();
        if (cached && cached.id === user.id) {
          this.userProfile.set(cached);
        } else {
          this.clearProfileCache();
        }
        // Background revalidation
        this.fetchProfile().catch(() => {});
      } else {
        this.clearProfileCache();
      }

      // 2. If OAuth returned code/state query parameters, clean them up from the URL bar
      if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
        this.router.navigate([], { replaceUrl: true, queryParams: {} });
      }

      // 3. Listen to auth state transitions
      const { data: { subscription } } = this.supabaseClient.auth.onAuthStateChange(
        (_event, newSession) => {
          this.session.set(newSession);
          const newUser = newSession?.user ?? null;
          this.currentUser.set(newUser);
          if (newUser) {
            const c = this.loadCachedProfile();
            if (c && c.id === newUser.id) {
              this.userProfile.set(c);
            }
            this.fetchProfile().catch(() => {});
          } else {
            this.clearProfileCache();
          }
          this.isLoading.set(false);
        }
      );
      this.authSubscription = subscription;
    } catch (err) {
      console.error('AuthService: Failed to restore session', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Ensures initial session check has completed before evaluating route guards.
   */
  async waitForAuthReady(): Promise<boolean> {
    if (!this.isLoading()) {
      return this.isAuthenticated();
    }
    if (this.supabaseClient) {
      try {
        const { data: { session } } = await this.supabaseClient.auth.getSession();
        this.session.set(session);
        this.currentUser.set(session?.user ?? null);
      } catch (err) {
        console.error('AuthService: waitForAuthReady error', err);
      } finally {
        this.isLoading.set(false);
      }
    }
    return this.isAuthenticated();
  }

  /**
   * Triggers Google OAuth sign-in flow via Supabase.
   */
  async signInWithGoogle(redirectTo?: string): Promise<void> {
    if (!this.supabaseClient) {
      throw new Error('Supabase client is not available');
    }

    const callbackUrl = redirectTo || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200');

    const { error } = await this.supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl
      }
    });

    if (error) {
      console.error('AuthService: Google Sign-In failed', error.message);
      throw error;
    }
  }

  /**
   * Signs the user out and clears local session state.
   */
  async signOut(): Promise<void> {
    try {
      if (this.supabaseClient) {
        const { error } = await this.supabaseClient.auth.signOut();
        if (error) {
          console.error('AuthService: Sign-Out failed', error.message);
          throw error;
        }
      }
    } finally {
      this.session.set(null);
      this.currentUser.set(null);
      this.clearProfileCache();
    }
  }

  /**
   * Returns the underlying SupabaseClient instance (if needed for database queries).
   */
  get client(): SupabaseClient | null {
    return this.supabaseClient;
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
      this.authSubscription = null;
    }
  }
}

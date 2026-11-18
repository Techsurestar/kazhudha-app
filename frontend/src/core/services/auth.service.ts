import { Injectable, signal, computed, inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { createClient, SupabaseClient, User, Session, Subscription } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

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

  /** Active Supabase session */
  readonly session = signal<Session | null>(null);

  /** Whether the initial auth state is loading */
  readonly isLoading = signal<boolean>(true);

  /** Whether a user is currently signed in */
  readonly isAuthenticated = computed(() => !!this.currentUser());

  /** Display name for the user (from Google user_metadata or email fallback) */
  readonly displayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'Guest Player';
    return (
      user.user_metadata?.['full_name'] ||
      user.user_metadata?.['name'] ||
      (user.email ? user.email.split('@')[0] : 'Player')
    );
  });

  /** Avatar image URL (Google profile picture or default guest avatar) */
  readonly avatarUrl = computed(() => {
    const user = this.currentUser();
    return (
      user?.user_metadata?.['avatar_url'] ||
      user?.user_metadata?.['picture'] ||
      '/avatar/guest_avatar.webp'
    );
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
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
   * Initializes session retrieval and registers auth state change listener.
   */
  private async initAuth(): Promise<void> {
    if (!this.supabaseClient) return;

    try {
      // 1. Restore existing session if present
      const { data: { session } } = await this.supabaseClient.auth.getSession();
      this.session.set(session);
      this.currentUser.set(session?.user ?? null);

      // 2. If OAuth returned code/state query parameters, clean them up from the URL bar
      if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
        this.router.navigate([], { replaceUrl: true, queryParams: {} });
      }

      // 3. Listen to auth state transitions
      const { data: { subscription } } = this.supabaseClient.auth.onAuthStateChange(
        (_event, newSession) => {
          this.session.set(newSession);
          this.currentUser.set(newSession?.user ?? null);
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

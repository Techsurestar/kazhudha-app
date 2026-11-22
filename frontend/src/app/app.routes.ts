import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { HomeComponent } from '../features/home/home.component';
import { HowToPlayComponent } from '../features/how-to-play/how-to-play.component';
import { CardTableComponent } from '../features/card-table/card-table.component';
import { GuestProfileComponent } from '../features/home/components/guest-profile/guest-profile.component';
import { ProfileComponent } from '../features/profile/profile.component';
import { LeaderboardComponent } from '../features/leaderboard/leaderboard.component';
import { AuthService } from '../core/services/auth.service';

/**
 * Route guard for /profile:
 * Unauthenticated or signed-out users are automatically redirected to /guest-profile.
 */
export const authProfileGuard = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.waitForAuthReady();
  if (!auth.isAuthenticated()) {
    return router.parseUrl('/guest-profile');
  }
  return true;
};

/**
 * Route guard for /guest-profile:
 * Authenticated users are automatically redirected to /profile.
 */
export const guestProfileGuard = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.waitForAuthReady();
  if (auth.isAuthenticated()) {
    return router.parseUrl('/profile');
  }
  return true;
};

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'game', component: CardTableComponent },
  { path: 'card-table', redirectTo: 'game', pathMatch: 'full' },
  { path: 'table', redirectTo: 'game', pathMatch: 'full' },
  { path: 'how-to-play', component: HowToPlayComponent },
  { path: 'leaderboard', component: LeaderboardComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [authProfileGuard] },
  { path: 'guest-profile', component: GuestProfileComponent, canActivate: [guestProfileGuard] }
];

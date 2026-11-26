import { Component, input, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { HomeIconComponent } from '../icon/home-icon.component';
import { GamepadIconComponent } from '../icon/gamepad-icon.component';
import { LeadboardIconComponent } from '../icon/leadboard-icon.component';
import { UserIconComponent } from '../icon/user-icon.component';

export type NavTab = 'home' | 'play' | 'leaderboard' | 'profile';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [
    CommonModule,
    HomeIconComponent,
    GamepadIconComponent,
    LeadboardIconComponent,
    UserIconComponent
  ],
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.css']
})
export class BottomNavComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  /** Optional override for the active tab (otherwise detected from router URL) */
  readonly activeTab = input<NavTab>();

  private readonly currentUrl = signal<string>(this.router.url);
  private navSub?: Subscription;

  ngOnInit(): void {
    this.currentUrl.set(this.router?.url || '/');
    if (this.router?.events) {
      this.navSub = this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe((event) => {
          this.currentUrl.set(event.urlAfterRedirects || event.url);
        });
    }
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  isTabActive(tab: NavTab): boolean {
    const override = this.activeTab();
    if (override) {
      return override === tab;
    }

    const url = this.currentUrl();
    switch (tab) {
      case 'home':
        return url === '/' || url === '';
      case 'play':
        return url.startsWith('/game') || url.startsWith('/table') || url.startsWith('/card-table');
      case 'leaderboard':
        return url.startsWith('/leaderboard');
      case 'profile':
        return url.startsWith('/profile') || url.startsWith('/guest-profile');
      default:
        return false;
    }
  }

  navigate(tab: NavTab): void {
    switch (tab) {
      case 'home':
        this.router.navigate(['/']);
        break;
      case 'play':
        this.router.navigate(['/game']);
        break;
      case 'leaderboard':
        this.router.navigate(['/leaderboard']);
        break;
      case 'profile':
        if (this.authService.isAuthenticated()) {
          this.router.navigate(['/profile']);
        } else {
          this.router.navigate(['/guest-profile']);
        }
        break;
    }
  }
}

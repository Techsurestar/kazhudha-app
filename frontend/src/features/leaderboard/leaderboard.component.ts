import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CrownIconComponent } from '../shared/icon/crown-icon.component';
import { InfoIconComponent } from '../shared/icon/info-icon.component';
import { LeaderboardAvatarComponent } from './components/leaderboard-avatar/leaderboard-avatar.component';
import { BottomNavComponent } from '../shared/bottom-nav/bottom-nav.component';
import { LeaderboardService } from './services/leaderboard.service';
import { AuthService } from '../../core/services/auth.service';
import type {
  LeaderboardPeriod,
  LeaderboardPlayer,
  LeaderboardPageResult,
} from './models/leaderboard.model';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [
    CommonModule,
    CrownIconComponent,
    InfoIconComponent,
    LeaderboardAvatarComponent,
    BottomNavComponent,
  ],
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly leaderboardService = inject(LeaderboardService);
  readonly authService = inject(AuthService);

  /** Active navigation tab ('leaderboard' is active by default) */
  readonly activeNavTab = signal<'home' | 'play' | 'leaderboard' | 'profile'>('leaderboard');

  /** Time filter selection ('all-time' | 'this-week' | 'this-month') */
  readonly selectedPeriod = signal<LeaderboardPeriod>('all-time');

  /** Current page in pagination (1 to 20) */
  readonly currentPage = signal<number>(1);

  /** Loading state indicator */
  readonly isLoading = signal<boolean>(false);

  /** Show Info/Rules Modal */
  readonly showInfoModal = signal<boolean>(false);

  /** Live dataset for selected period and page */
  readonly leaderboardData = signal<LeaderboardPageResult>(
    this.leaderboardService.getLeaderboardData('all-time', 1, 10)
  );

  /** Top 3 players on podium */
  readonly topThree = computed(() => this.leaderboardData().topThree);

  /** Rank 1, 2, 3 individual players */
  readonly rankOnePlayer = computed(() => this.topThree()[0] ?? null);
  readonly rankTwoPlayer = computed(() => this.topThree()[1] ?? null);
  readonly rankThreePlayer = computed(() => this.topThree()[2] ?? null);

  /** Players on the table list */
  readonly pagePlayers = computed(() => this.leaderboardData().pagePlayers);

  /** Current user row */
  readonly currentUser = computed(() => this.leaderboardData().currentUser);

  /** Visible pagination numbers */
  readonly paginationPages = [1, 2, 3, 4, 5];

  private fetchSub?: Subscription;

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.fetchSub?.unsubscribe();
  }

  /**
   * Fetches the latest leaderboard data from backend / database
   */
  public loadData(): void {
    this.isLoading.set(true);
    this.fetchSub?.unsubscribe();

    this.fetchSub = this.leaderboardService
      .fetchLeaderboard(this.selectedPeriod(), this.currentPage(), 10)
      .subscribe({
        next: (result) => {
          this.leaderboardData.set(result);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.warn('LeaderboardComponent: Error fetching data:', err);
          this.isLoading.set(false);
        },
      });
  }

  // Action methods
  setPeriod(period: LeaderboardPeriod): void {
    this.selectedPeriod.set(period);
    this.currentPage.set(1);
    this.loadData();
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.leaderboardData().totalPages) {
      this.currentPage.set(page);
      this.loadData();
    }
  }

  nextPage(): void {
    this.setPage(this.currentPage() + 1);
  }

  prevPage(): void {
    this.setPage(this.currentPage() - 1);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  openInfoModal(): void {
    this.showInfoModal.set(true);
  }

  closeInfoModal(): void {
    this.showInfoModal.set(false);
  }

  onNavTabClick(tab: 'home' | 'play' | 'leaderboard' | 'profile'): void {
    this.activeNavTab.set(tab);
    if (tab === 'home') {
      this.router.navigate(['/']);
    } else if (tab === 'play') {
      this.router.navigate(['/game']);
    } else if (tab === 'profile') {
      if (this.authService.isAuthenticated()) {
        this.router.navigate(['/profile']);
      } else {
        this.router.navigate(['/guest-profile']);
      }
    }
  }
}

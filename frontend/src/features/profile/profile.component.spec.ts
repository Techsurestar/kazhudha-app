import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { ProfileComponent, resolveAvatarUrl } from './profile.component';
import { AuthService } from '../../core/services/auth.service';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let router: Router;
  let mockAuthService: {
    isAuthenticated: any;
    displayName: any;
    avatarUrl: any;
    currentUser: any;
    client: any;
    waitForAuthReady?: any;
    signOut: any;
  };

  beforeEach(async () => {
    mockAuthService = {
      isAuthenticated: signal(false),
      displayName: signal('Guest Player'),
      avatarUrl: signal('/avatar/guest_avatar.webp'),
      currentUser: signal(null),
      client: null,
      waitForAuthReady: vi.fn().mockResolvedValue(true),
      signOut: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create ProfileComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should render header with title "Profile" and Kazhudha Club badge', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Profile');
    expect(el.querySelector('.kazhudha-header-badge')?.textContent).toContain('KAZHUDHA');
    expect(el.querySelector('.kazhudha-header-badge')?.textContent).toContain('CLUB');
  });

  it('should display default player name "Player123" and rank "Rookie"', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(component.displayName()).toBe('Player123');
    expect(el.textContent).toContain('Player123');
    expect(el.textContent).toContain('Rookie');
    expect(el.textContent).toContain('Joined Oct 27, 2026');
  });

  it('should reflect authenticated user display name when logged in', () => {
    mockAuthService.displayName.set('Alex Champion');
    fixture.detectChanges();

    expect(component.displayName()).toBe('Alex Champion');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Alex Champion');
  });

  it('should render 4 game statistics cards with initial values', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Games Played');
    expect(el.textContent).toContain('Wins');
    expect(el.textContent).toContain('Win Rate');
    expect(el.textContent).toContain('Coins');

    expect(component.gamesPlayed()).toBe(0);
    expect(component.wins()).toBe(0);
    expect(component.winRate()).toBe('0%');
    expect(component.coins()).toBe('0');
  });

  it('should integrate data from profiles table (matches_played, matches_won, derived winRate, coins, username, avatar_url, created_at)', async () => {
    const mockProfileData = {
      id: 'usr-123',
      username: 'LuckyDonkey',
      avatar_url: 'avatar.jpeg',
      matches_played: 12,
      matches_won: 7,
      coins: 2450,
      xp: 350,
      level: 1,
      created_at: '2026-10-27T10:00:00.000Z'
    };

    mockAuthService.currentUser.set({ id: 'usr-123' });
    mockAuthService.client = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: mockProfileData,
          error: null
        })
      })
    };

    await component.fetchProfile();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    // username mapping
    expect(component.displayName()).toBe('LuckyDonkey');
    expect(el.textContent).toContain('LuckyDonkey');

    // games played (matches_played)
    expect(component.gamesPlayed()).toBe(12);
    expect(el.textContent).toContain('12');

    // wins (matches_won)
    expect(component.wins()).toBe(7);
    expect(el.textContent).toContain('7');

    // win rate (derived: (7/12)*100 = 58%)
    expect(component.winRate()).toBe('58%');
    expect(el.textContent).toContain('58%');

    // coins (formatted with comma: 2,450)
    expect(component.coins()).toBe('2,450');
    expect(el.textContent).toContain('2,450');

    // avatar_url mapped to assets avatar folder
    expect(component.avatarUrl()).toBe('/avatar/avatar.jpeg');

    // joined date mapped from created_at
    expect(component.joinedDate()).toBe('Joined Oct 27, 2026');
    expect(el.textContent).toContain('Joined Oct 27, 2026');
  });

  it('should map created_date from profiles table if present', async () => {
    mockAuthService.currentUser.set({ id: 'usr-456' });
    mockAuthService.client = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'usr-456',
            username: 'ShadowNinja',
            created_date: '2026-11-05T08:30:00.000Z',
            matches_played: 20,
            matches_won: 15,
            coins: 10000
          },
          error: null
        })
      })
    };

    await component.fetchProfile();
    fixture.detectChanges();

    expect(component.displayName()).toBe('ShadowNinja');
    expect(component.joinedDate()).toBe('Joined Nov 5, 2026');
    expect(component.winRate()).toBe('75%');
    expect(component.coins()).toBe('10,000');
  });

  it('should resolve avatar URLs correctly for avatar folder assets and external URLs', () => {
    expect(resolveAvatarUrl('guest_avatar')).toBe('/avatar/guest_avatar.webp');
    expect(resolveAvatarUrl('guest_avatar.webp')).toBe('/avatar/guest_avatar.webp');
    expect(resolveAvatarUrl('/avatar/guest_avatar.webp')).toBe('/avatar/guest_avatar.webp');
    expect(resolveAvatarUrl('avatar.jpeg')).toBe('/avatar/avatar.jpeg');
    expect(resolveAvatarUrl('/avatar/avatar.jpeg')).toBe('/avatar/avatar.jpeg');
    expect(resolveAvatarUrl('https://example.com/pic.png')).toBe('https://example.com/pic.png');
    expect(resolveAvatarUrl(null)).toBe('/avatar/avatar.jpeg');
    expect(resolveAvatarUrl('')).toBe('/avatar/avatar.jpeg');
  });

  it('should persist updated username to Supabase profiles on saveName', async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });
    mockAuthService.currentUser.set({ id: 'usr-789' });
    mockAuthService.client = {
      from: vi.fn().mockReturnValue({
        update: updateSpy
      })
    };

    component.openEditName();
    component.editNameInput.set('CosmicAce');
    await component.saveName();

    expect(component.displayName()).toBe('CosmicAce');
    expect(mockAuthService.client.from).toHaveBeenCalledWith('profiles');
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      username: 'CosmicAce'
    }));
  });

  it('should persist selected avatar to Supabase profiles on selectAvatar', async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });
    mockAuthService.currentUser.set({ id: 'usr-789' });
    mockAuthService.client = {
      from: vi.fn().mockReturnValue({
        update: updateSpy
      })
    };

    const classic = component.availableAvatars().find(a => a.id === '2');
    if (classic) {
      await component.selectAvatar(classic);
      expect(component.avatarUrl()).toBe('/avatar/guest_avatar.webp');
      expect(mockAuthService.client.from).toHaveBeenCalledWith('profiles');
      expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
        avatar_url: '/avatar/guest_avatar.webp'
      }));
    }
  });

  it('should hide Rank Progress and menu list options by default for later release', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(component.showUpcomingFeatures()).toBe(false);
    expect(el.textContent).not.toContain('Rank Progress');
    expect(el.textContent).not.toContain('XP to reach Amateur');
    expect(el.textContent).not.toContain('My Avatars');
    expect(el.textContent).not.toContain('Statistics');
    expect(el.textContent).not.toContain('Achievements');
    expect(el.textContent).not.toContain('Game Settings');
    expect(el.textContent).not.toContain('Help & Rules');
  });

  it('should display Rank Progress and menu list options when showUpcomingFeatures is enabled', () => {
    component.showUpcomingFeatures.set(true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Rank Progress');
    expect(el.textContent).toContain('XP to reach Amateur');
    expect(el.textContent).toContain('My Avatars');
    expect(el.textContent).toContain('3 Unlocked');
    expect(el.textContent).toContain('Statistics');
    expect(el.textContent).toContain('Achievements');
    expect(el.textContent).toContain('Game Settings');
    expect(el.textContent).toContain('Help & Rules');
  });

  it('should render Sign Out button and call authService.signOut when clicked', async () => {
    const el = fixture.nativeElement as HTMLElement;
    const signOutBtn = el.querySelector('.signout-btn') as HTMLElement;
    expect(signOutBtn).toBeTruthy();
    expect(signOutBtn.textContent).toContain('Sign Out');

    signOutBtn.click();
    await fixture.whenStable();

    expect(mockAuthService.signOut).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/guest-profile']);
  });

  it('should navigate to home when back arrow is clicked', () => {
    component.goBack();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should navigate to rules when Help & Rules is clicked', () => {
    component.openHelpRules();
    expect(router.navigate).toHaveBeenCalledWith(['/how-to-play']);
  });

  it('should navigate to game when Play tab is clicked in bottom navigation', () => {
    component.setActiveTab('play');
    expect(router.navigate).toHaveBeenCalledWith(['/game']);
  });

  it('should open and close Edit Name modal', () => {
    component.openEditName();
    expect(component.showEditNameModal()).toBe(true);

    component.editNameInput.set('DonkeyKing99');
    component.saveName();

    expect(component.showEditNameModal()).toBe(false);
    expect(component.displayName()).toBe('DonkeyKing99');
  });

  it('should open and close Avatars modal and allow picking an unlocked avatar', () => {
    component.openAvatars();
    expect(component.showAvatarsModal()).toBe(true);

    const classic = component.availableAvatars().find(a => a.id === '2');
    if (classic) {
      component.selectAvatar(classic);
      expect(component.avatarUrl()).toBe('/avatar/guest_avatar.webp');
    }

    expect(component.showAvatarsModal()).toBe(false);
  });
});

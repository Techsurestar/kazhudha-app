import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeProfileMetaComponent } from './home-profile-meta.component';
import { Component, signal } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';

describe('HomeProfileMetaComponent', () => {
  let component: HomeProfileMetaComponent;
  let fixture: ComponentFixture<HomeProfileMetaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeProfileMetaComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeProfileMetaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the HomeProfileMetaComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should render default profile info matching guest mode', () => {
    const el = fixture.nativeElement as HTMLElement;

    const nameEl = el.querySelector('.profile-player-name');
    expect(nameEl?.textContent?.trim()).toBe('Guest Player');

    const badgeEl = el.querySelector('.mode-badge-pill');
    expect(badgeEl?.textContent?.trim()).toContain('Guest Mode');

    const subtitleEl = el.querySelector('.profile-subtitle');
    expect(subtitleEl?.textContent?.trim()).toBe("You're playing as a guest");

    const imgEl = el.querySelector('.avatar-gold-ring img') as HTMLImageElement;
    expect(imgEl).not.toBeNull();
    expect(imgEl.getAttribute('src')).toBe('/avatar/guest_avatar.webp');
    expect(imgEl.getAttribute('alt')).toBe('Guest Player Avatar');
  });

  it('should render custom player info when inputs are provided', () => {
    fixture.componentRef.setInput('playerName', 'Ace Donkey');
    fixture.componentRef.setInput('badgeText', 'VIP Member');
    fixture.componentRef.setInput('subtitle', 'Ready for high stakes');
    fixture.componentRef.setInput('avatarSrc', '/avatar/custom.webp');
    fixture.componentRef.setInput('avatarAlt', 'Ace Donkey Avatar');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.profile-player-name')?.textContent?.trim()).toBe('Ace Donkey');
    expect(el.querySelector('.mode-badge-pill')?.textContent?.trim()).toContain('VIP Member');
    expect(el.querySelector('.profile-subtitle')?.textContent?.trim()).toBe('Ready for high stakes');

    const imgEl = el.querySelector('.avatar-gold-ring img') as HTMLImageElement;
    expect(imgEl.getAttribute('src')).toBe('/avatar/custom.webp');
    expect(imgEl.getAttribute('alt')).toBe('Ace Donkey Avatar');
  });

  it('should accept alternate input aliases name, mode, statusText, and avatarUrl', () => {
    fixture.componentRef.setInput('name', 'Lucky Player');
    fixture.componentRef.setInput('mode', 'Tournament Mode');
    fixture.componentRef.setInput('statusText', 'Competing in Finals');
    fixture.componentRef.setInput('avatarUrl', '/avatar/tournament.webp');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.profile-player-name')?.textContent?.trim()).toBe('Lucky Player');
    expect(el.querySelector('.mode-badge-pill')?.textContent?.trim()).toContain('Tournament Mode');
    expect(el.querySelector('.profile-subtitle')?.textContent?.trim()).toBe('Competing in Finals');

    const imgEl = el.querySelector('.avatar-gold-ring img') as HTMLImageElement;
    expect(imgEl.getAttribute('src')).toBe('/avatar/tournament.webp');
  });

  it('should emit profileClick when the card is clicked', () => {
    let clicked = false;
    component.profileClick.subscribe(() => {
      clicked = true;
    });

    const card = fixture.nativeElement.querySelector('.home-profile-meta') as HTMLElement;
    card.click();
    expect(clicked).toBe(true);
  });

  it('should emit avatarClick and profileClick when avatar is clicked', () => {
    let avatarClicked = false;
    let profileClicked = false;

    component.avatarClick.subscribe(() => {
      avatarClicked = true;
    });
    component.profileClick.subscribe(() => {
      profileClicked = true;
    });

    const avatarRing = fixture.nativeElement.querySelector('.avatar-gold-ring') as HTMLElement;
    avatarRing.click();
    expect(avatarClicked).toBe(true);
    expect(profileClicked).toBe(true);
  });

  it('should emit badgeClick when the mode badge pill is clicked', () => {
    let badgeClicked = false;
    component.badgeClick.subscribe(() => {
      badgeClicked = true;
    });

    const badge = fixture.nativeElement.querySelector('.mode-badge-pill') as HTMLElement;
    badge.click();
    expect(badgeClicked).toBe(true);
  });

  it('should fallback to assets/app-logo.png if avatar image fails to load', () => {
    const imgEl = fixture.nativeElement.querySelector('.avatar-gold-ring img') as HTMLImageElement;
    const errorEvent = new Event('error');
    imgEl.dispatchEvent(errorEvent);

    expect(imgEl.src).toContain('assets/app-logo.png');
  });

  describe('when user is logged in', () => {
    let loggedInFixture: ComponentFixture<HomeProfileMetaComponent>;
    let loggedInComponent: HomeProfileMetaComponent;
    let mockAuthService: {
      isAuthenticated: any;
      displayName: any;
      avatarUrl: any;
      currentUser: any;
      client: any;
      waitForAuthReady?: any;
    };

    beforeEach(async () => {
      mockAuthService = {
        isAuthenticated: signal(true),
        displayName: signal('Google Name'),
        avatarUrl: signal('/avatar/guest_avatar.webp'),
        currentUser: signal({ id: 'user-abc-123' }),
        client: {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                username: 'GoldenFalcon99',
                avatar_url: 'avatar.jpeg'
              },
              error: null
            })
          })
        },
        waitForAuthReady: vi.fn().mockResolvedValue(true)
      };

      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [HomeProfileMetaComponent],
        providers: [
          { provide: AuthService, useValue: mockAuthService }
        ]
      }).compileComponents();

      loggedInFixture = TestBed.createComponent(HomeProfileMetaComponent);
      loggedInComponent = loggedInFixture.componentInstance;
      await loggedInComponent.fetchProfile();
      loggedInFixture.detectChanges();
    });

    it('should wire player name to username in profiles table', () => {
      const el = loggedInFixture.nativeElement as HTMLElement;
      expect(loggedInComponent.displayName()).toBe('GoldenFalcon99');
      expect(el.querySelector('.profile-player-name')?.textContent?.trim()).toBe('GoldenFalcon99');
    });

    it('should wire avatar to avatar_url in profiles table and resolve via avatar folder', () => {
      const el = loggedInFixture.nativeElement as HTMLElement;
      expect(loggedInComponent.displayAvatarSrc()).toBe('/avatar/avatar.jpeg');
      const img = el.querySelector('.avatar-gold-ring img') as HTMLImageElement;
      expect(img.getAttribute('src')).toBe('/avatar/avatar.jpeg');
      expect(img.getAttribute('alt')).toBe('GoldenFalcon99 Avatar');
    });

    it('should fall back to Player123 if profiles table has no custom username and never use Google name', async () => {
      mockAuthService.client.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { username: '', avatar_url: null },
          error: null
        })
      });
      loggedInComponent.profileUsername.set('');
      await loggedInComponent.fetchProfile();
      loggedInFixture.detectChanges();

      expect(loggedInComponent.displayName()).toBe('Player123');
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { GuestProfileComponent } from './guest-profile.component';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

describe('GuestProfileComponent', () => {
  let component: GuestProfileComponent;
  let fixture: ComponentFixture<GuestProfileComponent>;
  let routerSpy: { navigate: any };

  beforeEach(async () => {
    routerSpy = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [GuestProfileComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: signal(false),
            displayName: signal('Guest Player'),
            avatarUrl: signal('/avatar/guest_avatar.webp'),
            currentUser: signal(null),
            client: null,
            signInWithGoogle: vi.fn().mockResolvedValue(undefined),
            signOut: vi.fn().mockResolvedValue(undefined)
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GuestProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the GuestProfileComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should not render the Kazhudha Club badge or header button', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.kazhudha-header-badge')).toBeNull();
    expect(el.querySelector('header button')).toBeNull();
    expect(el.querySelector('h1')).toBeNull();
  });

  it('should render the HomeProfileMetaComponent displaying guest info', () => {
    const el = fixture.nativeElement as HTMLElement;
    const metaEl = el.querySelector('app-home-profile-meta');
    expect(metaEl).not.toBeNull();
    expect(metaEl?.textContent).toContain('Guest Player');
    expect(metaEl?.textContent).toContain('Guest Mode');
  });

  it('should render comparison table matching the comparison card design', () => {
    const el = fixture.nativeElement as HTMLElement;

    // Header & Table title
    expect(el.textContent).toContain('Guest vs');
    expect(el.textContent).toContain('Free Account');
    expect(el.textContent).toContain('GUEST');
    expect(el.textContent).toContain('FREE ACCOUNT');

    // Feature rows
    expect(el.textContent).toContain('XP Progress');
    expect(el.querySelector('img[src*="xp_shield.webp"]')).not.toBeNull();
    expect(el.textContent).toContain('Coin Rewards');
    expect(el.textContent).toContain('Leaderboard');
    expect(el.textContent).toContain('Track Progress');
    expect(el.textContent).toContain('Achievements');
    expect(el.textContent).toContain('Royal Avatars');

    // Bottom banner text
    expect(el.textContent).toContain('Create a free account to');
    expect(el.textContent).toContain('unlock all benefits!');
  });

  it('should render exclusive avatars row and bottom banner reward cluster with glow', () => {
    const el = fixture.nativeElement as HTMLElement;
    const exclusiveAvatarImg = el.querySelector('img[src*="exclusive_avatars.webp"]');
    expect(exclusiveAvatarImg).not.toBeNull();

    // Bottom banner reward cluster
    const cluster = el.querySelector('.reward-cluster-wrapper');
    expect(cluster).not.toBeNull();
    const glowBg = el.querySelector('.reward-cluster-glow-bg');
    expect(glowBg).not.toBeNull();

    const trophyImg = el.querySelector('img.reward-trophy-icon');
    expect(trophyImg).not.toBeNull();
    expect((trophyImg as HTMLImageElement).getAttribute('src')).toContain('trophy.webp');

    const coinImg = el.querySelector('img[src*="mini-coin-bundle.webp"]');
    expect(coinImg).not.toBeNull();

    const xpWithLaurelImg = el.querySelector('img[src*="xp_with_laurel.webp"]');
    expect(xpWithLaurelImg).not.toBeNull();
  });

  it('should render action buttons for Google and Play as Guest', () => {
    const el = fixture.nativeElement as HTMLElement;
    const googleBtn = el.querySelector('.google-btn');
    const emailBtn = el.querySelector('.email-pill-btn');

    expect(googleBtn?.textContent).toContain('Continue with Google');
    expect(emailBtn).toBeNull();
    expect(el.textContent).not.toContain('Continue with Email');
    expect(el.textContent).not.toContain('Maybe Later');
    expect(el.textContent).toContain('Play as Guest');
  });

  it('should emit continueWithGoogle when Google button is clicked', () => {
    let emitted = false;
    component.continueWithGoogle.subscribe(() => { emitted = true; });

    const googleBtn = (fixture.nativeElement.querySelector('.google-btn button') || fixture.nativeElement.querySelector('.google-btn')) as HTMLElement;
    googleBtn.click();
    expect(emitted).toBe(true);
  });

  it('should emit playAsGuest and navigate to game when Play as Guest is clicked', () => {
    let played = false;
    component.playAsGuest.subscribe(() => { played = true; });

    component.onPlayAsGuest();
    expect(played).toBe(true);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/game']);
  });

  it('should render the bottom navigation component', () => {
    const el = fixture.nativeElement as HTMLElement;
    const navEl = el.querySelector('app-bottom-nav');
    expect(navEl).not.toBeNull();
  });

  it('should respect custom playerName and avatarSrc inputs', () => {
    fixture.componentRef.setInput('playerName', 'VIP Guest');
    fixture.componentRef.setInput('avatarSrc', '/avatar/custom.webp');
    fixture.detectChanges();

    const metaEl = fixture.nativeElement.querySelector('app-home-profile-meta');
    expect(metaEl?.textContent).toContain('VIP Guest');
  });
});

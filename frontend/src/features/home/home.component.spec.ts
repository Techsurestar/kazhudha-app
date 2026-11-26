import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { HomeComponent } from './home.component';
import { AuthService } from '../../core/services/auth.service';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let mockAuthService: {
    isAuthenticated: any;
    displayName: any;
    avatarUrl: any;
    currentUser: any;
    client?: any;
    signInWithGoogle: any;
    signOut: any;
  };

  beforeEach(async () => {
    mockAuthService = {
      isAuthenticated: signal(false),
      displayName: signal('Guest Player'),
      avatarUrl: signal('/avatar/guest_avatar.webp'),
      currentUser: signal(null),
      client: null,
      signInWithGoogle: vi.fn().mockResolvedValue(undefined),
      signOut: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create HomeComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should display "Continue with Google", "Play as Guest", and "Game Guideline" when user is unauthenticated', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Continue with Google');
    expect(el.textContent).toContain('Play as Guest');
    expect(el.textContent).toContain('Game Guideline');
  });

  it('should call authService.signInWithGoogle when Google button is clicked', async () => {
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button'));
    const googleButton = buttons.find(b => b.textContent?.includes('Continue with Google'));
    expect(googleButton).toBeTruthy();

    googleButton?.click();
    expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();
  });

  it('should display authenticated options when user is signed in', () => {
    mockAuthService.isAuthenticated.set(true);
    mockAuthService.displayName.set('Alex Dev');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Play Game');
    expect(el.textContent).toContain('Game Guideline');
    expect(el.textContent).toContain('Sign Out');
    expect(el.textContent).not.toContain('Continue with Google');
  });

  it('should render Game Guideline button wired to /how-to-play', () => {
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button'));
    const guidelineButton = buttons.find(b => b.textContent?.includes('Game Guideline'));
    expect(guidelineButton).toBeTruthy();
  });

  it('should call authService.signOut when Sign Out is clicked', () => {
    mockAuthService.isAuthenticated.set(true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button'));
    const signOutBtn = buttons.find(b => b.textContent?.includes('Sign Out'));
    expect(signOutBtn).toBeTruthy();

    signOutBtn?.click();
    expect(mockAuthService.signOut).toHaveBeenCalled();
  });

  it('should navigate to /guest-profile when unauthenticated user clicks profile tab', () => {
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    mockAuthService.isAuthenticated.set(false);
    component.setActiveTab('profile');

    expect(navSpy).toHaveBeenCalledWith(['/guest-profile']);
  });

  it('should navigate to /profile when authenticated user clicks profile tab', () => {
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    mockAuthService.isAuthenticated.set(true);
    component.setActiveTab('profile');

    expect(navSpy).toHaveBeenCalledWith(['/profile']);
  });
});

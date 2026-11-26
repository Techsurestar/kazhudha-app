import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BottomNavComponent } from './bottom-nav.component';
import { AuthService } from '../../../core/services/auth.service';
import { signal } from '@angular/core';

describe('BottomNavComponent', () => {
  let component: BottomNavComponent;
  let fixture: ComponentFixture<BottomNavComponent>;
  let routerSpy: { navigate: any; url: string; events: any };
  let authServiceMock: { isAuthenticated: any };

  beforeEach(async () => {
    routerSpy = {
      navigate: vi.fn(),
      url: '/',
      events: {
        pipe: vi.fn().mockReturnValue({
          subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() })
        })
      }
    };

    authServiceMock = {
      isAuthenticated: signal(false)
    };

    await TestBed.configureTestingModule({
      imports: [BottomNavComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: authServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the BottomNavComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to / when Home tab is clicked', () => {
    component.navigate('home');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should navigate to /game when Play tab is clicked', () => {
    component.navigate('play');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/game']);
  });

  it('should navigate to /leaderboard when Leaderboard tab is clicked', () => {
    component.navigate('leaderboard');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/leaderboard']);
  });

  it('should navigate to /guest-profile when Profile tab is clicked by unauthenticated user', () => {
    authServiceMock.isAuthenticated.set(false);
    component.navigate('profile');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/guest-profile']);
  });

  it('should navigate to /profile when Profile tab is clicked by authenticated user', () => {
    authServiceMock.isAuthenticated.set(true);
    component.navigate('profile');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/profile']);
  });

  it('should respect activeTab input override when provided', () => {
    fixture.componentRef.setInput('activeTab', 'leaderboard');
    expect(component.isTabActive('leaderboard')).toBe(true);
    expect(component.isTabActive('home')).toBe(false);
  });
});

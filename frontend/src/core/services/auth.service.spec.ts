import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { AuthService } from './auth.service';
import type { User } from '@supabase/supabase-js';

describe('AuthService', () => {
  let service: AuthService;
  let mockRouter: { navigate: any };

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true)
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Router, useValue: mockRouter },
        { provide: PLATFORM_ID, useValue: 'server' }
      ]
    });

    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have unauthenticated default state', () => {
    expect(service.currentUser()).toBeNull();
    expect(service.session()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.displayName()).toBe('Guest Player');
    expect(service.avatarUrl()).toBe('/avatar/guest_avatar.webp');
  });

  it('should compute displayName and avatarUrl when a user is set', () => {
    const mockUser: Partial<User> = {
      id: 'test-user-id',
      email: 'alex@example.com',
      user_metadata: {
        full_name: 'Alex Johnson',
        avatar_url: 'https://lh3.googleusercontent.com/test-pic'
      }
    };

    service.currentUser.set(mockUser as User);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.displayName()).toBe('Alex Johnson');
    expect(service.avatarUrl()).toBe('https://lh3.googleusercontent.com/test-pic');
  });

  it('should fallback to email prefix if full_name is not present', () => {
    const mockUser: Partial<User> = {
      id: 'test-user-id',
      email: 'player42@gmail.com',
      user_metadata: {}
    };

    service.currentUser.set(mockUser as User);

    expect(service.displayName()).toBe('player42');
  });

  it('should reset state on signOut', async () => {
    const mockUser: Partial<User> = { id: '123', email: 'test@example.com' };
    service.currentUser.set(mockUser as User);

    // Stub client.auth.signOut if client exists
    if (service.client) {
      vi.spyOn(service.client.auth, 'signOut').mockResolvedValue({ error: null });
    }

    await service.signOut();

    expect(service.currentUser()).toBeNull();
    expect(service.session()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});


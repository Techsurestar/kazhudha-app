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

  it('should compute default in-game displayName and avatarUrl when a user is set without Google metadata', () => {
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
    // Never uses Google full_name or Google avatarUrl
    expect(service.displayName()).toBe('Player123');
    expect(service.avatarUrl()).toBe('/avatar/avatar.jpeg');
  });

  it('should use custom profile username and avatar when setProfile is called', () => {
    const mockUser: Partial<User> = {
      id: 'test-user-id',
      email: 'player42@gmail.com',
      user_metadata: {
        full_name: 'Google Name',
        avatar_url: 'https://lh3.googleusercontent.com/google-photo'
      }
    };

    service.currentUser.set(mockUser as User);
    service.setProfile({
      id: 'test-user-id',
      username: 'DonkeyChamp',
      avatar_url: 'avatar.jpeg'
    });

    expect(service.displayName()).toBe('DonkeyChamp');
    expect(service.avatarUrl()).toBe('/avatar/avatar.jpeg');
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
    expect(service.userProfile()).toBeNull();
  });

  it('should prioritize custom profile from profiles table over Google metadata', () => {
    const mockUser: Partial<User> = {
      id: 'test-user-id',
      email: 'alex@example.com',
      user_metadata: {
        full_name: 'Google Alex',
        avatar_url: 'https://lh3.googleusercontent.com/google-pic'
      }
    };

    service.currentUser.set(mockUser as User);
    service.setProfile({
      id: 'test-user-id',
      username: 'DonkeyChamp',
      avatar_url: 'avatar.jpeg'
    });

    expect(service.displayName()).toBe('DonkeyChamp');
    expect(service.avatarUrl()).toBe('/avatar/avatar.jpeg');
  });

  it('should clear profile cache on clearProfileCache', () => {
    service.setProfile({
      id: 'usr-1',
      username: 'TestUser',
      avatar_url: 'avatar.jpeg'
    });
    expect(service.userProfile()).not.toBeNull();

    service.clearProfileCache();
    expect(service.userProfile()).toBeNull();
  });
});


import { describe, it, expect, vi } from 'vitest';
import { createAuthMiddleware, type AuthRequest } from '../middleware/auth.middleware.js';

describe('createAuthMiddleware', () => {
  it('should verify valid bearer token and set req.user', async () => {
    const mockUser = {
      id: 'valid-user-uuid',
      email: 'player@example.com',
      user_metadata: { full_name: 'Super Player' },
    };

    const mockSupabase: any = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    };

    const middleware = createAuthMiddleware(mockSupabase);
    const req: Partial<AuthRequest> = {
      headers: { authorization: 'Bearer test-valid-jwt-token' },
    };
    const res: any = {};
    const next = vi.fn();

    await middleware(req as AuthRequest, res, next);

    expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('test-valid-jwt-token');
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });

  it('should set req.user = null when no authorization header is passed', async () => {
    const mockSupabase: any = {
      auth: {
        getUser: vi.fn(),
      },
    };

    const middleware = createAuthMiddleware(mockSupabase);
    const req: Partial<AuthRequest> = {
      headers: {},
    };
    const res: any = {};
    const next = vi.fn();

    await middleware(req as AuthRequest, res, next);

    expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
  });

  it('should set req.user = null when token is invalid or verification errors', async () => {
    const mockSupabase: any = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Invalid JWT token'),
        }),
      },
    };

    const middleware = createAuthMiddleware(mockSupabase);
    const req: Partial<AuthRequest> = {
      headers: { authorization: 'Bearer invalid-token' },
    };
    const res: any = {};
    const next = vi.fn();

    await middleware(req as AuthRequest, res, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
  });
});

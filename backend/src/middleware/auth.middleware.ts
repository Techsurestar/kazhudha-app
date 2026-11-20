import type { Request, Response, NextFunction } from 'express';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../config/supabase.js';

export interface AuthRequest extends Request {
  user?: User | null;
}

/**
 * Middleware that validates the Supabase JWT token from the Authorization header.
 *
 * - If a valid Bearer token is provided: sets `req.user` to the cryptographically verified Supabase User.
 * - If no token or invalid token: sets `req.user = null` (Guest Mode).
 *
 * This ensures that `userId` can NEVER be forged or spoofed by client JSON payloads.
 */
export function createAuthMiddleware(supabaseClient?: SupabaseClient) {
  const supabase = supabaseClient ?? getSupabaseClient();

  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();

      if (token) {
        try {
          const { data, error } = await supabase.auth.getUser(token);
          if (!error && data?.user) {
            req.user = data.user;
            return next();
          }
        } catch (err) {
          console.warn('Auth token verification exception:', err);
        }
      }
    }

    req.user = null;
    next();
  };
}

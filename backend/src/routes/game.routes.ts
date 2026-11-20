import { Router } from 'express';
import { GameController } from '../controllers/game.controller.js';
import {
  createAuthMiddleware,
  type AuthRequest,
} from '../middleware/auth.middleware.js';

export function createGameRoutes(
  gameController: GameController,
  authMiddleware = createAuthMiddleware()
): Router {
  const router = Router();
  router.use(authMiddleware);

  const handleStart = async (req: any, res: any, next: any) => {
    try {
      const sessionId =
        (req.query.sessionId as string) || req.body?.sessionId || 'default';

      // Securely extract verified user from JWT token (cannot be spoofed)
      const verifiedUser = (req as AuthRequest).user;

      const userMetadata = {
        // Authenticated user ID is strictly derived from the verified token
        userId: verifiedUser ? verifiedUser.id : undefined,
        displayName:
          verifiedUser?.user_metadata?.full_name ||
          verifiedUser?.user_metadata?.name ||
          req.body?.displayName ||
          (verifiedUser?.email ? verifiedUser.email.split('@')[0] : 'Player 1 (You)'),
        avatarUrl:
          verifiedUser?.user_metadata?.avatar_url ||
          verifiedUser?.user_metadata?.picture ||
          req.body?.avatarUrl,
      };

      const view = await gameController.startGame(sessionId, userMetadata);
      res.json(view);
    } catch (err) {
      next(err);
    }
  };

  router.get('/start', handleStart);
  router.post('/start', handleStart);

  router.post('/play', async (req: any, res: any, next: any) => {
    try {
      const sessionId =
        (req.query.sessionId as string) || req.body?.sessionId || 'default';
      const view = await gameController.playCard(sessionId, req.body);
      res.json(view);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

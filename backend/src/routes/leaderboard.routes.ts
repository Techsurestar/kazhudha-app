import { Router } from 'express';
import { LeaderboardController } from '../controllers/leaderboard.controller.js';
import {
  createAuthMiddleware,
} from '../middleware/auth.middleware.js';

export function createLeaderboardRoutes(
  leaderboardController: LeaderboardController,
  authMiddleware = createAuthMiddleware()
): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/', leaderboardController.getLeaderboard);

  return router;
}

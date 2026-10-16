import { Router } from 'express';
import { GameController } from '../controllers/game.controller.js';

export function createGameRoutes(gameController: GameController): Router {
  const router = Router();

  const handleStart = (req: any, res: any, next: any) => {
    try {
      const sessionId = (req.query.sessionId as string) || 'default';
      const view = gameController.startGame(sessionId);
      res.json(view);
    } catch (err) {
      next(err);
    }
  };

  router.get('/start', handleStart);
  router.post('/start', handleStart);

  router.post('/play', (req: any, res: any, next: any) => {
    try {
      const sessionId = (req.query.sessionId as string) || 'default';
      const view = gameController.playCard(sessionId, req.body);
      res.json(view);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

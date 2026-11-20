import express from 'express';
import cors from 'cors';
import { GameController } from './controllers/game.controller.js';
import { LeaderboardController } from './controllers/leaderboard.controller.js';
import { createGameRoutes } from './routes/game.routes.js';
import { createLeaderboardRoutes } from './routes/leaderboard.routes.js';
import { errorHandler } from './middleware/error-handler.js';

export const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const gameController = new GameController();
const leaderboardController = new LeaderboardController();

app.use('/api/game', createGameRoutes(gameController));
app.use('/api/leaderboard', createLeaderboardRoutes(leaderboardController));
app.use('/api/game/leaderboard', createLeaderboardRoutes(leaderboardController));

app.use(errorHandler);

const host = process.env.HOST || '127.0.0.1';

if (process.env.NODE_ENV !== 'test') {
  app.listen(Number(port), host, () => {
    console.log(`Kazhudha backend listening at http://${host}:${port}`);
  });
}

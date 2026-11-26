import express from 'express';
import cors from 'cors';
import { GameController } from './controllers/game.controller.js';
import { LeaderboardController } from './controllers/leaderboard.controller.js';
import { createGameRoutes } from './routes/game.routes.js';
import { createLeaderboardRoutes } from './routes/leaderboard.routes.js';
import { createHealthRoutes } from './routes/health.routes.js';
import { errorHandler } from './middleware/error-handler.js';

export const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Public health check routes (for Render health probes, uptime monitors, and keep-warm cron jobs)
const healthRoutes = createHealthRoutes();
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/healthz', healthRoutes);
app.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Kazhudha backend is running',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    service: 'kazhudha-backend',
  });
});

const gameController = new GameController();
const leaderboardController = new LeaderboardController();

app.use('/api/game', createGameRoutes(gameController));
app.use('/api/leaderboard', createLeaderboardRoutes(leaderboardController));
app.use('/api/game/leaderboard', createLeaderboardRoutes(leaderboardController));

app.use(errorHandler);

const host = process.env.HOST || '0.0.0.0';

if (process.env.NODE_ENV !== 'test') {
  app.listen(Number(port), host, () => {
    console.log(`Kazhudha backend listening at http://${host}:${port}`);
  });
}

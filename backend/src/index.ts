import express from 'express';
import cors from 'cors';
import { GameController } from './controllers/game.controller.js';
import { createGameRoutes } from './routes/game.routes.js';
import { errorHandler } from './middleware/error-handler.js';

export const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const gameController = new GameController();
app.use('/api/game', createGameRoutes(gameController));

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Kazhudha backend listening at http://localhost:${port}`);
  });
}

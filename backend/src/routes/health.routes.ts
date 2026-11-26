import { Router, Request, Response } from 'express';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  service: string;
}

/**
 * Creates and returns the health check router.
 * Used by Render health probes, uptime monitors, and cron jobs to keep the backend warm and prevent cold starts.
 */
export function createHealthRoutes(): Router {
  const router = Router();

  const handleHealth = (_req: Request, res: Response) => {
    const payload: HealthCheckResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      service: 'kazhudha-backend',
    };

    res.status(200).json(payload);
  };

  router.get('/', handleHealth);
  router.get('/health', handleHealth);
  router.get('/healthz', handleHealth);

  return router;
}

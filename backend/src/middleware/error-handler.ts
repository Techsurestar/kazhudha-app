import type { Request, Response, NextFunction } from 'express';
import { InvalidMoveException, SessionNotFoundException, BusinessException } from '@kazhudha/shared';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (
    err instanceof InvalidMoveException ||
    err instanceof BusinessException ||
    err instanceof SessionNotFoundException
  ) {
    res.status(400).json({ error: err.message });
    return;
  }

  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
}

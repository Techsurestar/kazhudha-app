import type { Request, Response, NextFunction } from 'express';
import { LeaderboardBackendService, type LeaderboardPeriod } from '../services/leaderboard.service.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';

export class LeaderboardController {
  private readonly leaderboardService: LeaderboardBackendService;

  constructor(leaderboardService?: LeaderboardBackendService) {
    this.leaderboardService = leaderboardService ?? new LeaderboardBackendService();
  }

  public getLeaderboard = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const period = (req.query.period as LeaderboardPeriod) || 'all-time';
      const page = parseInt((req.query.page as string) || '1', 10);
      const pageSize = parseInt((req.query.pageSize as string) || '10', 10);

      const verifiedUser = (req as AuthRequest).user;
      const requestUserId = verifiedUser?.id;
      const requestDisplayName =
        verifiedUser?.user_metadata?.full_name ||
        verifiedUser?.user_metadata?.name ||
        (verifiedUser?.email ? verifiedUser.email.split('@')[0] : undefined);
      const requestAvatarUrl =
        verifiedUser?.user_metadata?.avatar_url ||
        verifiedUser?.user_metadata?.picture;

      const result = await this.leaderboardService.getLeaderboard(
        period,
        isNaN(page) ? 1 : page,
        isNaN(pageSize) ? 10 : pageSize,
        requestUserId,
        requestDisplayName,
        requestAvatarUrl
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

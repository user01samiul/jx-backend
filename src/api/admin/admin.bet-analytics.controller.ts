import { Request, Response, NextFunction } from "express";
import {
  getBetStatisticsService,
  getBetAnalyticsService,
  getGamePerformanceService,
  getResultsDistributionService,
  getProviderPerformanceService
} from "../../services/admin/admin.bet-analytics.service";

/**
 * GET /api/admin/bets/statistics
 * Get aggregated betting statistics for dashboard cards
 */
export const getBetStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const timeRange = (req.query.timeRange as string) || '7d';

    // Validate timeRange
    const validTimeRanges = ['24h', '7d', '30d', '90d', 'all'];
    if (!validTimeRanges.includes(timeRange)) {
      res.status(400).json({
        success: false,
        message: `Invalid timeRange. Must be one of: ${validTimeRanges.join(', ')}`
      });
      return;
    }

    const statistics = await getBetStatisticsService(timeRange);

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('[getBetStatistics] Error:', error);
    next(error);
  }
};

/**
 * GET /api/admin/bets/analytics
 * Get daily time-series data for analytics charts
 */
export const getBetAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const timeRange = (req.query.timeRange as string) || '7d';
    const groupBy = (req.query.groupBy as string) || 'day';

    // Validate timeRange
    const validTimeRanges = ['7d', '30d', '90d'];
    if (!validTimeRanges.includes(timeRange)) {
      res.status(400).json({
        success: false,
        message: `Invalid timeRange. Must be one of: ${validTimeRanges.join(', ')}`
      });
      return;
    }

    // Validate groupBy
    const validGroupBy = ['hour', 'day', 'week', 'month'];
    if (!validGroupBy.includes(groupBy)) {
      res.status(400).json({
        success: false,
        message: `Invalid groupBy. Must be one of: ${validGroupBy.join(', ')}`
      });
      return;
    }

    const analytics = await getBetAnalyticsService(timeRange, groupBy);

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('[getBetAnalytics] Error:', error);
    next(error);
  }
};

/**
 * GET /api/admin/bets/game-performance
 * Get performance metrics grouped by game
 */
export const getGamePerformance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const timeRange = (req.query.timeRange as string) || '7d';
    const limit = parseInt(req.query.limit as string) || 10;

    // Validate timeRange
    const validTimeRanges = ['24h', '7d', '30d', '90d', 'all'];
    if (!validTimeRanges.includes(timeRange)) {
      res.status(400).json({
        success: false,
        message: `Invalid timeRange. Must be one of: ${validTimeRanges.join(', ')}`
      });
      return;
    }

    // Validate limit
    if (limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 100'
      });
      return;
    }

    const performance = await getGamePerformanceService(timeRange, limit);

    res.status(200).json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('[getGamePerformance] Error:', error);
    next(error);
  }
};

/**
 * GET /api/admin/bets/results-distribution
 * Get win/loss distribution for pie chart
 */
export const getResultsDistribution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const timeRange = (req.query.timeRange as string) || '7d';

    // Validate timeRange
    const validTimeRanges = ['24h', '7d', '30d', '90d', 'all'];
    if (!validTimeRanges.includes(timeRange)) {
      res.status(400).json({
        success: false,
        message: `Invalid timeRange. Must be one of: ${validTimeRanges.join(', ')}`
      });
      return;
    }

    const distribution = await getResultsDistributionService(timeRange);

    res.status(200).json({
      success: true,
      data: distribution
    });
  } catch (error) {
    console.error('[getResultsDistribution] Error:', error);
    next(error);
  }
};

/**
 * GET /api/admin/bets/provider-performance
 * Get performance metrics grouped by provider (bonus endpoint)
 */
export const getProviderPerformance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const timeRange = (req.query.timeRange as string) || '7d';
    const limit = parseInt(req.query.limit as string) || 10;

    // Validate timeRange
    const validTimeRanges = ['24h', '7d', '30d', '90d', 'all'];
    if (!validTimeRanges.includes(timeRange)) {
      res.status(400).json({
        success: false,
        message: `Invalid timeRange. Must be one of: ${validTimeRanges.join(', ')}`
      });
      return;
    }

    // Validate limit
    if (limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 100'
      });
      return;
    }

    const performance = await getProviderPerformanceService(timeRange, limit);

    res.status(200).json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('[getProviderPerformance] Error:', error);
    next(error);
  }
};

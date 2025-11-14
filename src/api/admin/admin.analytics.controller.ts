/**
 * Advanced Analytics Controller
 * Handles player behavior, RFM segmentation, and churn prediction endpoints
 */

import { Request, Response } from 'express';
import { PlayerBehaviorService } from '../../services/analytics/player-behavior.service';
import { RFMSegmentationService } from '../../services/analytics/rfm-segmentation.service';
import { ChurnPredictionService } from '../../services/analytics/churn-prediction.service';

// =====================================================
// PLAYER BEHAVIOR ENDPOINTS
// =====================================================

/**
 * Get player behavior overview
 * GET /api/admin/analytics/player-behavior/:user_id
 */
export const getPlayerBehavior = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.user_id);
    const days = parseInt(req.query.days as string) || 30;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const behavior = await PlayerBehaviorService.getPlayerBehavior(userId, days);

    res.status(200).json({
      success: true,
      data: behavior
    });
  } catch (error: any) {
    console.error('Error fetching player behavior:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch player behavior'
    });
  }
};

/**
 * Calculate behavior scores for a player
 * POST /api/admin/analytics/player-behavior/:user_id/calculate
 */
export const calculateBehaviorScores = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.user_id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const scores = await PlayerBehaviorService.calculateBehaviorScores(userId);

    res.status(200).json({
      success: true,
      data: scores
    });
  } catch (error: any) {
    console.error('Error calculating behavior scores:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate behavior scores'
    });
  }
};

/**
 * Get top players by engagement
 * GET /api/admin/analytics/player-behavior/top-engaged
 */
export const getTopEngagedPlayers = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const players = await PlayerBehaviorService.getTopPlayersByEngagement(limit);

    res.status(200).json({
      success: true,
      data: players
    });
  } catch (error: any) {
    console.error('Error fetching top engaged players:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch top engaged players'
    });
  }
};

/**
 * Get session heatmap
 * GET /api/admin/analytics/player-behavior/heatmap
 */
export const getSessionHeatmap = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const heatmap = await PlayerBehaviorService.getSessionHeatmap(days);

    res.status(200).json({
      success: true,
      data: heatmap
    });
  } catch (error: any) {
    console.error('Error fetching session heatmap:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch session heatmap'
    });
  }
};

// =====================================================
// RFM SEGMENTATION ENDPOINTS
// =====================================================

/**
 * Get RFM segments overview
 * GET /api/admin/analytics/rfm/segments
 */
export const getRFMSegments = async (req: Request, res: Response) => {
  try {
    const segments = await RFMSegmentationService.getSegmentDefinitionsWithCounts();

    res.status(200).json({
      success: true,
      data: segments
    });
  } catch (error: any) {
    console.error('Error fetching RFM segments:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch RFM segments'
    });
  }
};

/**
 * Get users by segment
 * GET /api/admin/analytics/rfm/segments/:segment/users
 */
export const getUsersBySegment = async (req: Request, res: Response) => {
  try {
    const segment = req.params.segment;
    const limit = parseInt(req.query.limit as string) || 100;

    const users = await RFMSegmentationService.getUsersBySegment(segment, limit);

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error: any) {
    console.error('Error fetching users by segment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch users by segment'
    });
  }
};

/**
 * Recalculate RFM scores for all users
 * POST /api/admin/analytics/rfm/recalculate
 */
export const recalculateRFM = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.body.days as string) || 90;

    const result = await RFMSegmentationService.recalculateAll(days);

    res.status(200).json({
      success: true,
      message: 'RFM segmentation recalculated successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Error recalculating RFM:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to recalculate RFM'
    });
  }
};

/**
 * Get segment health score
 * GET /api/admin/analytics/rfm/health
 */
export const getRFMHealthScore = async (req: Request, res: Response) => {
  try {
    const health = await RFMSegmentationService.getSegmentHealthScore();

    res.status(200).json({
      success: true,
      data: health
    });
  } catch (error: any) {
    console.error('Error fetching RFM health score:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch RFM health score'
    });
  }
};

// =====================================================
// CHURN PREDICTION ENDPOINTS
// =====================================================

/**
 * Get churn prediction for a user
 * GET /api/admin/analytics/churn/prediction/:user_id
 */
export const getChurnPrediction = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.user_id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const prediction = await ChurnPredictionService.calculateChurnScore(userId);

    res.status(200).json({
      success: true,
      data: prediction
    });
  } catch (error: any) {
    console.error('Error fetching churn prediction:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch churn prediction'
    });
  }
};

/**
 * Get high-risk users
 * GET /api/admin/analytics/churn/high-risk
 */
export const getHighRiskUsers = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const users = await ChurnPredictionService.getHighRiskUsers(limit);

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error: any) {
    console.error('Error fetching high-risk users:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch high-risk users'
    });
  }
};

/**
 * Get churn statistics
 * GET /api/admin/analytics/churn/statistics
 */
export const getChurnStatistics = async (req: Request, res: Response) => {
  try {
    const stats = await ChurnPredictionService.getChurnStatistics();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error fetching churn statistics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch churn statistics'
    });
  }
};

/**
 * Run churn prediction workflow
 * POST /api/admin/analytics/churn/run-workflow
 */
export const runChurnPredictionWorkflow = async (req: Request, res: Response) => {
  try {
    const result = await ChurnPredictionService.runChurnPredictionWorkflow();

    res.status(200).json({
      success: true,
      message: 'Churn prediction workflow completed successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Error running churn prediction workflow:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to run churn prediction workflow'
    });
  }
};

// =====================================================
// SESSION TRACKING ENDPOINTS
// =====================================================

/**
 * Start a new session (for frontend tracking)
 * POST /api/analytics/session/start
 */
export const startSession = async (req: Request, res: Response) => {
  try {
    const { user_id, device_type, ip_address, country_code } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const sessionId = await PlayerBehaviorService.startSession({
      user_id,
      session_id: req.body.session_id,
      device_type,
      ip_address: ip_address || req.ip,
      country_code
    });

    res.status(200).json({
      success: true,
      data: { session_id: sessionId }
    });
  } catch (error: any) {
    console.error('Error starting session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to start session'
    });
  }
};

/**
 * End a session (for frontend tracking)
 * POST /api/analytics/session/end
 */
export const endSession = async (req: Request, res: Response) => {
  try {
    const { session_id, total_bets, total_wins, games_played } = req.body;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    await PlayerBehaviorService.endSession(session_id, {
      total_bets,
      total_wins,
      games_played
    });

    res.status(200).json({
      success: true,
      message: 'Session ended successfully'
    });
  } catch (error: any) {
    console.error('Error ending session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to end session'
    });
  }
};

/**
 * Track a player event (for frontend tracking)
 * POST /api/analytics/event/track
 */
export const trackEvent = async (req: Request, res: Response) => {
  try {
    const { user_id, event_type, event_data, session_id, device_type } = req.body;

    if (!user_id || !event_type || !session_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID, event type, and session ID are required'
      });
    }

    await PlayerBehaviorService.trackEvent({
      user_id,
      event_type,
      event_data,
      session_id,
      device_type,
      ip_address: req.ip,
      country_code: req.body.country_code
    });

    res.status(200).json({
      success: true,
      message: 'Event tracked successfully'
    });
  } catch (error: any) {
    console.error('Error tracking event:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to track event'
    });
  }
};

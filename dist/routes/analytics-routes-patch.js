/**
 * Advanced Analytics Routes - Add these to admin.routes.ts after line 2997
 *
 * Import statement to add at the top:
 * import {
 *   getPlayerBehavior,
 *   calculateBehaviorScores,
 *   getTopEngagedPlayers,
 *   getSessionHeatmap,
 *   getRFMSegments,
 *   getUsersBySegment,
 *   recalculateRFM,
 *   getRFMHealthScore,
 *   getChurnPrediction,
 *   getHighRiskUsers,
 *   getChurnStatistics,
 *   runChurnPredictionWorkflow,
 *   startSession,
 *   endSession,
 *   trackEvent
 * } from '../api/admin/admin.analytics.controller';
 */
// =====================================================
// ADVANCED ANALYTICS ROUTES
// =====================================================
// Player Behavior Analytics
/**
 * @swagger
 * /api/admin/analytics/player-behavior/{user_id}:
 *   get:
 *     summary: Get player behavior overview
 *     tags: [Analytics]
 */
router.get("/analytics/player-behavior/:user_id", getPlayerBehavior);
/**
 * @swagger
 * /api/admin/analytics/player-behavior/{user_id}/calculate:
 *   post:
 *     summary: Calculate behavior scores for a player
 *     tags: [Analytics]
 */
router.post("/analytics/player-behavior/:user_id/calculate", calculateBehaviorScores);
/**
 * @swagger
 * /api/admin/analytics/player-behavior/top-engaged:
 *   get:
 *     summary: Get top engaged players
 *     tags: [Analytics]
 */
router.get("/analytics/player-behavior/top-engaged", getTopEngagedPlayers);
/**
 * @swagger
 * /api/admin/analytics/player-behavior/heatmap:
 *   get:
 *     summary: Get session activity heatmap
 *     tags: [Analytics]
 */
router.get("/analytics/player-behavior/heatmap", getSessionHeatmap);
// RFM Segmentation
/**
 * @swagger
 * /api/admin/analytics/rfm/segments:
 *   get:
 *     summary: Get RFM segments overview
 *     tags: [Analytics]
 */
router.get("/analytics/rfm/segments", getRFMSegments);
/**
 * @swagger
 * /api/admin/analytics/rfm/segments/{segment}/users:
 *   get:
 *     summary: Get users by RFM segment
 *     tags: [Analytics]
 */
router.get("/analytics/rfm/segments/:segment/users", getUsersBySegment);
/**
 * @swagger
 * /api/admin/analytics/rfm/recalculate:
 *   post:
 *     summary: Recalculate RFM scores for all users
 *     tags: [Analytics]
 */
router.post("/analytics/rfm/recalculate", recalculateRFM);
/**
 * @swagger
 * /api/admin/analytics/rfm/health:
 *   get:
 *     summary: Get segment health score
 *     tags: [Analytics]
 */
router.get("/analytics/rfm/health", getRFMHealthScore);
// Churn Prediction
/**
 * @swagger
 * /api/admin/analytics/churn/prediction/{user_id}:
 *   get:
 *     summary: Get churn prediction for a user
 *     tags: [Analytics]
 */
router.get("/analytics/churn/prediction/:user_id", getChurnPrediction);
/**
 * @swagger
 * /api/admin/analytics/churn/high-risk:
 *   get:
 *     summary: Get high-risk users (churn prediction)
 *     tags: [Analytics]
 */
router.get("/analytics/churn/high-risk", getHighRiskUsers);
/**
 * @swagger
 * /api/admin/analytics/churn/statistics:
 *   get:
 *     summary: Get churn statistics
 *     tags: [Analytics]
 */
router.get("/analytics/churn/statistics", getChurnStatistics);
/**
 * @swagger
 * /api/admin/analytics/churn/run-workflow:
 *   post:
 *     summary: Run churn prediction workflow
 *     tags: [Analytics]
 */
router.post("/analytics/churn/run-workflow", runChurnPredictionWorkflow);
// Session Tracking (for frontend)
/**
 * @swagger
 * /api/analytics/session/start:
 *   post:
 *     summary: Start a new player session
 *     tags: [Analytics, Tracking]
 */
router.post("/analytics/session/start", startSession);
/**
 * @swagger
 * /api/analytics/session/end:
 *   post:
 *     summary: End a player session
 *     tags: [Analytics, Tracking]
 */
router.post("/analytics/session/end", endSession);
/**
 * @swagger
 * /api/analytics/event/track:
 *   post:
 *     summary: Track a player event
 *     tags: [Analytics, Tracking]
 */
router.post("/analytics/event/track", trackEvent);

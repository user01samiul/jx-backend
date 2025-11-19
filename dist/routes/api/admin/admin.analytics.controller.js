"use strict";
/**
 * Advanced Analytics Controller
 * Handles player behavior, RFM segmentation, and churn prediction endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackEvent = exports.endSession = exports.startSession = exports.runChurnPredictionWorkflow = exports.getChurnStatistics = exports.getHighRiskUsers = exports.getChurnPrediction = exports.getRFMHealthScore = exports.recalculateRFM = exports.getUsersBySegment = exports.getRFMSegments = exports.getSessionHeatmap = exports.getTopEngagedPlayers = exports.calculateBehaviorScores = exports.getPlayerBehavior = void 0;
const player_behavior_service_1 = require("../../services/analytics/player-behavior.service");
const rfm_segmentation_service_1 = require("../../services/analytics/rfm-segmentation.service");
const churn_prediction_service_1 = require("../../services/analytics/churn-prediction.service");
// =====================================================
// PLAYER BEHAVIOR ENDPOINTS
// =====================================================
/**
 * Get player behavior overview
 * GET /api/admin/analytics/player-behavior/:user_id
 */
const getPlayerBehavior = async (req, res) => {
    try {
        const userId = parseInt(req.params.user_id);
        const days = parseInt(req.query.days) || 30;
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }
        const behavior = await player_behavior_service_1.PlayerBehaviorService.getPlayerBehavior(userId, days);
        res.status(200).json({
            success: true,
            data: behavior
        });
    }
    catch (error) {
        console.error('Error fetching player behavior:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch player behavior'
        });
    }
};
exports.getPlayerBehavior = getPlayerBehavior;
/**
 * Calculate behavior scores for a player
 * POST /api/admin/analytics/player-behavior/:user_id/calculate
 */
const calculateBehaviorScores = async (req, res) => {
    try {
        const userId = parseInt(req.params.user_id);
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }
        const scores = await player_behavior_service_1.PlayerBehaviorService.calculateBehaviorScores(userId);
        res.status(200).json({
            success: true,
            data: scores
        });
    }
    catch (error) {
        console.error('Error calculating behavior scores:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to calculate behavior scores'
        });
    }
};
exports.calculateBehaviorScores = calculateBehaviorScores;
/**
 * Get top players by engagement
 * GET /api/admin/analytics/player-behavior/top-engaged
 */
const getTopEngagedPlayers = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const players = await player_behavior_service_1.PlayerBehaviorService.getTopPlayersByEngagement(limit);
        res.status(200).json({
            success: true,
            data: players
        });
    }
    catch (error) {
        console.error('Error fetching top engaged players:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch top engaged players'
        });
    }
};
exports.getTopEngagedPlayers = getTopEngagedPlayers;
/**
 * Get session heatmap
 * GET /api/admin/analytics/player-behavior/heatmap
 */
const getSessionHeatmap = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const heatmap = await player_behavior_service_1.PlayerBehaviorService.getSessionHeatmap(days);
        res.status(200).json({
            success: true,
            data: heatmap
        });
    }
    catch (error) {
        console.error('Error fetching session heatmap:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch session heatmap'
        });
    }
};
exports.getSessionHeatmap = getSessionHeatmap;
// =====================================================
// RFM SEGMENTATION ENDPOINTS
// =====================================================
/**
 * Get RFM segments overview
 * GET /api/admin/analytics/rfm/segments
 */
const getRFMSegments = async (req, res) => {
    try {
        const segments = await rfm_segmentation_service_1.RFMSegmentationService.getSegmentDefinitionsWithCounts();
        res.status(200).json({
            success: true,
            data: segments
        });
    }
    catch (error) {
        console.error('Error fetching RFM segments:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch RFM segments'
        });
    }
};
exports.getRFMSegments = getRFMSegments;
/**
 * Get users by segment
 * GET /api/admin/analytics/rfm/segments/:segment/users
 */
const getUsersBySegment = async (req, res) => {
    try {
        const segment = req.params.segment;
        const limit = parseInt(req.query.limit) || 100;
        const users = await rfm_segmentation_service_1.RFMSegmentationService.getUsersBySegment(segment, limit);
        res.status(200).json({
            success: true,
            data: users
        });
    }
    catch (error) {
        console.error('Error fetching users by segment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch users by segment'
        });
    }
};
exports.getUsersBySegment = getUsersBySegment;
/**
 * Recalculate RFM scores for all users
 * POST /api/admin/analytics/rfm/recalculate
 */
const recalculateRFM = async (req, res) => {
    try {
        const days = parseInt(req.body.days) || 90;
        const result = await rfm_segmentation_service_1.RFMSegmentationService.recalculateAll(days);
        res.status(200).json({
            success: true,
            message: 'RFM segmentation recalculated successfully',
            data: result
        });
    }
    catch (error) {
        console.error('Error recalculating RFM:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to recalculate RFM'
        });
    }
};
exports.recalculateRFM = recalculateRFM;
/**
 * Get segment health score
 * GET /api/admin/analytics/rfm/health
 */
const getRFMHealthScore = async (req, res) => {
    try {
        const health = await rfm_segmentation_service_1.RFMSegmentationService.getSegmentHealthScore();
        res.status(200).json({
            success: true,
            data: health
        });
    }
    catch (error) {
        console.error('Error fetching RFM health score:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch RFM health score'
        });
    }
};
exports.getRFMHealthScore = getRFMHealthScore;
// =====================================================
// CHURN PREDICTION ENDPOINTS
// =====================================================
/**
 * Get churn prediction for a user
 * GET /api/admin/analytics/churn/prediction/:user_id
 */
const getChurnPrediction = async (req, res) => {
    try {
        const userId = parseInt(req.params.user_id);
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }
        const prediction = await churn_prediction_service_1.ChurnPredictionService.calculateChurnScore(userId);
        res.status(200).json({
            success: true,
            data: prediction
        });
    }
    catch (error) {
        console.error('Error fetching churn prediction:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch churn prediction'
        });
    }
};
exports.getChurnPrediction = getChurnPrediction;
/**
 * Get high-risk users
 * GET /api/admin/analytics/churn/high-risk
 */
const getHighRiskUsers = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const users = await churn_prediction_service_1.ChurnPredictionService.getHighRiskUsers(limit);
        res.status(200).json({
            success: true,
            data: users
        });
    }
    catch (error) {
        console.error('Error fetching high-risk users:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch high-risk users'
        });
    }
};
exports.getHighRiskUsers = getHighRiskUsers;
/**
 * Get churn statistics
 * GET /api/admin/analytics/churn/statistics
 */
const getChurnStatistics = async (req, res) => {
    try {
        const stats = await churn_prediction_service_1.ChurnPredictionService.getChurnStatistics();
        res.status(200).json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error fetching churn statistics:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch churn statistics'
        });
    }
};
exports.getChurnStatistics = getChurnStatistics;
/**
 * Run churn prediction workflow
 * POST /api/admin/analytics/churn/run-workflow
 */
const runChurnPredictionWorkflow = async (req, res) => {
    try {
        const result = await churn_prediction_service_1.ChurnPredictionService.runChurnPredictionWorkflow();
        res.status(200).json({
            success: true,
            message: 'Churn prediction workflow completed successfully',
            data: result
        });
    }
    catch (error) {
        console.error('Error running churn prediction workflow:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to run churn prediction workflow'
        });
    }
};
exports.runChurnPredictionWorkflow = runChurnPredictionWorkflow;
// =====================================================
// SESSION TRACKING ENDPOINTS
// =====================================================
/**
 * Start a new session (for frontend tracking)
 * POST /api/analytics/session/start
 */
const startSession = async (req, res) => {
    try {
        const { user_id, device_type, ip_address, country_code } = req.body;
        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        const sessionId = await player_behavior_service_1.PlayerBehaviorService.startSession({
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
    }
    catch (error) {
        console.error('Error starting session:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to start session'
        });
    }
};
exports.startSession = startSession;
/**
 * End a session (for frontend tracking)
 * POST /api/analytics/session/end
 */
const endSession = async (req, res) => {
    try {
        const { session_id, total_bets, total_wins, games_played } = req.body;
        if (!session_id) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }
        await player_behavior_service_1.PlayerBehaviorService.endSession(session_id, {
            total_bets,
            total_wins,
            games_played
        });
        res.status(200).json({
            success: true,
            message: 'Session ended successfully'
        });
    }
    catch (error) {
        console.error('Error ending session:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to end session'
        });
    }
};
exports.endSession = endSession;
/**
 * Track a player event (for frontend tracking)
 * POST /api/analytics/event/track
 */
const trackEvent = async (req, res) => {
    try {
        const { user_id, event_type, event_data, session_id, device_type } = req.body;
        if (!user_id || !event_type || !session_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID, event type, and session ID are required'
            });
        }
        await player_behavior_service_1.PlayerBehaviorService.trackEvent({
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
    }
    catch (error) {
        console.error('Error tracking event:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to track event'
        });
    }
};
exports.trackEvent = trackEvent;

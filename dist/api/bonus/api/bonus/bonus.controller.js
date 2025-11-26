"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableBonuses = exports.getMyCombinedBalance = exports.getMyBonusStats = exports.getMyBonusTransactions = exports.getMyWageringProgress = exports.getMyBonusWallet = exports.getMyActiveBonuses = exports.getMyBonuses = exports.applyBonusCode = exports.getGameContribution = exports.setGameContribution = exports.forfeitBonusAdmin = exports.getPlayerBonusesAdmin = exports.getBonusStatistics = exports.grantManualBonus = exports.deleteBonusPlan = exports.getBonusPlans = exports.getBonusPlan = exports.updateBonusPlan = exports.createBonusPlan = void 0;
const bonus_plan_service_1 = require("../../services/bonus/bonus-plan.service");
const bonus_instance_service_1 = require("../../services/bonus/bonus-instance.service");
const bonus_wallet_service_1 = require("../../services/bonus/bonus-wallet.service");
const wagering_engine_service_1 = require("../../services/bonus/wagering-engine.service");
const bonus_transaction_service_1 = require("../../services/bonus/bonus-transaction.service");
const bonus_engine_service_1 = require("../../services/bonus/bonus-engine.service");
// =====================================================
// ADMIN CONTROLLERS - Bonus Plan Management
// =====================================================
const createBonusPlan = async (req, res, next) => {
    try {
        const planData = req.validated?.body;
        const adminUserId = req.user?.userId || 1;
        const plan = await bonus_plan_service_1.BonusPlanService.createPlan(planData, adminUserId);
        res.status(201).json({
            success: true,
            message: 'Bonus plan created successfully',
            data: plan
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.createBonusPlan = createBonusPlan;
const updateBonusPlan = async (req, res, next) => {
    try {
        const planId = parseInt(req.params.id);
        const updates = req.validated?.body;
        const adminUserId = req.user?.userId || 1;
        const plan = await bonus_plan_service_1.BonusPlanService.updatePlan(planId, updates, adminUserId);
        res.status(200).json({
            success: true,
            message: 'Bonus plan updated successfully',
            data: plan
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.updateBonusPlan = updateBonusPlan;
const getBonusPlan = async (req, res, next) => {
    try {
        const planId = parseInt(req.params.id);
        const plan = await bonus_plan_service_1.BonusPlanService.getPlanById(planId);
        if (!plan) {
            res.status(404).json({
                success: false,
                message: 'Bonus plan not found'
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: plan
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getBonusPlan = getBonusPlan;
const getBonusPlans = async (req, res, next) => {
    try {
        const filters = req.validated?.query || {};
        const result = await bonus_plan_service_1.BonusPlanService.getPlans(filters);
        res.status(200).json({
            success: true,
            data: result.plans,
            pagination: {
                total: result.total,
                limit: filters.limit || 50,
                offset: filters.offset || 0
            }
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getBonusPlans = getBonusPlans;
const deleteBonusPlan = async (req, res, next) => {
    try {
        const planId = parseInt(req.params.id);
        const adminUserId = req.user?.userId || 1;
        await bonus_plan_service_1.BonusPlanService.deletePlan(planId, adminUserId);
        res.status(200).json({
            success: true,
            message: 'Bonus plan deleted successfully'
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.deleteBonusPlan = deleteBonusPlan;
const grantManualBonus = async (req, res, next) => {
    try {
        const data = req.validated?.body;
        const adminUserId = req.user?.userId || 1;
        const bonusInstance = await bonus_instance_service_1.BonusInstanceService.grantManualBonus(data.player_id, data.bonus_plan_id, data.custom_amount || null, data.notes, adminUserId);
        res.status(201).json({
            success: true,
            message: 'Manual bonus granted successfully',
            data: bonusInstance
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.grantManualBonus = grantManualBonus;
// =====================================================
// ADMIN CONTROLLERS - Statistics & Reports
// =====================================================
const getBonusStatistics = async (req, res, next) => {
    try {
        const stats = await bonus_engine_service_1.BonusEngineService.getStatistics();
        res.status(200).json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getBonusStatistics = getBonusStatistics;
const getPlayerBonusesAdmin = async (req, res, next) => {
    try {
        const playerId = parseInt(req.params.playerId);
        const options = req.query;
        const result = await bonus_instance_service_1.BonusInstanceService.getPlayerBonuses(playerId, options);
        res.status(200).json({
            success: true,
            data: result.bonuses,
            pagination: {
                total: result.total,
                limit: options.limit || 50,
                offset: options.offset || 0
            }
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getPlayerBonusesAdmin = getPlayerBonusesAdmin;
const forfeitBonusAdmin = async (req, res, next) => {
    try {
        const bonusInstanceId = parseInt(req.params.id);
        const { reason } = req.validated?.body || { reason: 'Admin action' };
        await bonus_instance_service_1.BonusInstanceService.forfeitBonus(bonusInstanceId, reason);
        res.status(200).json({
            success: true,
            message: 'Bonus forfeited successfully'
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.forfeitBonusAdmin = forfeitBonusAdmin;
// =====================================================
// ADMIN CONTROLLERS - Game Contributions
// =====================================================
const setGameContribution = async (req, res, next) => {
    try {
        const data = req.validated?.body;
        await wagering_engine_service_1.WageringEngineService.setGameContribution(data.game_id, data.contribution_percentage, data.is_restricted || false);
        res.status(200).json({
            success: true,
            message: 'Game contribution updated successfully'
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.setGameContribution = setGameContribution;
const getGameContribution = async (req, res, next) => {
    try {
        const gameId = parseInt(req.params.gameId);
        const contribution = await wagering_engine_service_1.WageringEngineService.getGameContribution(gameId);
        res.status(200).json({
            success: true,
            data: contribution
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getGameContribution = getGameContribution;
// =====================================================
// USER CONTROLLERS - Bonus Management
// =====================================================
const applyBonusCode = async (req, res, next) => {
    try {
        const playerId = req.user?.userId;
        const { code } = req.validated?.body;
        const bonusInstance = await bonus_instance_service_1.BonusInstanceService.grantCodedBonus(playerId, code);
        res.status(201).json({
            success: true,
            message: 'Bonus code applied successfully',
            data: bonusInstance
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.applyBonusCode = applyBonusCode;
const getMyBonuses = async (req, res, next) => {
    try {
        const playerId = req.user?.userId;
        const options = req.validated?.query || {};
        const result = await bonus_instance_service_1.BonusInstanceService.getPlayerBonuses(playerId, options);
        res.status(200).json({
            success: true,
            data: result.bonuses,
            pagination: {
                total: result.total,
                limit: options.limit || 50,
                offset: options.offset || 0
            }
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getMyBonuses = getMyBonuses;
const getMyActiveBonuses = async (req, res, next) => {
    try {
        const playerId = req.user?.userId;
        const bonuses = await bonus_instance_service_1.BonusInstanceService.getPlayerActiveBonuses(playerId);
        res.status(200).json({
            success: true,
            data: bonuses
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getMyActiveBonuses = getMyActiveBonuses;
const getMyBonusWallet = async (req, res, next) => {
    try {
        const playerId = req.user?.userId;
        const wallet = await bonus_wallet_service_1.BonusWalletService.getBalance(playerId);
        res.status(200).json({
            success: true,
            data: wallet
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getMyBonusWallet = getMyBonusWallet;
const getMyWageringProgress = async (req, res, next) => {
    try {
        const playerId = req.user?.userId;
        const progress = await wagering_engine_service_1.WageringEngineService.getPlayerActiveProgress(playerId);
        res.status(200).json({
            success: true,
            data: progress
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getMyWageringProgress = getMyWageringProgress;
const getMyBonusTransactions = async (req, res, next) => {
    try {
        const playerId = req.user?.userId;
        const options = req.query;
        const result = await bonus_transaction_service_1.BonusTransactionService.getPlayerTransactions(playerId, options);
        res.status(200).json({
            success: true,
            data: result.transactions,
            pagination: {
                total: result.total,
                limit: options.limit || 50,
                offset: options.offset || 0
            }
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getMyBonusTransactions = getMyBonusTransactions;
const getMyBonusStats = async (req, res, next) => {
    try {
        const playerId = req.user?.userId;
        const stats = await bonus_transaction_service_1.BonusTransactionService.getPlayerStats(playerId);
        res.status(200).json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getMyBonusStats = getMyBonusStats;
const getMyCombinedBalance = async (req, res, next) => {
    try {
        const playerId = req.user?.userId;
        const balance = await bonus_engine_service_1.BonusEngineService.getCombinedBalance(playerId);
        res.status(200).json({
            success: true,
            data: balance
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getMyCombinedBalance = getMyCombinedBalance;
const getAvailableBonuses = async (req, res, next) => {
    try {
        // Get all active bonus plans (ONLY bonus-related types, NOT promotions)
        const result = await bonus_plan_service_1.BonusPlanService.getPlans({
            status: 'active'
        });
        // Filter only bonus types (deposit, coded, manual, loyalty, cashback)
        const bonusTypes = ['deposit', 'coded', 'manual', 'loyalty', 'instant_cashback', 'scheduled_cashback'];
        const bonusPlans = result.plans.filter((plan) => bonusTypes.includes(plan.trigger_type));
        // Separate by type for frontend
        const codedBonuses = bonusPlans.filter((plan) => plan.trigger_type === 'coded');
        const depositBonuses = bonusPlans.filter((plan) => plan.trigger_type === 'deposit');
        const loyaltyBonuses = bonusPlans.filter((plan) => plan.trigger_type === 'loyalty');
        const cashbackBonuses = bonusPlans.filter((plan) => plan.trigger_type === 'instant_cashback' || plan.trigger_type === 'scheduled_cashback');
        res.status(200).json({
            success: true,
            data: {
                coded: codedBonuses, // User can manually apply with code
                deposit: depositBonuses, // Auto-granted on deposit (informational)
                loyalty: loyaltyBonuses, // VIP/loyalty bonuses (informational)
                cashback: cashbackBonuses // Cashback bonuses (informational)
            }
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getAvailableBonuses = getAvailableBonuses;

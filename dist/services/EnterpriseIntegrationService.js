"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_1 = __importDefault(require("../db/postgres"));
const LoyaltyService_1 = __importDefault(require("./LoyaltyService"));
const PersonalJackpotsService_1 = __importDefault(require("./PersonalJackpotsService"));
const ChallengesService_1 = __importDefault(require("./ChallengesService"));
const RiskManagementService_1 = __importDefault(require("./RiskManagementService"));
/**
 * Enterprise Integration Service
 * Connects all enterprise features with gameplay
 */
class EnterpriseIntegrationService {
    /**
     * Process bet - integrate all enterprise features
     * Called after every bet placed by player
     */
    async processBet(userId, betAmount, gameId) {
        try {
            // Run all integrations in parallel for performance
            await Promise.allSettled([
                this.awardLoyaltyPoints(userId, betAmount),
                this.contributeToPersonalJackpots(userId, betAmount, gameId),
                this.updateChallengeProgress(userId, 'WAGER', betAmount, gameId),
                this.updateChallengeProgress(userId, 'GAME_PLAY', 1, gameId)
            ]);
        }
        catch (error) {
            console.error('[ENTERPRISE] Error processing bet:', error);
            // Don't throw - enterprise features shouldn't block gameplay
        }
    }
    /**
     * Process win - integrate enterprise features
     * Called after player wins
     */
    async processWin(userId, winAmount, gameId) {
        try {
            await Promise.allSettled([
                this.updateChallengeProgress(userId, 'WIN_COUNT', 1, gameId),
                this.checkPersonalJackpotTriggers(userId)
            ]);
        }
        catch (error) {
            console.error('[ENTERPRISE] Error processing win:', error);
        }
    }
    /**
     * Process deposit - integrate enterprise features
     * Called after successful deposit
     */
    async processDeposit(userId, depositAmount) {
        try {
            await Promise.allSettled([
                this.updateChallengeProgress(userId, 'DEPOSIT', depositAmount),
                this.evaluateRiskRules(userId)
            ]);
        }
        catch (error) {
            console.error('[ENTERPRISE] Error processing deposit:', error);
        }
    }
    /**
     * Process withdrawal - integrate enterprise features
     * Called after withdrawal request
     */
    async processWithdrawal(userId, withdrawalAmount) {
        try {
            await this.evaluateRiskRules(userId);
        }
        catch (error) {
            console.error('[ENTERPRISE] Error processing withdrawal:', error);
        }
    }
    /**
     * Process referral - integrate enterprise features
     * Called when player refers a friend
     */
    async processReferral(userId, referredUserId) {
        try {
            await this.updateChallengeProgress(userId, 'REFERRAL', 1);
        }
        catch (error) {
            console.error('[ENTERPRISE] Error processing referral:', error);
        }
    }
    /**
     * Award loyalty points based on bet amount
     */
    async awardLoyaltyPoints(userId, betAmount) {
        // Award 1 loyalty point for every 10 units wagered
        const pointsToAward = Math.floor(betAmount / 10);
        if (pointsToAward > 0) {
            try {
                await LoyaltyService_1.default.addPoints(userId, pointsToAward, 'Wagering reward', `bet_${Date.now()}`);
                console.log(`[LOYALTY] Awarded ${pointsToAward} points to user ${userId}`);
            }
            catch (error) {
                console.error('[LOYALTY] Error awarding points:', error);
            }
        }
    }
    /**
     * Contribute to player's personal jackpots
     */
    async contributeToPersonalJackpots(userId, betAmount, gameId) {
        try {
            // Get all active jackpot configs
            const configs = await PersonalJackpotsService_1.default.getAllConfigs('ACTIVE');
            for (const config of configs) {
                // Check if game is eligible
                if (config.game_ids) {
                    const eligibleGames = JSON.parse(config.game_ids);
                    if (!eligibleGames.includes(gameId)) {
                        continue;
                    }
                }
                // Contribute to jackpot
                await PersonalJackpotsService_1.default.contributeToJackpot(userId, config.id, betAmount, gameId);
            }
        }
        catch (error) {
            console.error('[PERSONAL-JACKPOTS] Error contributing:', error);
        }
    }
    /**
     * Update challenge progress
     */
    async updateChallengeProgress(userId, challengeType, progressValue, gameId) {
        try {
            // Get player's active challenges of this type
            const challenges = await postgres_1.default.query(`SELECT pc.*, ct.game_ids
         FROM player_challenges pc
         JOIN challenge_templates ct ON pc.template_id = ct.id
         WHERE pc.user_id = $1 AND pc.status = 'ACTIVE' AND ct.type = $2`, [userId, challengeType]);
            for (const challenge of challenges.rows) {
                // Check if game is eligible (if game_ids specified)
                if (gameId && challenge.game_ids) {
                    const eligibleGames = JSON.parse(challenge.game_ids);
                    if (!eligibleGames.includes(gameId)) {
                        continue;
                    }
                }
                // Update progress
                await ChallengesService_1.default.updateChallengeProgress(userId, challenge.template_id, progressValue);
            }
        }
        catch (error) {
            console.error('[CHALLENGES] Error updating progress:', error);
        }
    }
    /**
     * Check if personal jackpots should trigger
     */
    async checkPersonalJackpotTriggers(userId) {
        try {
            const jackpots = await PersonalJackpotsService_1.default.getPlayerJackpots(userId, 'ACTIVE');
            for (const jackpot of jackpots) {
                const triggerCheck = await PersonalJackpotsService_1.default.checkTrigger(userId, jackpot.id);
                if (triggerCheck.triggered) {
                    // Trigger the jackpot win
                    const winResult = await PersonalJackpotsService_1.default.triggerJackpotWin(userId, jackpot.id);
                    console.log(`[PERSONAL-JACKPOT] User ${userId} won ${winResult.winAmount}!`);
                    // Reinitialize a new jackpot
                    await PersonalJackpotsService_1.default.initializePlayerJackpot(userId, jackpot.config_id);
                }
            }
        }
        catch (error) {
            console.error('[PERSONAL-JACKPOTS] Error checking triggers:', error);
        }
    }
    /**
     * Evaluate risk rules for user
     */
    async evaluateRiskRules(userId) {
        try {
            const triggeredRules = await RiskManagementService_1.default.evaluateUser(userId);
            if (triggeredRules.length > 0) {
                console.log(`[RISK] User ${userId} triggered ${triggeredRules.length} risk rules`);
            }
        }
        catch (error) {
            console.error('[RISK] Error evaluating rules:', error);
        }
    }
    /**
     * Initialize new player with all enterprise features
     */
    async initializeNewPlayer(userId) {
        try {
            // Initialize loyalty account
            await LoyaltyService_1.default.initializePlayerLoyalty(userId);
            // Initialize personal jackpots
            const jackpotConfigs = await PersonalJackpotsService_1.default.getAllConfigs('ACTIVE');
            for (const config of jackpotConfigs) {
                await PersonalJackpotsService_1.default.initializePlayerJackpot(userId, config.id);
            }
            // Auto-assign challenges
            await ChallengesService_1.default.autoAssignChallenges();
            console.log(`[ENTERPRISE] Initialized new player ${userId} with all features`);
        }
        catch (error) {
            console.error('[ENTERPRISE] Error initializing new player:', error);
        }
    }
    /**
     * Get player's enterprise dashboard data
     */
    async getPlayerDashboard(userId) {
        try {
            const [loyalty, challenges, jackpots, wins] = await Promise.all([
                LoyaltyService_1.default.getPlayerLoyalty(userId),
                ChallengesService_1.default.getPlayerChallenges(userId, 'ACTIVE'),
                PersonalJackpotsService_1.default.getPlayerJackpots(userId, 'ACTIVE'),
                PersonalJackpotsService_1.default.getPlayerWins(userId, 10)
            ]);
            return {
                loyalty: {
                    tier: loyalty.tier_name,
                    points: loyalty.points,
                    lifetime_points: loyalty.lifetime_points,
                    cashback_percentage: loyalty.cashback_percentage,
                    bonus_multiplier: loyalty.bonus_multiplier
                },
                challenges: {
                    active: challenges.length,
                    list: challenges.map((c) => ({
                        id: c.id,
                        name: c.name,
                        progress: c.current_progress,
                        target: c.target_value,
                        percentage: Math.min(100, (c.current_progress / c.target_value) * 100),
                        reward_type: c.reward_type,
                        reward_amount: c.reward_amount
                    }))
                },
                personalJackpots: {
                    active: jackpots.length,
                    totalValue: jackpots.reduce((sum, jp) => sum + parseFloat(jp.current_amount), 0),
                    list: jackpots.map((jp) => ({
                        id: jp.id,
                        name: jp.name,
                        amount: jp.current_amount,
                        spins: jp.spins_count,
                        trigger_type: jp.trigger_type
                    }))
                },
                recentWins: wins.map((w) => ({
                    jackpot_name: w.jackpot_name,
                    amount: w.win_amount,
                    won_at: w.won_at
                }))
            };
        }
        catch (error) {
            console.error('[ENTERPRISE] Error getting dashboard:', error);
            throw error;
        }
    }
}
exports.default = new EnterpriseIntegrationService();

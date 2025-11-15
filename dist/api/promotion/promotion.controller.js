"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoApplyBestPromotion = exports.applyPromoCode = exports.validatePromoCode = exports.checkPromotionEligibility = exports.transferBonusToMain = exports.getBonusBalanceSummary = exports.getWageringProgress = exports.performDailySpin = exports.getDailySpin = exports.getUserPromotions = exports.claimPromotion = exports.getAvailablePromotions = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const promotion_service_1 = require("../../services/promotion/promotion.service");
// Get available promotions for user
const getAvailablePromotions = async (req, res) => {
    try {
        const userId = req.user?.id;
        // Get all active promotions
        const promotionsResult = await postgres_1.default.query(`SELECT
        p.id, p.title, p.description, p.type, p.bonus_percentage,
        p.max_bonus_amount, p.min_deposit_amount, p.wagering_requirement,
        p.free_spins_count, p.start_date, p.end_date, p.is_active,
        up.id as user_promotion_id,
        up.status as user_status,
        up.claimed_at,
        up.bonus_amount as claimed_bonus_amount,
        up.wagering_completed
      FROM promotions p
      LEFT JOIN user_promotions up ON p.id = up.promotion_id AND up.user_id = $1
      WHERE p.is_active = true
        AND (p.end_date IS NULL OR p.end_date > CURRENT_TIMESTAMP)
        AND (p.start_date IS NULL OR p.start_date <= CURRENT_TIMESTAMP)
      ORDER BY p.created_at DESC`, [userId]);
        const promotions = promotionsResult.rows.map(promo => ({
            id: promo.id,
            title: promo.title,
            description: promo.description,
            type: promo.type,
            bonus_percentage: promo.bonus_percentage,
            max_bonus_amount: promo.max_bonus_amount,
            min_deposit_amount: promo.min_deposit_amount,
            wagering_requirement: promo.wagering_requirement,
            free_spins_count: promo.free_spins_count,
            start_date: promo.start_date,
            end_date: promo.end_date,
            is_claimed: !!promo.user_promotion_id,
            user_status: promo.user_status,
            claimed_at: promo.claimed_at,
            claimed_bonus_amount: promo.claimed_bonus_amount,
            wagering_completed: promo.wagering_completed,
            can_claim: !promo.user_promotion_id && isPromotionEligible(promo, userId)
        }));
        res.json({
            success: true,
            data: promotions
        });
    }
    catch (error) {
        console.error("Error fetching promotions:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAvailablePromotions = getAvailablePromotions;
// Claim a promotion/bonus
const claimPromotion = async (req, res) => {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        const userId = req.user?.id;
        const { promotion_id } = req.body;
        if (!promotion_id) {
            return res.status(400).json({
                success: false,
                message: "Promotion ID is required"
            });
        }
        // Check if promotion exists and is active
        const promotionResult = await client.query(`SELECT * FROM promotions WHERE id = $1 AND is_active = true 
       AND (end_date IS NULL OR end_date > CURRENT_TIMESTAMP)
       AND (start_date IS NULL OR start_date <= CURRENT_TIMESTAMP)`, [promotion_id]);
        if (promotionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Promotion not found or not available"
            });
        }
        const promotion = promotionResult.rows[0];
        // Check if user already claimed this promotion
        const existingClaimResult = await client.query("SELECT * FROM user_promotions WHERE user_id = $1 AND promotion_id = $2", [userId, promotion_id]);
        if (existingClaimResult.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "You have already claimed this promotion"
            });
        }
        // Check eligibility based on promotion type
        const eligibilityCheck = await checkPromotionEligibilityHelper(client, userId, promotion);
        if (!eligibilityCheck.eligible) {
            return res.status(400).json({
                success: false,
                message: eligibilityCheck.reason
            });
        }
        // Calculate bonus amount
        let bonusAmount = 0;
        if (promotion.type === 'welcome_bonus' || promotion.type === 'deposit_bonus' || promotion.type === 'reload_bonus') {
            // Get user's total deposits
            const depositResult = await client.query("SELECT COALESCE(SUM(amount), 0) as total_deposits FROM transactions WHERE user_id = $1 AND type = 'deposit' AND status = 'completed'", [userId]);
            const totalDeposits = Number(depositResult.rows[0].total_deposits);
            if (totalDeposits < (promotion.min_deposit_amount || 0)) {
                return res.status(400).json({
                    success: false,
                    message: `Minimum deposit of $${promotion.min_deposit_amount} required`
                });
            }
            bonusAmount = Math.min(totalDeposits * (promotion.bonus_percentage / 100), promotion.max_bonus_amount || Infinity);
        }
        else if (promotion.type === 'free_spins') {
            // For free spins, we'll add a bonus amount equivalent to the spins
            bonusAmount = (promotion.free_spins_count || 0) * 0.10; // $0.10 per spin
        }
        // Create user promotion record
        await client.query(`INSERT INTO user_promotions (user_id, promotion_id, status, bonus_amount, claimed_at)
       VALUES ($1, $2, 'active', $3, CURRENT_TIMESTAMP)`, [userId, promotion_id, bonusAmount]);
        // Add bonus to user's balance
        if (bonusAmount > 0) {
            // Get current balance
            const balanceResult = await client.query("SELECT bonus_balance FROM user_balances WHERE user_id = $1", [userId]);
            const currentBonusBalance = Number(balanceResult.rows[0]?.bonus_balance || 0);
            const newBonusBalance = currentBonusBalance + bonusAmount;
            // Update bonus balance
            await client.query(`INSERT INTO user_balances (user_id, bonus_balance, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET 
           bonus_balance = $2, updated_at = CURRENT_TIMESTAMP`, [userId, newBonusBalance]);
            // Create bonus transaction
            await client.query(`INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, currency, status, description, reference_id, created_at)
         VALUES ($1, 'bonus', $2, $3, $4, 'USD', 'completed', $5, $6, CURRENT_TIMESTAMP)`, [userId, bonusAmount, currentBonusBalance, newBonusBalance, `Bonus from ${promotion.name}`, `promo_${promotion_id}`]);
        }
        await client.query('COMMIT');
        res.json({
            success: true,
            message: "Promotion claimed successfully",
            data: {
                promotion_id,
                bonus_amount: bonusAmount,
                free_spins_count: promotion.free_spins_count,
                wagering_requirement: promotion.wagering_requirement
            }
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error("Error claiming promotion:", error);
        res.status(500).json({ success: false, message: error.message });
    }
    finally {
        client.release();
    }
};
exports.claimPromotion = claimPromotion;
// Get user's claimed promotions
const getUserPromotions = async (req, res) => {
    try {
        const userId = req.user?.id;
        const result = await postgres_1.default.query(`SELECT 
        up.id, up.status, up.claimed_at, up.completed_at, up.bonus_amount, up.wagering_completed,
        p.id as promotion_id, p.name, p.description, p.type, p.wagering_requirement, p.free_spins_count
      FROM user_promotions up
      JOIN promotions p ON up.promotion_id = p.id
      WHERE up.user_id = $1
      ORDER BY up.claimed_at DESC`, [userId]);
        res.json({
            success: true,
            data: result.rows
        });
    }
    catch (error) {
        console.error("Error fetching user promotions:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUserPromotions = getUserPromotions;
// Daily spin functionality
const getDailySpin = async (req, res) => {
    try {
        const userId = req.user?.id;
        // Check if user already spun today
        const today = new Date().toISOString().split('T')[0];
        const existingSpinResult = await postgres_1.default.query("SELECT * FROM user_activity_logs WHERE user_id = $1 AND action = 'daily_spin' AND DATE(created_at) = $2", [userId, today]);
        if (existingSpinResult.rows.length > 0) {
            return res.json({
                success: false,
                message: "You have already used your daily spin today",
                can_spin: false,
                next_spin_available: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });
        }
        res.json({
            success: true,
            can_spin: true,
            message: "Daily spin available"
        });
    }
    catch (error) {
        console.error("Error checking daily spin:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getDailySpin = getDailySpin;
// Perform daily spin
const performDailySpin = async (req, res) => {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        const userId = req.user?.id;
        // Check if user already spun today
        const today = new Date().toISOString().split('T')[0];
        const existingSpinResult = await client.query("SELECT * FROM user_activity_logs WHERE user_id = $1 AND action = 'daily_spin' AND DATE(created_at) = $2", [userId, today]);
        if (existingSpinResult.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "You have already used your daily spin today"
            });
        }
        // Generate spin result
        const spinResult = generateSpinResult();
        // Log the spin
        await client.query(`INSERT INTO user_activity_logs (user_id, action, category, description, metadata, created_at)
       VALUES ($1, 'daily_spin', 'bonus', $2, $3, CURRENT_TIMESTAMP)`, [userId, `Daily spin result: ${spinResult.type}`, JSON.stringify(spinResult)]);
        // Apply spin rewards
        if (spinResult.type === 'bonus' && spinResult.amount > 0) {
            // Add bonus to user's balance
            const balanceResult = await client.query("SELECT bonus_balance FROM user_balances WHERE user_id = $1", [userId]);
            const currentBonusBalance = Number(balanceResult.rows[0]?.bonus_balance || 0);
            const newBonusBalance = currentBonusBalance + spinResult.amount;
            // Update bonus balance
            await client.query(`INSERT INTO user_balances (user_id, bonus_balance, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET 
           bonus_balance = $2, updated_at = CURRENT_TIMESTAMP`, [userId, newBonusBalance]);
            // Create bonus transaction
            await client.query(`INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, currency, status, description, reference_id, created_at)
         VALUES ($1, 'bonus', $2, $3, $4, 'USD', 'completed', $5, $6, CURRENT_TIMESTAMP)`, [userId, spinResult.amount, currentBonusBalance, newBonusBalance, `Daily spin bonus: ${spinResult.description}`, `daily_spin_${Date.now()}`]);
        }
        await client.query('COMMIT');
        res.json({
            success: true,
            message: "Daily spin completed successfully",
            data: {
                spin_result: spinResult,
                next_spin_available: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error("Error performing daily spin:", error);
        res.status(500).json({ success: false, message: error.message });
    }
    finally {
        client.release();
    }
};
exports.performDailySpin = performDailySpin;
// Get wagering progress for user's active promotions
const getWageringProgress = async (req, res) => {
    try {
        const userId = req.user?.id;
        const wageringProgress = await promotion_service_1.PromotionService.getWageringProgress(userId);
        res.json({
            success: true,
            data: wageringProgress
        });
    }
    catch (error) {
        console.error("Error fetching wagering progress:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getWageringProgress = getWageringProgress;
// Get bonus balance summary
const getBonusBalanceSummary = async (req, res) => {
    try {
        const userId = req.user?.id;
        const bonusSummary = await promotion_service_1.PromotionService.getBonusBalanceSummary(userId);
        res.json({
            success: true,
            data: bonusSummary
        });
    }
    catch (error) {
        console.error("Error fetching bonus balance summary:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getBonusBalanceSummary = getBonusBalanceSummary;
// Transfer bonus balance to main balance
const transferBonusToMain = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid amount is required"
            });
        }
        const success = await promotion_service_1.PromotionService.transferBonusToMain(userId, amount);
        if (!success) {
            return res.status(400).json({
                success: false,
                message: "Insufficient bonus balance"
            });
        }
        res.json({
            success: true,
            message: "Bonus balance transferred successfully",
            data: { amount }
        });
    }
    catch (error) {
        console.error("Error transferring bonus balance:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.transferBonusToMain = transferBonusToMain;
// Check promotion eligibility
const checkPromotionEligibility = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { promotion_id } = req.params;
        if (!promotion_id) {
            return res.status(400).json({
                success: false,
                message: "Promotion ID is required"
            });
        }
        const eligibility = await promotion_service_1.PromotionService.checkEligibility(userId, parseInt(promotion_id));
        res.json({
            success: true,
            data: eligibility
        });
    }
    catch (error) {
        console.error("Error checking promotion eligibility:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.checkPromotionEligibility = checkPromotionEligibility;
// Helper functions
function isPromotionEligible(promotion, userId) {
    // Basic eligibility check - can be expanded based on business rules
    return true;
}
async function checkPromotionEligibilityHelper(client, userId, promotion) {
    if (promotion.type === 'welcome_bonus') {
        // Check if user has claimed any welcome bonus before
        const existingWelcomeBonus = await client.query(`SELECT up.id FROM user_promotions up 
       JOIN promotions p ON up.promotion_id = p.id 
       WHERE up.user_id = $1 AND p.type = 'welcome_bonus'`, [userId]);
        if (existingWelcomeBonus.rows.length > 0) {
            return { eligible: false, reason: "Welcome bonus can only be claimed once" };
        }
    }
    if (promotion.type === 'deposit_bonus' || promotion.type === 'reload_bonus') {
        // Check if user has made required deposits
        const depositResult = await client.query("SELECT COALESCE(SUM(amount), 0) as total_deposits FROM transactions WHERE user_id = $1 AND type = 'deposit' AND status = 'completed'", [userId]);
        const totalDeposits = Number(depositResult.rows[0].total_deposits);
        if (totalDeposits < (promotion.min_deposit_amount || 0)) {
            return {
                eligible: false,
                reason: `Minimum deposit of $${promotion.min_deposit_amount} required`
            };
        }
    }
    return { eligible: true };
}
function generateSpinResult() {
    const spinTypes = [
        { type: 'bonus', amount: 1, probability: 0.4, description: 'Small bonus' },
        { type: 'bonus', amount: 5, probability: 0.25, description: 'Medium bonus' },
        { type: 'bonus', amount: 10, probability: 0.1, description: 'Large bonus' },
        { type: 'free_spins', amount: 10, probability: 0.15, description: '10 Free Spins' },
        { type: 'free_spins', amount: 25, probability: 0.05, description: '25 Free Spins' },
        { type: 'nothing', amount: 0, probability: 0.05, description: 'Better luck next time' }
    ];
    const random = Math.random();
    let cumulativeProbability = 0;
    for (const spinType of spinTypes) {
        cumulativeProbability += spinType.probability;
        if (random <= cumulativeProbability) {
            return {
                type: spinType.type,
                amount: spinType.amount,
                description: spinType.description
            };
        }
    }
    // Fallback
    return { type: 'bonus', amount: 1, description: 'Small bonus' };
}
// Validate promo code
const validatePromoCode = async (req, res) => {
    try {
        const { promo_code } = req.body;
        const userId = req.user?.id;
        if (!promo_code) {
            return res.status(400).json({
                success: false,
                message: "Promo code is required"
            });
        }
        // Find promotion by promo code
        const promotionResult = await postgres_1.default.query(`SELECT
        p.id, p.title, p.description, p.type, p.bonus_percentage,
        p.max_bonus_amount, p.min_deposit_amount, p.wagering_requirement,
        p.free_spins_count, p.max_claims_per_user, p.start_date, p.end_date, p.is_active
      FROM promotions p
      WHERE p.promo_code = $1 AND p.is_active = true
        AND (p.start_date IS NULL OR p.start_date <= CURRENT_TIMESTAMP)
        AND (p.end_date IS NULL OR p.end_date > CURRENT_TIMESTAMP)
      LIMIT 1`, [promo_code.toUpperCase()]);
        if (promotionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Invalid or expired promo code"
            });
        }
        const promotion = promotionResult.rows[0];
        // Check if user already claimed this promotion
        if (userId) {
            const claimResult = await postgres_1.default.query(`SELECT id FROM user_promotions WHERE user_id = $1 AND promotion_id = $2`, [userId, promotion.id]);
            if (claimResult.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "You have already claimed this promotion"
                });
            }
            // Check max claims per user
            if (promotion.max_claims_per_user) {
                const userClaimsResult = await postgres_1.default.query(`SELECT COUNT(*) as claim_count FROM user_promotions WHERE user_id = $1 AND promotion_id = $2`, [userId, promotion.id]);
                if (parseInt(userClaimsResult.rows[0].claim_count) >= promotion.max_claims_per_user) {
                    return res.status(400).json({
                        success: false,
                        message: "You have reached the maximum number of claims for this promotion"
                    });
                }
            }
        }
        res.json({
            success: true,
            message: "Valid promo code",
            data: {
                promotion_id: promotion.id,
                title: promotion.title,
                description: promotion.description,
                type: promotion.type,
                bonus_percentage: promotion.bonus_percentage,
                max_bonus_amount: promotion.max_bonus_amount,
                min_deposit_amount: promotion.min_deposit_amount,
                wagering_requirement: promotion.wagering_requirement,
                free_spins_count: promotion.free_spins_count
            }
        });
    }
    catch (error) {
        console.error("Error validating promo code:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.validatePromoCode = validatePromoCode;
// Apply promo code (auto-claim promotion)
const applyPromoCode = async (req, res) => {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        const { promo_code, deposit_amount } = req.body;
        const userId = req.user?.id;
        if (!promo_code) {
            return res.status(400).json({
                success: false,
                message: "Promo code is required"
            });
        }
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }
        // Find promotion by promo code
        const promotionResult = await client.query(`SELECT * FROM promotions
       WHERE promo_code = $1 AND is_active = true
         AND (start_date IS NULL OR start_date <= CURRENT_TIMESTAMP)
         AND (end_date IS NULL OR end_date > CURRENT_TIMESTAMP)
       LIMIT 1`, [promo_code.toUpperCase()]);
        if (promotionResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: "Invalid or expired promo code"
            });
        }
        const promotion = promotionResult.rows[0];
        // Check if user already claimed
        const existingClaimResult = await client.query(`SELECT id FROM user_promotions WHERE user_id = $1 AND promotion_id = $2`, [userId, promotion.id]);
        if (existingClaimResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: "You have already claimed this promotion"
            });
        }
        // Calculate bonus amount
        let bonusAmount = 0;
        if (promotion.type === 'deposit_bonus' || promotion.type === 'welcome_bonus') {
            if (!deposit_amount || deposit_amount < (promotion.min_deposit_amount || 0)) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: `Minimum deposit of $${promotion.min_deposit_amount || 0} required`
                });
            }
            bonusAmount = (deposit_amount * parseFloat(promotion.bonus_percentage || 0)) / 100;
            if (promotion.max_bonus_amount && bonusAmount > parseFloat(promotion.max_bonus_amount)) {
                bonusAmount = parseFloat(promotion.max_bonus_amount);
            }
        }
        // Create user_promotion entry
        const userPromotionResult = await client.query(`INSERT INTO user_promotions (user_id, promotion_id, status, bonus_amount, claimed_at, created_at, updated_at)
       VALUES ($1, $2, 'active', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`, [userId, promotion.id, bonusAmount]);
        // If there's a bonus amount, add it to user's bonus balance
        if (bonusAmount > 0) {
            await client.query(`UPDATE user_balances
         SET bonus_balance = bonus_balance + $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`, [bonusAmount, userId]);
            // Create transaction record
            await client.query(`INSERT INTO transactions (user_id, type, amount, status, description, metadata, created_at)
         VALUES ($1, 'bonus', $2, 'completed', $3, $4, CURRENT_TIMESTAMP)`, [
                userId,
                bonusAmount,
                `Promo code bonus: ${promotion.title}`,
                JSON.stringify({ promo_code, promotion_id: promotion.id })
            ]);
        }
        await client.query('COMMIT');
        res.json({
            success: true,
            message: "Promo code applied successfully",
            data: {
                promotion: {
                    id: promotion.id,
                    title: promotion.title,
                    description: promotion.description
                },
                bonus_amount: bonusAmount,
                free_spins: promotion.free_spins_count || 0,
                wagering_requirement: promotion.wagering_requirement || 0,
                user_promotion_id: userPromotionResult.rows[0].id
            }
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error("Error applying promo code:", error);
        res.status(500).json({ success: false, message: error.message });
    }
    finally {
        client.release();
    }
};
exports.applyPromoCode = applyPromoCode;
// Auto-apply best promotion on deposit (no promo code required)
const autoApplyBestPromotion = async (req, res) => {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        const { deposit_amount, is_first_deposit } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }
        if (!deposit_amount || deposit_amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid deposit amount is required"
            });
        }
        // Determine promotion type based on first deposit
        const promotionType = is_first_deposit ? 'welcome_bonus' : 'deposit_bonus';
        // Find best eligible auto-apply promotion
        const promotionResult = await client.query(`SELECT p.*
       FROM promotions p
       LEFT JOIN user_promotions up ON p.id = up.promotion_id AND up.user_id = $1
       WHERE p.is_active = true
         AND p.is_featured = true
         AND (p.promo_code IS NULL OR p.promo_code = '')
         AND (p.start_date IS NULL OR p.start_date <= CURRENT_TIMESTAMP)
         AND (p.end_date IS NULL OR p.end_date > CURRENT_TIMESTAMP)
         AND p.type = $2
         AND (p.min_deposit_amount IS NULL OR p.min_deposit_amount <= $3)
         AND up.id IS NULL
       ORDER BY p.bonus_percentage DESC, p.created_at ASC
       LIMIT 1`, [userId, promotionType, deposit_amount]);
        // If no eligible promotion found, return success with no promotion
        if (promotionResult.rows.length === 0) {
            await client.query('COMMIT');
            return res.json({
                success: true,
                message: "Deposit processed successfully",
                promotion_applied: false,
                deposit: {
                    amount: deposit_amount,
                    main_balance: deposit_amount
                }
            });
        }
        const promotion = promotionResult.rows[0];
        // Calculate bonus amount
        let bonusAmount = (deposit_amount * parseFloat(promotion.bonus_percentage || 0)) / 100;
        if (promotion.max_bonus_amount && bonusAmount > parseFloat(promotion.max_bonus_amount)) {
            bonusAmount = parseFloat(promotion.max_bonus_amount);
        }
        // Create user_promotion entry
        const userPromotionResult = await client.query(`INSERT INTO user_promotions (user_id, promotion_id, status, bonus_amount, claimed_at, created_at, updated_at)
       VALUES ($1, $2, 'active', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`, [userId, promotion.id, bonusAmount]);
        // Add bonus to user's bonus balance
        if (bonusAmount > 0) {
            await client.query(`UPDATE user_balances
         SET bonus_balance = bonus_balance + $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`, [bonusAmount, userId]);
            // Create transaction record
            await client.query(`INSERT INTO transactions (user_id, type, amount, status, description, metadata, created_at)
         VALUES ($1, 'bonus', $2, 'completed', $3, $4, CURRENT_TIMESTAMP)`, [
                userId,
                bonusAmount,
                `Auto-applied bonus: ${promotion.title}`,
                JSON.stringify({
                    auto_applied: true,
                    promotion_id: promotion.id,
                    deposit_amount
                })
            ]);
        }
        await client.query('COMMIT');
        res.json({
            success: true,
            message: "Deposit successful with bonus applied!",
            promotion_applied: true,
            deposit: {
                amount: deposit_amount,
                main_balance: deposit_amount
            },
            promotion: {
                id: promotion.id,
                title: promotion.title,
                description: promotion.description,
                type: promotion.type,
                bonus_amount: bonusAmount,
                wagering_requirement: promotion.wagering_requirement || 0,
                free_spins: promotion.free_spins_count || 0,
                user_promotion_id: userPromotionResult.rows[0].id
            }
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error("Error auto-applying promotion:", error);
        res.status(500).json({ success: false, message: error.message });
    }
    finally {
        client.release();
    }
};
exports.autoApplyBestPromotion = autoApplyBestPromotion;

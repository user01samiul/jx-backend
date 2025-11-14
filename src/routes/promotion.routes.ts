import { Router } from "express";
import {
  getAvailablePromotions,
  claimPromotion,
  getUserPromotions,
  getDailySpin,
  performDailySpin,
  getWageringProgress,
  getBonusBalanceSummary,
  transferBonusToMain,
  checkPromotionEligibility,
  validatePromoCode,
  applyPromoCode,
  autoApplyBestPromotion
} from "../api/promotion/promotion.controller";
import { authenticate } from "../middlewares/authenticate";
import { validate } from "../middlewares/validate";
import { ClaimPromotionSchema } from "../api/promotion/promotion.schema";

const router = Router();

/**
 * @openapi
 * /api/promotions:
 *   get:
 *     summary: Get available promotions for the authenticated user
 *     tags:
 *       - Promotions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully returns available promotions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Welcome Bonus"
 *                       description:
 *                         type: string
 *                         example: "Get 100% bonus on your first deposit"
 *                       type:
 *                         type: string
 *                         enum: [welcome_bonus, deposit_bonus, free_spins, cashback, reload_bonus, tournament]
 *                       bonus_percentage:
 *                         type: number
 *                         example: 100.00
 *                       max_bonus_amount:
 *                         type: number
 *                         example: 500.00
 *                       min_deposit_amount:
 *                         type: number
 *                         example: 20.00
 *                       wagering_requirement:
 *                         type: number
 *                         example: 35.00
 *                       free_spins_count:
 *                         type: integer
 *                         example: 50
 *                       is_claimed:
 *                         type: boolean
 *                         example: false
 *                       can_claim:
 *                         type: boolean
 *                         example: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/", authenticate, getAvailablePromotions);

/**
 * @openapi
 * /api/promotions/claim:
 *   post:
 *     summary: Claim a promotion/bonus
 *     tags:
 *       - Promotions
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - promotion_id
 *             properties:
 *               promotion_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Successfully claimed promotion
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Promotion claimed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     promotion_id:
 *                       type: integer
 *                       example: 1
 *                     bonus_amount:
 *                       type: number
 *                       example: 100.00
 *                     free_spins_count:
 *                       type: integer
 *                       example: 50
 *                     wagering_requirement:
 *                       type: number
 *                       example: 35.00
 *       400:
 *         description: Bad request - promotion already claimed or eligibility requirements not met
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Promotion not found
 *       500:
 *         description: Internal server error
 */
router.post("/claim", authenticate, validate({ body: ClaimPromotionSchema }), claimPromotion);

/**
 * @openapi
 * /api/promotions/my:
 *   get:
 *     summary: Get user's claimed promotions
 *     tags:
 *       - Promotions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully returns user's claimed promotions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       status:
 *                         type: string
 *                         enum: [active, completed, expired, cancelled]
 *                       claimed_at:
 *                         type: string
 *                         format: date-time
 *                       bonus_amount:
 *                         type: number
 *                         example: 100.00
 *                       wagering_completed:
 *                         type: number
 *                         example: 0.00
 *                       promotion_id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Welcome Bonus"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/my", authenticate, getUserPromotions);

/**
 * @openapi
 * /api/promotions/daily-spin:
 *   get:
 *     summary: Check if daily spin is available
 *     tags:
 *       - Promotions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully returns daily spin status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 can_spin:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Daily spin available"
 *                 next_spin_available:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-01-06T10:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/daily-spin", authenticate, getDailySpin);

/**
 * @openapi
 * /api/promotions/daily-spin:
 *   post:
 *     summary: Perform daily spin
 *     tags:
 *       - Promotions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully performed daily spin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Daily spin completed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     spin_result:
 *                       type: object
 *                       properties:
 *                         type:
 *                           type: string
 *                           enum: [bonus, free_spins, nothing]
 *                         amount:
 *                           type: number
 *                           example: 5.00
 *                         description:
 *                           type: string
 *                           example: "Medium bonus"
 *                     next_spin_available:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-01-06T10:00:00.000Z"
 *       400:
 *         description: Bad request - daily spin already used today
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/daily-spin", authenticate, performDailySpin);

/**
 * @openapi
 * /api/promotions/wagering-progress:
 *   get:
 *     summary: Get wagering progress for user's active promotions
 *     tags:
 *       - Promotions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully returns wagering progress
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       promotion_id:
 *                         type: integer
 *                         example: 1
 *                       wagering_requirement:
 *                         type: number
 *                         example: 1000.00
 *                       wagering_completed:
 *                         type: number
 *                         example: 500.00
 *                       remaining_wagering:
 *                         type: number
 *                         example: 500.00
 *                       progress_percentage:
 *                         type: number
 *                         example: 50.00
 *                       is_completed:
 *                         type: boolean
 *                         example: false
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/wagering-progress", authenticate, getWageringProgress);

/**
 * @openapi
 * /api/promotions/bonus-summary:
 *   get:
 *     summary: Get user's bonus balance summary
 *     tags:
 *       - Promotions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully returns bonus balance summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     bonus_balance:
 *                       type: number
 *                       example: 150.00
 *                     active_promotions:
 *                       type: integer
 *                       example: 2
 *                     total_bonus_claimed:
 *                       type: number
 *                       example: 300.00
 *                     total_wagering_completed:
 *                       type: number
 *                       example: 500.00
 *                     total_wagering_required:
 *                       type: number
 *                       example: 1000.00
 *                     wagering_progress:
 *                       type: number
 *                       example: 50.00
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/bonus-summary", authenticate, getBonusBalanceSummary);

/**
 * @openapi
 * /api/promotions/transfer-bonus:
 *   post:
 *     summary: Transfer bonus balance to main balance
 *     tags:
 *       - Promotions
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 50.00
 *     responses:
 *       200:
 *         description: Successfully transferred bonus balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Bonus balance transferred successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     amount:
 *                       type: number
 *                       example: 50.00
 *       400:
 *         description: Bad request - invalid amount or insufficient balance
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/transfer-bonus", authenticate, transferBonusToMain);

/**
 * @openapi
 * /api/promotions/{promotion_id}/eligibility:
 *   get:
 *     summary: Check if user is eligible for a specific promotion
 *     tags:
 *       - Promotions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: promotion_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Successfully returns eligibility status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     eligible:
 *                       type: boolean
 *                       example: true
 *                     reason:
 *                       type: string
 *                       example: "Minimum deposit of $20 required"
 *                     required_deposit:
 *                       type: number
 *                       example: 20.00
 *                     current_deposit:
 *                       type: number
 *                       example: 10.00
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/:promotion_id/eligibility", authenticate, checkPromotionEligibility);

/**
 * @openapi
 * /api/promotions/validate-promo-code:
 *   post:
 *     summary: Validate a promo code
 *     tags:
 *       - Promotions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - promo_code
 *             properties:
 *               promo_code:
 *                 type: string
 *                 example: "WELCOME100"
 *     responses:
 *       200:
 *         description: Valid promo code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Valid promo code"
 *                 data:
 *                   type: object
 *                   properties:
 *                     promotion_id:
 *                       type: integer
 *                       example: 1
 *                     title:
 *                       type: string
 *                       example: "Welcome Bonus 100%"
 *                     bonus_percentage:
 *                       type: number
 *                       example: 100.00
 *       404:
 *         description: Invalid or expired promo code
 *       500:
 *         description: Internal server error
 */
router.post("/validate-promo-code", validatePromoCode);

/**
 * @openapi
 * /api/promotions/apply-promo-code:
 *   post:
 *     summary: Apply a promo code and claim the promotion
 *     tags:
 *       - Promotions
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - promo_code
 *             properties:
 *               promo_code:
 *                 type: string
 *                 example: "WELCOME100"
 *               deposit_amount:
 *                 type: number
 *                 example: 100.00
 *     responses:
 *       200:
 *         description: Promo code applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Promo code applied successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     promotion:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         title:
 *                           type: string
 *                           example: "Welcome Bonus 100%"
 *                     bonus_amount:
 *                       type: number
 *                       example: 100.00
 *                     wagering_requirement:
 *                       type: number
 *                       example: 35.00
 *       400:
 *         description: Bad request - already claimed or minimum deposit not met
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invalid or expired promo code
 *       500:
 *         description: Internal server error
 */
router.post("/apply-promo-code", authenticate, applyPromoCode);

/**
 * @openapi
 * /api/promotions/auto-apply:
 *   post:
 *     summary: Auto-apply best available promotion on deposit
 *     tags:
 *       - Promotions
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deposit_amount
 *               - is_first_deposit
 *             properties:
 *               deposit_amount:
 *                 type: number
 *                 example: 100.00
 *               is_first_deposit:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Success response (with or without promotion applied)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 promotion_applied:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Promotion auto-applied successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     promotion:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         title:
 *                           type: string
 *                           example: "Welcome Bonus 100%"
 *                     bonus_amount:
 *                       type: number
 *                       example: 100.00
 *                     wagering_requirement:
 *                       type: number
 *                       example: 35.00
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/auto-apply", authenticate, autoApplyBestPromotion);

export default router; 
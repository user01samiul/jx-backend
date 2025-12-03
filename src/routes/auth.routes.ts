import express from "express";
import { login, register, refreshToken, getUserRoles, getCaptcha, checkUsername, checkEmail, forgotPassword, resetPassword } from "../api/auth/auth.controller";
import { LoginSchema, RegisterSchema, ForgotPasswordSchema, ResetPasswordSchema } from "../api/auth/auth.schema";
import { validate } from "../middlewares/validate";
import { createRateLimiter } from "../middlewares/rate-limiter.middleware";

const router = express.Router();

// Rate limiter for availability check endpoints (10 requests per minute)
const availabilityCheckRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many availability check requests, please try again later.'
});

// Rate limiter for forgot password endpoint (3 requests per hour per IP)
const forgotPasswordRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset requests, please try again later.'
});

/**
 * @openapi
 * /api/auth/captcha:
 *   get:
 *     summary: Generate or refresh captcha
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Captcha generated successfully
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
 *                     id:
 *                       type: string
 *                       example: captcha_1234567890_abc123def
 *                     svg:
 *                       type: string
 *                       example: <svg>...</svg>
 */
router.get("/captcha", getCaptcha);

/**
 * @openapi
 * /api/auth/check-username:
 *   get:
 *     summary: Check username availability
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: query
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 3
 *         description: Username to check
 *         example: newuser123
 *     responses:
 *       200:
 *         description: Username availability checked
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
 *                     available:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Username is available
 *       400:
 *         description: Invalid username format
 */
router.get("/check-username", availabilityCheckRateLimiter, checkUsername);

/**
 * @openapi
 * /api/auth/check-email:
 *   get:
 *     summary: Check email availability
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email to check
 *         example: newuser@email.com
 *     responses:
 *       200:
 *         description: Email availability checked
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
 *                     available:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Email is available
 *       400:
 *         description: Invalid email format
 */
router.get("/check-email", availabilityCheckRateLimiter, checkEmail);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login with username/email, password and optional 2FA code
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               email:
 *                 type: string
 *                 example: admin@casino.com
 *               password:
 *                 type: string
 *                 example: secret123
 *               auth_code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 description: Google Authenticator 2FA code 6 digits required only if 2FA is enabled
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login success
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
 *                   example: Logged in successfully
 *                 token:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                       example: eyJhbGciOi...
 *                     refresh_token:
 *                       type: string
 *                       example: eyJhbGciOi...
 *                     role:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: number
 *                           example: 1
 *                         username:
 *                           type: string
 *                           example: player1
 *                         name:
 *                           type: string
 *                           example: Player
 *                         description:
 *                           type: string
 *                           example: Regular player account
 *       401:
 *         description: Invalid credentials or 2FA code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid 2FA authentication code
 *       400:
 *         description: Missing required fields
 */
router.post("/login", validate({ body: LoginSchema }), login);

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (2FA setup is optional)
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - type
 *               - captcha_id
 *               - captcha_text
 *             properties:
 *               username:
 *                 type: string
 *                 example: newuser
 *               email:
 *                 type: string
 *                 example: newuser@email.com
 *               password:
 *                 type: string
 *                 example: password123
 *               type:
 *                 type: string
 *                 example: Player
 *               captcha_id:
 *                 type: string
 *                 example: captcha_1234567890_abc123def
 *               captcha_text:
 *                 type: string
 *                 example: ABCD
 *     responses:
 *       200:
 *         description: Registration success
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
 *                   example: Registered Successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     qr_code:
 *                       type: string
 *                       description: SVG QR code for 2FA authentication optional can be skipped
 *                       example: "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg xmlns=\"http://www.w3.org/2000/svg\"...>"
 *                     auth_secret:
 *                       type: string
 *                       description: Secret key for QR code authentication optional can be skipped
 *                       example: "STIIRABTLHHVDXW4"
 *       400:
 *         description: Invalid input or captcha
 *       409:
 *         description: User already exists
 *       500:
 *         description: QR generation failed
 */
router.post("/register", validate({ body: RegisterSchema }), register);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 example: eyJhbGciOi...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post("/refresh", refreshToken);

/**
 * @openapi
 * /api/auth/user-roles:
 *   get:
 *     summary: Get user roles
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: query
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         example: player1
 *     responses:
 *       200:
 *         description: User roles retrieved successfully
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
 *                         type: number
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: Player
 *                       description:
 *                         type: string
 *                         example: Regular player account
 *       400:
 *         description: Username is required
 */
router.get("/user-roles", getUserRoles);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent (if email exists)
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
 *                   example: If the email exists, reset instructions have been sent
 *       400:
 *         description: Invalid email format
 *       429:
 *         description: Too many requests (rate limited to 3 per hour)
 */
router.post("/forgot-password", forgotPasswordRateLimiter, validate({ body: ForgotPasswordSchema }), forgotPassword);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: newSecurePassword123
 *     responses:
 *       200:
 *         description: Password reset successful
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
 *                   example: Password reset successful
 *       400:
 *         description: Invalid or expired token, or token already used
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid or expired reset token
 */
router.post("/reset-password", validate({ body: ResetPasswordSchema }), resetPassword);

export default router;
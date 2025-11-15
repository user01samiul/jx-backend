"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../api/auth/auth.controller");
const auth_schema_1 = require("../api/auth/auth.schema");
const validate_1 = require("../middlewares/validate");
const router = express_1.default.Router();
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
router.get("/captcha", auth_controller_1.getCaptcha);
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
router.post("/login", (0, validate_1.validate)({ body: auth_schema_1.LoginSchema }), auth_controller_1.login);
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
router.post("/register", (0, validate_1.validate)({ body: auth_schema_1.RegisterSchema }), auth_controller_1.register);
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
router.post("/refresh", auth_controller_1.refreshToken);
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
router.get("/user-roles", auth_controller_1.getUserRoles);
exports.default = router;

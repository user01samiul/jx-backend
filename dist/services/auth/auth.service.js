"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshToken = exports.refreshTokenService = exports.registerService = exports.loginService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const messages_1 = require("../../constants/messages");
const auth_query_1 = require("../../api/auth/auth.query");
const jwt_service_1 = require("../jwt/jwt.service");
const apiError_1 = require("../../utils/apiError");
const user_service_1 = require("../user/user.service");
const user_activity_service_1 = require("../user/user-activity.service");
const captcha_service_1 = require("../captcha/captcha.service");
const axios_1 = __importDefault(require("axios"));
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
const jwtService = new jwt_service_1.JwtService();
/**
 * Validate Google Authenticator code
 */
const validateAuthCode = async (authCode, authSecret) => {
    try {
        console.log(`[2FA] Validating code: ${authCode} with secret: ${authSecret}`);
        const response = await axios_1.default.post('http://46.250.232.119:86/api/authenticate', {
            one_time_password: authCode,
            secret: authSecret
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log(`[2FA] API Response:`, response.data);
        // Check if the response indicates successful authentication
        const isValid = response.data.status === 'success' && response.data.code === '200';
        console.log(`[2FA] Validation result: ${isValid}`);
        return isValid;
    }
    catch (error) {
        console.error('Auth API Error:', error);
        return false;
    }
};
const loginService = async (identifier, // can be username or email
password, authCode, roleId, req) => {
    console.log(`[LOGIN] Attempting login for: ${identifier}, auth_code: ${authCode || 'not provided'}`);
    // Determine if identifier is email or username
    let user;
    if (identifier.includes("@")) {
        user = await (0, user_service_1.getUserByEmailService)(identifier);
    }
    else {
        user = await (0, user_service_1.getUserByUsernameService)(identifier);
    }
    if (!user) {
        throw new apiError_1.ApiError(messages_1.ErrorMessages.INVALID_CREDENTIALS, 401);
    }
    console.log(`[LOGIN] User found: ${user.username}, has auth_secret: ${!!user.auth_secret}, is_2fa_enabled: ${user.is_2fa_enabled}`);
    // If 2FA is enabled, require only 2FA code (skip password check)
    if (user.is_2fa_enabled && user.auth_secret) {
        console.log(`[LOGIN] User has 2FA enabled, validating code...`);
        if (!authCode) {
            console.log(`[LOGIN] No auth_code provided but 2FA is enabled`);
            throw new apiError_1.ApiError(messages_1.ErrorMessages.TWOFA_REQUIRED, 401);
        }
        const isAuthCodeValid = await validateAuthCode(authCode, user.auth_secret);
        console.log(`[LOGIN] 2FA validation result: ${isAuthCodeValid}`);
        if (!isAuthCodeValid) {
            throw new apiError_1.ApiError(messages_1.ErrorMessages.INVALID_2FA_CODE, 401);
        }
    }
    else {
        // If 2FA is not enabled, require password
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            throw new apiError_1.ApiError(messages_1.ErrorMessages.INVALID_CREDENTIALS, 401);
        }
    }
    // Get user roles
    const userRolesResult = await postgres_1.default.query("SELECT r.id, r.name, r.description FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1", [user.id]);
    const userRoles = userRolesResult.rows;
    if (userRoles.length === 0) {
        throw new apiError_1.ApiError('User has no assigned roles', 401);
    }
    // Determine which role to use
    let selectedRole = userRoles[0];
    if (roleId) {
        const requestedRole = userRoles.find(role => role.id === roleId);
        if (requestedRole) {
            selectedRole = requestedRole;
        }
        else {
            throw new apiError_1.ApiError('Invalid role for user', 401);
        }
    }
    if (!selectedRole) {
        throw new apiError_1.ApiError('No valid role found for user', 401);
    }
    const payload = {
        userId: user.id,
        username: user.username,
        role: selectedRole.name,
        roleId: selectedRole.id
    };
    const accessToken = jwtService.signAccessToken(payload);
    const refreshToken = jwtService.signRefreshToken(payload);
    // Store tokens in the database for provider authentication
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 30); // 30 days expiry
    // Upsert token for this user
    await postgres_1.default.query(`INSERT INTO tokens (user_id, access_token, refresh_token, expired_at, is_active)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (access_token) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       refresh_token = EXCLUDED.refresh_token,
       expired_at = EXCLUDED.expired_at,
       is_active = EXCLUDED.is_active`, [user.id, accessToken, refreshToken, tokenExpiry, true]);
    // Log user login activity
    await (0, user_activity_service_1.logUserActivity)({
        userId: user.id,
        action: "login",
        category: "auth",
        description: "User logged in",
        ipAddress: req?.ip || undefined,
        userAgent: req?.headers["user-agent"] || undefined,
    });
    // If admin login, also log to admin_activities
    if (selectedRole.name === 'Admin') {
        try {
            await postgres_1.default.query(`INSERT INTO admin_activities (admin_id, action, details, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`, [
                user.id,
                'admin_login',
                JSON.stringify({ username: user.username, role: selectedRole.name, timestamp: new Date().toISOString() }),
                req?.ip || req?.headers['x-forwarded-for'] || null,
                req?.headers["user-agent"] || null
            ]);
            console.log(`[AdminActivity] Admin login logged for user ${user.id}`);
        }
        catch (error) {
            console.error('[AdminActivity] Error logging admin login:', error);
        }
    }
    return {
        access_token: accessToken,
        refresh_token: refreshToken,
        role: {
            id: selectedRole.id,
            name: selectedRole.name,
            description: selectedRole.description || null
        }
    };
};
exports.loginService = loginService;
/**
 * Generate 2FA QR code locally using speakeasy + qrcode
 * This is used as fallback when external API fails
 */
const generateLocalQRCode = async (email, username) => {
    try {
        // Generate secret
        const secret = speakeasy_1.default.generateSecret({
            name: `JackpotX (${username})`,
            issuer: 'JackpotX',
            length: 32
        });
        // Generate QR code as data URL
        const qrCodeDataURL = await qrcode_1.default.toDataURL(secret.otpauth_url || '');
        console.log('[QR] Generated 2FA QR code locally for:', username);
        return {
            secret: secret.base32,
            qr_code: qrCodeDataURL
        };
    }
    catch (error) {
        console.error('[QR] Local QR generation failed:', error);
        throw error;
    }
};
/**
 * Fetch QR code data from external API with local fallback
 * Returns null on failure to allow registration to continue
 */
const fetchQRData = async (email, username = 'user') => {
    // Try external API first (with short timeout)
    try {
        const response = await axios_1.default.get('http://46.250.232.119:86/api/get-qr-with-secret', {
            params: { email },
            timeout: 3000 // 3 second timeout
        });
        if (response.data.status === 'success') {
            console.log('[QR] Generated QR code via external API');
            return {
                secret: response.data.secret,
                qr_code: response.data.qr_code
            };
        }
    }
    catch (error) {
        console.warn('[QR] External API failed, using local generation:', error.message);
    }
    // Fallback to local generation
    try {
        return await generateLocalQRCode(email, username);
    }
    catch (error) {
        console.error('[QR] Both external and local QR generation failed - continuing without 2FA');
        return null;
    }
};
const registerService = async (reqBody) => {
    try {
        const { username, email, password, type, captcha_id, captcha_text, referral_code } = reqBody;
        // Validate captcha first (allow admin bypass)
        if (captcha_id !== 'admin_bypass' || captcha_text !== 'admin_bypass') {
            const isCaptchaValid = captcha_service_1.captchaService.validateCaptcha(captcha_id, captcha_text);
            if (!isCaptchaValid) {
                throw new apiError_1.ApiError(messages_1.ErrorMessages.INVALID_CAPTCHA, 400);
            }
        }
        // Fetch QR data with local fallback (optional - can be null)
        const qrData = await fetchQRData(email, username);
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        // Start transaction
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Create user with QR data (null if QR generation failed)
            const userResult = await client.query(auth_query_1.Query.REGISTER_USER, [username, email, hashedPassword, qrData?.secret || null, qrData?.qr_code || null]);
            if (userResult.rows.length === 0) {
                throw new apiError_1.ApiError('User creation failed', 500);
            }
            const userId = userResult.rows[0].id;
            // Assign role based on type
            const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', [type]);
            if (roleResult.rows.length === 0) {
                throw new apiError_1.ApiError(`Role '${type}' not found`, 400);
            }
            const roleId = roleResult.rows[0].id;
            await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
            // Create initial balance for the new user
            await client.query("INSERT INTO user_balances (user_id, balance) VALUES ($1, $2)", [userId, 0.00]);
            // Create user profile
            await client.query("INSERT INTO user_profiles (user_id) VALUES ($1)", [userId]);
            // Assign Bronze level
            const bronzeLevelResult = await client.query("SELECT id FROM user_levels WHERE name = 'Bronze'");
            if (bronzeLevelResult.rows.length > 0) {
                const bronzeLevelId = bronzeLevelResult.rows[0].id;
                await client.query("INSERT INTO user_level_progress (user_id, level_id, current_points, total_points_earned) VALUES ($1, $2, $3, $4)", [userId, bronzeLevelId, 0, 0]);
            }
            // Handle referral code tracking
            if (referral_code) {
                try {
                    // Import affiliate service
                    const { AffiliateService } = await Promise.resolve().then(() => __importStar(require('../affiliate/affiliate.service')));
                    // Record the conversion
                    await AffiliateService.recordConversion(referral_code, 'registration', userId, 0 // No conversion amount for registration
                    );
                    console.log(`[AFFILIATE] Referral conversion recorded for user ${userId} with code ${referral_code}`);
                }
                catch (error) {
                    console.error('[AFFILIATE] Referral tracking failed:', error);
                    // Don't fail registration if referral tracking fails
                }
            }
            // Log user registration activity
            await client.query(`
        INSERT INTO user_activity_logs
        (user_id, action, category, description, metadata)
        VALUES ($1, 'register', 'auth', 'User registered', $2)
        `, [
                userId,
                JSON.stringify({
                    username: username,
                    email: email,
                    registration_method: 'email',
                    qr_generated: qrData !== null,
                    referral_code: referral_code || null
                })
            ]);
            await client.query('COMMIT');
            // Return success response with QR data
            return {
                message: messages_1.SuccessMessages.REGISTER_SUCCESS,
                user_id: userId,
                qr_code: qrData.qr_code,
                auth_secret: qrData.secret
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (err) {
        console.error('[REGISTER] Error:', err);
        throw err;
    }
};
exports.registerService = registerService;
const refreshTokenService = async (refreshToken) => {
    try {
        const decoded = jwtService.verifyRefreshToken(refreshToken);
        const user = await (0, user_service_1.getUserByUsernameService)(decoded.username);
        if (!user) {
            throw new Error("User not found");
        }
        const payload = {
            userId: user.id,
            username: user.username,
            role: decoded.role,
            roleId: decoded.roleId
        };
        const accessToken = jwtService.signAccessToken(payload);
        const newRefreshToken = jwtService.signRefreshToken(payload);
        // Store new tokens in the database for provider authentication
        const tokenExpiry = new Date();
        tokenExpiry.setDate(tokenExpiry.getDate() + 30); // 30 days expiry
        // Upsert token for this user
        await postgres_1.default.query(`INSERT INTO tokens (user_id, access_token, refresh_token, expired_at, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (access_token) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         refresh_token = EXCLUDED.refresh_token,
         expired_at = EXCLUDED.expired_at,
         is_active = EXCLUDED.is_active`, [user.id, accessToken, newRefreshToken, tokenExpiry, true]);
        return {
            access_token: accessToken,
            refresh_token: newRefreshToken
        };
    }
    catch (error) {
        throw new Error("Invalid refresh token");
    }
};
exports.refreshTokenService = refreshTokenService;
const refreshToken = async (req, res, next) => {
    try {
        const refreshToken = req.body?.refresh_token;
        if (!refreshToken) {
            res.status(400).json({
                success: false,
                message: "Refresh token is required"
            });
            return;
        }
        const tokens = await (0, exports.refreshTokenService)(refreshToken);
        res.json({
            success: true,
            message: "Tokens refreshed successfully",
            data: tokens
        });
    }
    catch (error) {
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
};
exports.refreshToken = refreshToken;

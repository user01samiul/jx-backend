"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.checkEmail = exports.checkUsername = exports.refreshCaptcha = exports.getCaptcha = exports.getUserRoles = exports.refreshToken = exports.register = exports.login = void 0;
const auth_service_1 = require("../../services/auth/auth.service");
const user_service_1 = require("../../services/user/user.service");
const messages_1 = require("../../constants/messages");
const captcha_service_1 = require("../../services/captcha/captcha.service");
const login = async (req, res, next) => {
    try {
        const reqBody = req.validated?.body;
        const identifier = reqBody.username;
        if (!identifier) {
            res.status(400).json({ success: false, message: 'Username or email is required' });
            return;
        }
        // Determine if identifier is an email or username
        const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identifier);
        let user;
        if (isEmail) {
            user = await (0, user_service_1.getUserByEmailService)(identifier);
        }
        else {
            user = await (0, user_service_1.getUserByUsernameService)(identifier);
        }
        if (!user) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }
        // If 2FA is enabled, require only auth_code
        if (user.is_2fa_enabled && user.auth_secret) {
            if (!reqBody.auth_code) {
                res.status(400).json({
                    success: false,
                    message: '2FA code is required for this user',
                    errors: [{ path: ['auth_code'], message: '2FA code required' }]
                });
                return;
            }
        }
        else {
            // If 2FA is not enabled, require password
            if (!reqBody.password) {
                res.status(400).json({
                    success: false,
                    message: 'Password is required for this user',
                    errors: [{ path: ['password'], message: 'Password required' }]
                });
                return;
            }
        }
        // Pass identifier as username or email, password, and auth_code as appropriate
        const response = await (0, auth_service_1.loginService)(identifier, reqBody.password, reqBody.auth_code, reqBody.role_id, req);
        res.json({ success: true, message: messages_1.SuccessMessages.LOGIN_SUCCESS, token: response });
    }
    catch (err) {
        const status = err.status || 500;
        res.status(status).json({ success: false, message: err.message || 'Internal Server Error' });
    }
};
exports.login = login;
const register = async (req, res, next) => {
    try {
        const reqBody = req.validated?.body;
        const response = await (0, auth_service_1.registerService)(reqBody);
        res.json({
            success: true,
            message: response.message,
            data: {
                qr_code: response.qr_code,
                auth_secret: response.auth_secret
            }
        });
    }
    catch (err) {
        next(err);
    }
};
exports.register = register;
// ✅ This was missing
exports.refreshToken = auth_service_1.refreshToken;
const getUserRoles = async (req, res, next) => {
    try {
        const { username } = req.query;
        if (!username || typeof username !== 'string') {
            res.status(400).json({ success: false, message: "Username is required" });
            return;
        }
        const roles = await (0, user_service_1.getUserRolesService)(username);
        res.json({ success: true, data: roles });
    }
    catch (err) {
        next(err);
    }
};
exports.getUserRoles = getUserRoles;
const getCaptcha = async (req, res, next) => {
    try {
        const captcha = captcha_service_1.captchaService.generateCaptcha();
        res.json({
            success: true,
            data: captcha
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getCaptcha = getCaptcha;
const refreshCaptcha = async (req, res, next) => {
    try {
        const captcha = captcha_service_1.captchaService.generateCaptcha();
        res.json({
            success: true,
            data: captcha
        });
    }
    catch (err) {
        next(err);
    }
};
exports.refreshCaptcha = refreshCaptcha;
const checkUsername = async (req, res, next) => {
    try {
        const { username } = req.query;
        // Validate input
        if (!username || typeof username !== 'string') {
            res.json({
                success: false,
                message: 'Username is required'
            });
            return;
        }
        if (username.length < 3) {
            res.json({
                success: false,
                message: 'Username must be at least 3 characters long'
            });
            return;
        }
        // Check database (case-insensitive)
        const existingUser = await (0, user_service_1.getUserByUsernameService)(username);
        res.json({
            success: true,
            data: {
                available: !existingUser,
                message: existingUser ? 'Username already exists' : 'Username is available'
            }
        });
    }
    catch (err) {
        console.error('Username check error:', err);
        res.status(500).json({
            success: false,
            message: 'Error checking username availability'
        });
    }
};
exports.checkUsername = checkUsername;
const checkEmail = async (req, res, next) => {
    try {
        const { email } = req.query;
        // Validate input
        if (!email || typeof email !== 'string') {
            res.json({
                success: false,
                message: 'Email is required'
            });
            return;
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.json({
                success: false,
                message: 'Invalid email format'
            });
            return;
        }
        // Check database (case-insensitive)
        const existingUser = await (0, user_service_1.getUserByEmailService)(email);
        res.json({
            success: true,
            data: {
                available: !existingUser,
                message: existingUser ? 'Email already registered' : 'Email is available'
            }
        });
    }
    catch (err) {
        console.error('Email check error:', err);
        res.status(500).json({
            success: false,
            message: 'Error checking email availability'
        });
    }
};
exports.checkEmail = checkEmail;
const forgotPassword = async (req, res, next) => {
    try {
        const reqBody = req.validated?.body;
        const { email } = reqBody;
        if (!email) {
            res.status(400).json({
                success: false,
                message: 'Email is required'
            });
            return;
        }
        const result = await (0, auth_service_1.forgotPasswordService)(email, req);
        res.json({
            success: true,
            message: result.message
        });
    }
    catch (err) {
        console.error('Forgot password error:', err);
        const status = err.status || 500;
        res.status(status).json({
            success: false,
            message: err.message || 'Failed to process password reset request'
        });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res, next) => {
    try {
        const reqBody = req.validated?.body;
        const { token, password } = reqBody;
        if (!token || !password) {
            res.status(400).json({
                success: false,
                message: 'Token and password are required'
            });
            return;
        }
        const result = await (0, auth_service_1.resetPasswordService)(token, password, req);
        res.json({
            success: true,
            message: result.message
        });
    }
    catch (err) {
        console.error('Reset password error:', err);
        const status = err.status || 500;
        res.status(status).json({
            success: false,
            message: err.message || 'Failed to reset password'
        });
    }
};
exports.resetPassword = resetPassword;

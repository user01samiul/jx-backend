"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshCaptcha = exports.getCaptcha = exports.getUserRoles = exports.refreshToken = exports.register = exports.login = void 0;
const auth_service_1 = require("../../services/auth/auth.service");
const user_service_1 = require("../../services/user/user.service");
const messages_1 = require("../../constants/messages");
const captcha_service_1 = require("../../services/captcha/captcha.service");
const login = async (req, res, next) => {
    var _a;
    try {
        const reqBody = (_a = req.validated) === null || _a === void 0 ? void 0 : _a.body;
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
    var _a;
    try {
        const reqBody = (_a = req.validated) === null || _a === void 0 ? void 0 : _a.body;
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

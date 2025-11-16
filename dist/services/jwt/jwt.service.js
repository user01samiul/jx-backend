"use strict";
// src/services/jwt.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../configs/config");
const jwt_schema_1 = require("./jwt.schema");
const apiError_1 = require("../../utils/apiError");
const messages_1 = require("../../constants/messages");
class JwtService {
    accessSecret;
    refreshSecret;
    accessTokenExpiresIn;
    refreshTokenExpiresIn;
    constructor() {
        this.accessSecret = config_1.Config.jwt.accessSecret;
        this.refreshSecret = config_1.Config.jwt.refreshSecret;
        this.accessTokenExpiresIn = config_1.Config.jwt.accessTokenExpiresIn;
        this.refreshTokenExpiresIn = config_1.Config.jwt.refreshTokenExpiresIn;
    }
    signAccessToken(payload, options = {}) {
        const accessTokenOptions = {
            expiresIn: this.accessTokenExpiresIn,
            ...options,
        };
        return jsonwebtoken_1.default.sign(payload, this.accessSecret, accessTokenOptions);
    }
    signRefreshToken(payload, options = {}) {
        const refreshTokenOptions = {
            expiresIn: this.refreshTokenExpiresIn,
            ...options,
        };
        console.log("[JWT] Signing refresh token with secret:", this.refreshSecret);
        return jsonwebtoken_1.default.sign(payload, this.refreshSecret, refreshTokenOptions);
    }
    verifyAccessToken(token, options = {}) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.accessSecret, options);
            return jwt_schema_1.TokenPayloadSchema.parse(decoded); // runtime validation
        }
        catch (err) {
            if (err.name === 'TokenExpiredError') {
                throw new apiError_1.ApiError(messages_1.ErrorMessages.EXPIRED_ACCESS_TOKEN, 401);
            }
            if (err.name === 'JsonWebTokenError') {
                throw new apiError_1.ApiError(messages_1.ErrorMessages.INVALID_ACCESS_TOKEN, 401);
            }
            throw err;
        }
    }
    verifyRefreshToken(token, options = {}) {
        try {
            console.log("[JWT] Verifying refresh token with secret:", this.refreshSecret);
            const decoded = jsonwebtoken_1.default.verify(token, this.refreshSecret, options);
            console.log("[JWT] Decoded refresh token:", decoded);
            return jwt_schema_1.TokenPayloadSchema.parse(decoded); // runtime validation
        }
        catch (err) {
            console.error("[JWT] Refresh token verification error:", err.message);
            if (err.name === 'TokenExpiredError') {
                throw new apiError_1.ApiError(messages_1.ErrorMessages.EXPIRED_REFRESH_TOKEN, 401);
            }
            if (err.name === 'JsonWebTokenError') {
                throw new apiError_1.ApiError(messages_1.ErrorMessages.INVALID_REFRESH_TOKEN, 401);
            }
            throw err;
        }
    }
    decode(token) {
        return jsonwebtoken_1.default.decode(token);
    }
}
exports.JwtService = JwtService;

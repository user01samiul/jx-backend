"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.captchaService = exports.CaptchaService = void 0;
const svg_captcha_1 = __importDefault(require("svg-captcha"));
const apiError_1 = require("../../utils/apiError");
const messages_1 = require("../../constants/messages");
// In-memory storage for captcha sessions (in production, use Redis or database)
const captchaStore = new Map();
class CaptchaService {
    static instance;
    CAPTCHA_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
    static getInstance() {
        if (!CaptchaService.instance) {
            CaptchaService.instance = new CaptchaService();
        }
        return CaptchaService.instance;
    }
    /**
     * Generate a new captcha
     */
    generateCaptcha() {
        const captcha = svg_captcha_1.default.create({
            size: 4, // 4 characters
            noise: 2, // 2 noise lines
            color: true,
            background: '#f0f0f0',
            width: 150,
            height: 50,
            fontSize: 40,
            charPreset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        });
        const captchaId = this.generateCaptchaId();
        const expiresAt = Date.now() + this.CAPTCHA_EXPIRY_TIME;
        // Store captcha data
        captchaStore.set(captchaId, {
            text: captcha.text,
            expiresAt
        });
        return {
            id: captchaId,
            svg: captcha.data
        };
    }
    /**
     * Validate captcha
     */
    validateCaptcha(captchaId, userInput) {
        const captchaData = captchaStore.get(captchaId);
        if (!captchaData) {
            throw new apiError_1.ApiError(messages_1.ErrorMessages.INVALID_CAPTCHA, 400);
        }
        // Check if captcha has expired
        if (Date.now() > captchaData.expiresAt) {
            captchaStore.delete(captchaId);
            throw new apiError_1.ApiError(messages_1.ErrorMessages.CAPTCHA_EXPIRED, 400);
        }
        // Validate user input (case-insensitive)
        const isValid = captchaData.text.toLowerCase() === userInput.toLowerCase();
        // Remove captcha after validation (one-time use)
        captchaStore.delete(captchaId);
        return isValid;
    }
    /**
     * Clean up expired captchas
     */
    cleanupExpiredCaptchas() {
        const now = Date.now();
        for (const [id, data] of captchaStore.entries()) {
            if (now > data.expiresAt) {
                captchaStore.delete(id);
            }
        }
    }
    /**
     * Generate unique captcha ID
     */
    generateCaptchaId() {
        return `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.CaptchaService = CaptchaService;
exports.captchaService = CaptchaService.getInstance();

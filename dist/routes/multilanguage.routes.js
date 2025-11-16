"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middlewares/authenticate");
const router = (0, express_1.Router)();
// Import translation service
const translation_service_1 = require("../services/multilanguage/translation.service");
/**
 * @route GET /api/multilanguage/languages
 * @desc Get all active languages
 * @access Public
 */
router.get('/languages', async (req, res, next) => {
    try {
        const languages = await (0, translation_service_1.getActiveLanguages)();
        res.json({ success: true, data: languages });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route GET /api/multilanguage/translations
 * @desc Get translations for a language
 * @query lang - Language code (e.g., 'en', 'es')
 * @query category - Optional category filter
 * @access Public
 */
router.get('/translations', async (req, res, next) => {
    try {
        const lang = req.query.lang || 'en';
        const category = req.query.category;
        const translations = await (0, translation_service_1.getTranslations)(lang, category);
        res.json({
            success: true,
            language: lang,
            data: translations
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route GET /api/multilanguage/translations/grouped
 * @desc Get translations grouped by category
 * @query lang - Language code
 * @access Public
 */
router.get('/translations/grouped', async (req, res, next) => {
    try {
        const lang = req.query.lang || 'en';
        const grouped = await (0, translation_service_1.getTranslationsByCategory)(lang);
        res.json({
            success: true,
            language: lang,
            data: grouped
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route GET /api/multilanguage/translation/:key
 * @desc Get single translation
 * @query lang - Language code
 * @access Public
 */
router.get('/translation/:key', async (req, res, next) => {
    try {
        const lang = req.query.lang || 'en';
        const value = await (0, translation_service_1.getTranslation)(req.params.key, lang);
        res.json({
            success: true,
            key: req.params.key,
            value
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route POST /api/multilanguage/user/preferred-language
 * @desc Set user's preferred language
 * @access Private
 */
router.post('/user/preferred-language', authenticate_1.authenticate, async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { language_code } = req.body;
        if (!language_code) {
            res.status(400).json({
                success: false,
                message: 'Language code is required'
            });
            return;
        }
        await (0, translation_service_1.setUserPreferredLanguage)(userId, language_code);
        res.json({
            success: true,
            message: `Preferred language updated to ${language_code}`
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route GET /api/multilanguage/user/preferred-language
 * @desc Get user's preferred language
 * @access Private
 */
router.get('/user/preferred-language', authenticate_1.authenticate, async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const language = await (0, translation_service_1.getUserPreferredLanguage)(userId);
        res.json({
            success: true,
            data: language
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;

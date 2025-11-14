import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

// Import translation service
import {
    getActiveLanguages,
    getTranslations,
    getTranslationsByCategory,
    getTranslation,
    setUserPreferredLanguage,
    getUserPreferredLanguage
} from "../services/multilanguage/translation.service";

/**
 * @route GET /api/multilanguage/languages
 * @desc Get all active languages
 * @access Public
 */
router.get('/languages', async (req, res, next) => {
    try {
        const languages = await getActiveLanguages();
        res.json({ success: true, data: languages });
    } catch (error) {
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
        const lang = (req.query.lang as string) || 'en';
        const category = req.query.category as string;

        const translations = await getTranslations(lang, category);

        res.json({
            success: true,
            language: lang,
            data: translations
        });
    } catch (error) {
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
        const lang = (req.query.lang as string) || 'en';
        const grouped = await getTranslationsByCategory(lang);

        res.json({
            success: true,
            language: lang,
            data: grouped
        });
    } catch (error) {
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
        const lang = (req.query.lang as string) || 'en';
        const value = await getTranslation(req.params.key, lang);

        res.json({
            success: true,
            key: req.params.key,
            value
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route POST /api/multilanguage/user/preferred-language
 * @desc Set user's preferred language
 * @access Private
 */
router.post('/user/preferred-language', authenticate, async (req, res, next) => {
    try {
        const userId = (req as any).user?.userId;
        const { language_code } = req.body;

        if (!language_code) {
            res.status(400).json({
                success: false,
                message: 'Language code is required'
            });
            return;
        }

        await setUserPreferredLanguage(userId, language_code);

        res.json({
            success: true,
            message: `Preferred language updated to ${language_code}`
        });
    } catch (error: any) {
        next(error);
    }
});

/**
 * @route GET /api/multilanguage/user/preferred-language
 * @desc Get user's preferred language
 * @access Private
 */
router.get('/user/preferred-language', authenticate, async (req, res, next) => {
    try {
        const userId = (req as any).user?.userId;
        const language = await getUserPreferredLanguage(userId);

        res.json({
            success: true,
            data: language
        });
    } catch (error) {
        next(error);
    }
});

export default router;

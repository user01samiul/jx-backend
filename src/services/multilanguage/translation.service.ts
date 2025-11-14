import pool from "../../db/postgres";
import { PoolClient } from "pg";

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface Language {
    id: number;
    code: string;
    name: string;
    native_name: string;
    is_active: boolean;
    is_default: boolean;
    direction: 'ltr' | 'rtl';
    flag_icon_url?: string;
    sort_order: number;
}

export interface TranslationKey {
    id: number;
    key_name: string;
    category?: string;
    description?: string;
    is_system: boolean;
}

export interface TranslationValue {
    id: number;
    translation_key_id: number;
    language_id: number;
    value: string;
    is_verified: boolean;
}

export interface Translation {
    key_name: string;
    value: string;
    category?: string;
}

export type TranslationDictionary = Record<string, string>;

// In-memory cache for translations
const translationCache: Map<string, { data: TranslationDictionary; timestamp: number }> = new Map();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

// =====================================================
// LANGUAGE MANAGEMENT
// =====================================================

/**
 * Get all active languages
 */
export async function getActiveLanguages(): Promise<Language[]> {
    const result = await pool.query(
        `SELECT * FROM languages
         WHERE is_active = TRUE
         ORDER BY sort_order, name`
    );

    return result.rows;
}

/**
 * Get language by code
 */
export async function getLanguageByCode(code: string): Promise<Language | null> {
    const result = await pool.query(
        `SELECT * FROM languages WHERE code = $1 AND is_active = TRUE`,
        [code.toLowerCase()]
    );

    return result.rows[0] || null;
}

/**
 * Get default language
 */
export async function getDefaultLanguage(): Promise<Language> {
    const result = await pool.query(
        `SELECT * FROM languages WHERE is_default = TRUE LIMIT 1`
    );

    if (result.rows.length === 0) {
        // Fallback to English
        const fallback = await pool.query(
            `SELECT * FROM languages WHERE code = 'en' LIMIT 1`
        );
        return fallback.rows[0];
    }

    return result.rows[0];
}

/**
 * Add a new language
 */
export async function addLanguage(data: {
    code: string;
    name: string;
    native_name: string;
    direction?: 'ltr' | 'rtl';
    flag_icon_url?: string;
    sort_order?: number;
}): Promise<Language> {
    const result = await pool.query(
        `INSERT INTO languages (code, name, native_name, direction, flag_icon_url, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         RETURNING *`,
        [
            data.code.toLowerCase(),
            data.name,
            data.native_name,
            data.direction || 'ltr',
            data.flag_icon_url,
            data.sort_order || 999
        ]
    );

    return result.rows[0];
}

/**
 * Update language status
 */
export async function updateLanguageStatus(
    languageId: number,
    isActive: boolean
): Promise<Language> {
    const result = await pool.query(
        `UPDATE languages
         SET is_active = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [isActive, languageId]
    );

    if (result.rows.length === 0) {
        throw new Error('Language not found');
    }

    return result.rows[0];
}

// =====================================================
// TRANSLATION MANAGEMENT
// =====================================================

/**
 * Get all translations for a language (with caching)
 * Returns a dictionary: { "key.name": "translated value", ... }
 */
export async function getTranslations(
    languageCode: string,
    category?: string
): Promise<TranslationDictionary> {
    const cacheKey = `${languageCode}:${category || 'all'}`;

    // Check cache
    const cached = translationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.data;
    }

    // Get language ID
    const language = await getLanguageByCode(languageCode);
    if (!language) {
        // Fallback to default language
        const defaultLang = await getDefaultLanguage();
        return getTranslations(defaultLang.code, category);
    }

    // Build query
    let query = `
        SELECT tk.key_name, tv.value, tk.category
        FROM translation_keys tk
        INNER JOIN translation_values tv ON tk.id = tv.translation_key_id
        WHERE tv.language_id = $1
    `;
    const params: any[] = [language.id];

    if (category) {
        query += ` AND tk.category = $2`;
        params.push(category);
    }

    query += ` ORDER BY tk.key_name`;

    const result = await pool.query(query, params);

    // Build dictionary
    const dictionary: TranslationDictionary = {};
    result.rows.forEach(row => {
        dictionary[row.key_name] = row.value;
    });

    // Cache the result
    translationCache.set(cacheKey, {
        data: dictionary,
        timestamp: Date.now()
    });

    return dictionary;
}

/**
 * Get a single translation value
 */
export async function getTranslation(
    key: string,
    languageCode: string,
    fallbackValue?: string
): Promise<string> {
    const translations = await getTranslations(languageCode);
    return translations[key] || fallbackValue || key;
}

/**
 * Get translations grouped by category
 */
export async function getTranslationsByCategory(
    languageCode: string
): Promise<Record<string, TranslationDictionary>> {
    const language = await getLanguageByCode(languageCode);
    if (!language) {
        const defaultLang = await getDefaultLanguage();
        return getTranslationsByCategory(defaultLang.code);
    }

    const result = await pool.query(
        `SELECT tk.key_name, tv.value, tk.category
         FROM translation_keys tk
         INNER JOIN translation_values tv ON tk.id = tv.translation_key_id
         WHERE tv.language_id = $1
         ORDER BY tk.category, tk.key_name`,
        [language.id]
    );

    const grouped: Record<string, TranslationDictionary> = {};

    result.rows.forEach(row => {
        const category = row.category || 'uncategorized';
        if (!grouped[category]) {
            grouped[category] = {};
        }
        grouped[category][row.key_name] = row.value;
    });

    return grouped;
}

/**
 * Add a new translation key
 */
export async function addTranslationKey(data: {
    key_name: string;
    category?: string;
    description?: string;
    is_system?: boolean;
}): Promise<TranslationKey> {
    const result = await pool.query(
        `INSERT INTO translation_keys (key_name, category, description, is_system)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [data.key_name, data.category, data.description, data.is_system || false]
    );

    return result.rows[0];
}

/**
 * Add or update a translation value
 */
export async function setTranslation(data: {
    key_name: string;
    language_code: string;
    value: string;
    is_verified?: boolean;
}): Promise<TranslationValue> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get or create translation key
        let keyResult = await client.query(
            `SELECT id FROM translation_keys WHERE key_name = $1`,
            [data.key_name]
        );

        let keyId: number;
        if (keyResult.rows.length === 0) {
            const newKey = await client.query(
                `INSERT INTO translation_keys (key_name) VALUES ($1) RETURNING id`,
                [data.key_name]
            );
            keyId = newKey.rows[0].id;
        } else {
            keyId = keyResult.rows[0].id;
        }

        // Get language ID
        const langResult = await client.query(
            `SELECT id FROM languages WHERE code = $1`,
            [data.language_code.toLowerCase()]
        );

        if (langResult.rows.length === 0) {
            throw new Error(`Language ${data.language_code} not found`);
        }

        const languageId = langResult.rows[0].id;

        // Insert or update translation value
        const result = await client.query(
            `INSERT INTO translation_values (translation_key_id, language_id, value, is_verified)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (translation_key_id, language_id)
             DO UPDATE SET value = $3, is_verified = $4, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [keyId, languageId, data.value, data.is_verified || false]
        );

        await client.query('COMMIT');

        // Clear cache
        clearTranslationCache(data.language_code);

        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Bulk set translations for multiple languages
 */
export async function setTranslationBulk(data: {
    key_name: string;
    translations: Record<string, string>; // { 'en': 'value', 'es': 'value', ... }
    category?: string;
    description?: string;
}): Promise<void> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Create or get translation key
        const keyResult = await client.query(
            `INSERT INTO translation_keys (key_name, category, description)
             VALUES ($1, $2, $3)
             ON CONFLICT (key_name) DO UPDATE SET category = $2, description = $3
             RETURNING id`,
            [data.key_name, data.category, data.description]
        );

        const keyId = keyResult.rows[0].id;

        // Insert translations for each language
        for (const [langCode, value] of Object.entries(data.translations)) {
            const langResult = await client.query(
                `SELECT id FROM languages WHERE code = $1`,
                [langCode.toLowerCase()]
            );

            if (langResult.rows.length > 0) {
                await client.query(
                    `INSERT INTO translation_values (translation_key_id, language_id, value)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (translation_key_id, language_id)
                     DO UPDATE SET value = $3, updated_at = CURRENT_TIMESTAMP`,
                    [keyId, langResult.rows[0].id, value]
                );

                clearTranslationCache(langCode);
            }
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Delete a translation key and all its values
 */
export async function deleteTranslationKey(keyName: string): Promise<boolean> {
    const result = await pool.query(
        `DELETE FROM translation_keys
         WHERE key_name = $1 AND is_system = FALSE
         RETURNING id`,
        [keyName]
    );

    if (result.rows.length > 0) {
        // Clear all caches
        translationCache.clear();
        return true;
    }

    return false;
}

/**
 * Search translations by key or value
 */
export async function searchTranslations(
    searchTerm: string,
    languageCode?: string
): Promise<Translation[]> {
    let query = `
        SELECT tk.key_name, tv.value, tk.category
        FROM translation_keys tk
        INNER JOIN translation_values tv ON tk.id = tv.translation_key_id
        WHERE (tk.key_name ILIKE $1 OR tv.value ILIKE $1)
    `;
    const params: any[] = [`%${searchTerm}%`];

    if (languageCode) {
        query += ` AND tv.language_id = (SELECT id FROM languages WHERE code = $2)`;
        params.push(languageCode.toLowerCase());
    }

    query += ` LIMIT 100`;

    const result = await pool.query(query, params);
    return result.rows;
}

// =====================================================
// USER PREFERENCES
// =====================================================

/**
 * Set user's preferred language
 */
export async function setUserPreferredLanguage(
    userId: number,
    languageCode: string
): Promise<void> {
    const language = await getLanguageByCode(languageCode);

    if (!language) {
        throw new Error(`Language ${languageCode} not found or inactive`);
    }

    await pool.query(
        `UPDATE user_profiles
         SET preferred_language_id = $1
         WHERE user_id = $2`,
        [language.id, userId]
    );
}

/**
 * Get user's preferred language
 */
export async function getUserPreferredLanguage(userId: number): Promise<Language> {
    const result = await pool.query(
        `SELECT l.* FROM languages l
         INNER JOIN user_profiles up ON l.id = up.preferred_language_id
         WHERE up.user_id = $1`,
        [userId]
    );

    if (result.rows.length === 0) {
        return getDefaultLanguage();
    }

    return result.rows[0];
}

// =====================================================
// CACHE MANAGEMENT
// =====================================================

/**
 * Clear translation cache for a specific language
 */
export function clearTranslationCache(languageCode?: string): void {
    if (languageCode) {
        // Clear all cache entries for this language
        const keysToDelete: string[] = [];
        translationCache.forEach((_, key) => {
            if (key.startsWith(`${languageCode}:`)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => translationCache.delete(key));
    } else {
        // Clear entire cache
        translationCache.clear();
    }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
    return {
        size: translationCache.size,
        keys: Array.from(translationCache.keys())
    };
}

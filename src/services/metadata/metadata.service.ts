import pool from "../../db/postgres";

// =====================================================
// CURRENCIES
// =====================================================

export async function getAllCurrencies(activeOnly: boolean = true) {
    const query = activeOnly
        ? `SELECT * FROM currencies WHERE is_active = TRUE ORDER BY sort_order, name`
        : `SELECT * FROM currencies ORDER BY sort_order, name`;

    const result = await pool.query(query);
    return result.rows;
}

export async function getCurrencyByCode(code: string) {
    const result = await pool.query(
        `SELECT * FROM currencies WHERE code = $1`,
        [code.toUpperCase()]
    );
    return result.rows[0] || null;
}

// =====================================================
// COUNTRIES
// =====================================================

export async function getAllCountries(activeOnly: boolean = true, includeRestricted: boolean = false) {
    let query = `SELECT * FROM countries WHERE 1=1`;
    const params: any[] = [];

    if (activeOnly) {
        query += ` AND is_active = TRUE`;
    }

    if (!includeRestricted) {
        query += ` AND is_restricted = FALSE`;
    }

    query += ` ORDER BY sort_order, name`;

    const result = await pool.query(query, params);
    return result.rows;
}

export async function getCountryByCode(code: string) {
    const result = await pool.query(
        `SELECT * FROM countries WHERE code = $1 OR code3 = $2`,
        [code.toUpperCase(), code.toUpperCase()]
    );
    return result.rows[0] || null;
}

export async function isCountryRestricted(countryCode: string): Promise<boolean> {
    const result = await pool.query(
        `SELECT is_restricted FROM countries WHERE code = $1`,
        [countryCode.toUpperCase()]
    );

    if (result.rows.length === 0) return false;
    return result.rows[0].is_restricted;
}

// =====================================================
// MOBILE PREFIXES
// =====================================================

export async function getAllMobilePrefixes(activeOnly: boolean = true) {
    const query = activeOnly
        ? `SELECT * FROM mobile_prefixes WHERE is_active = TRUE ORDER BY prefix`
        : `SELECT * FROM mobile_prefixes ORDER BY prefix`;

    const result = await pool.query(query);
    return result.rows;
}

export async function getPrefixesByCountry(countryCode: string) {
    const result = await pool.query(
        `SELECT * FROM mobile_prefixes WHERE country_code = $1 AND is_active = TRUE`,
        [countryCode.toUpperCase()]
    );
    return result.rows;
}

export async function getCountryByPrefix(prefix: string) {
    const result = await pool.query(
        `SELECT * FROM mobile_prefixes WHERE prefix = $1 AND is_active = TRUE LIMIT 1`,
        [prefix]
    );
    return result.rows[0] || null;
}

// =====================================================
// EXCHANGE RATES (Update function for cron)
// =====================================================

export async function updateExchangeRates(rates: Record<string, number>) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const [currency, rate] of Object.entries(rates)) {
            await client.query(
                `UPDATE currencies
                 SET exchange_rate_to_usd = $1,
                     last_rate_update = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE code = $2`,
                [rate, currency.toUpperCase()]
            );
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

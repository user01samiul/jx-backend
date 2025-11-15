"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCurrencies = getAllCurrencies;
exports.getCurrencyByCode = getCurrencyByCode;
exports.getAllCountries = getAllCountries;
exports.getCountryByCode = getCountryByCode;
exports.isCountryRestricted = isCountryRestricted;
exports.getAllMobilePrefixes = getAllMobilePrefixes;
exports.getPrefixesByCountry = getPrefixesByCountry;
exports.getCountryByPrefix = getCountryByPrefix;
exports.updateExchangeRates = updateExchangeRates;
const postgres_1 = __importDefault(require("../../db/postgres"));
// =====================================================
// CURRENCIES
// =====================================================
async function getAllCurrencies(activeOnly = true) {
    const query = activeOnly
        ? `SELECT * FROM currencies WHERE is_active = TRUE ORDER BY sort_order, name`
        : `SELECT * FROM currencies ORDER BY sort_order, name`;
    const result = await postgres_1.default.query(query);
    return result.rows;
}
async function getCurrencyByCode(code) {
    const result = await postgres_1.default.query(`SELECT * FROM currencies WHERE code = $1`, [code.toUpperCase()]);
    return result.rows[0] || null;
}
// =====================================================
// COUNTRIES
// =====================================================
async function getAllCountries(activeOnly = true, includeRestricted = false) {
    let query = `SELECT * FROM countries WHERE 1=1`;
    const params = [];
    if (activeOnly) {
        query += ` AND is_active = TRUE`;
    }
    if (!includeRestricted) {
        query += ` AND is_restricted = FALSE`;
    }
    query += ` ORDER BY sort_order, name`;
    const result = await postgres_1.default.query(query, params);
    return result.rows;
}
async function getCountryByCode(code) {
    const result = await postgres_1.default.query(`SELECT * FROM countries WHERE code = $1 OR code3 = $2`, [code.toUpperCase(), code.toUpperCase()]);
    return result.rows[0] || null;
}
async function isCountryRestricted(countryCode) {
    const result = await postgres_1.default.query(`SELECT is_restricted FROM countries WHERE code = $1`, [countryCode.toUpperCase()]);
    if (result.rows.length === 0)
        return false;
    return result.rows[0].is_restricted;
}
// =====================================================
// MOBILE PREFIXES
// =====================================================
async function getAllMobilePrefixes(activeOnly = true) {
    const query = activeOnly
        ? `SELECT * FROM mobile_prefixes WHERE is_active = TRUE ORDER BY prefix`
        : `SELECT * FROM mobile_prefixes ORDER BY prefix`;
    const result = await postgres_1.default.query(query);
    return result.rows;
}
async function getPrefixesByCountry(countryCode) {
    const result = await postgres_1.default.query(`SELECT * FROM mobile_prefixes WHERE country_code = $1 AND is_active = TRUE`, [countryCode.toUpperCase()]);
    return result.rows;
}
async function getCountryByPrefix(prefix) {
    const result = await postgres_1.default.query(`SELECT * FROM mobile_prefixes WHERE prefix = $1 AND is_active = TRUE LIMIT 1`, [prefix]);
    return result.rows[0] || null;
}
// =====================================================
// EXCHANGE RATES (Update function for cron)
// =====================================================
async function updateExchangeRates(rates) {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        for (const [currency, rate] of Object.entries(rates)) {
            await client.query(`UPDATE currencies
                 SET exchange_rate_to_usd = $1,
                     last_rate_update = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE code = $2`, [rate, currency.toUpperCase()]);
        }
        await client.query('COMMIT');
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}

"use strict";
/**
 * Currency formatting and parsing utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyUtils = void 0;
class CurrencyUtils {
    static DEFAULT_OPTIONS = {
        currency: 'USD',
        locale: 'en-US',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        showSymbol: true
    };
    /**
     * Format a number as currency
     */
    static format(amount, options = {}) {
        const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
        if (!finalOptions.showSymbol) {
            // Return just the number with proper decimal places
            return amount.toFixed(finalOptions.maximumFractionDigits);
        }
        return new Intl.NumberFormat(finalOptions.locale, {
            style: 'currency',
            currency: finalOptions.currency,
            minimumFractionDigits: finalOptions.minimumFractionDigits,
            maximumFractionDigits: finalOptions.maximumFractionDigits
        }).format(amount);
    }
    /**
     * Parse a currency string to number
     */
    static parse(amount) {
        if (typeof amount === 'number') {
            return amount;
        }
        if (typeof amount === 'string') {
            // Handle malformed amounts with multiple decimal points
            // Example: "570.441.00" -> "570.44"
            let cleanAmount = amount.replace(/[^\d.-]/g, '');
            // If there are multiple decimal points, keep only the last one
            const decimalPoints = (cleanAmount.match(/\./g) || []).length;
            if (decimalPoints > 1) {
                const parts = cleanAmount.split('.');
                // Keep the first part and the last part (decimal places)
                cleanAmount = parts[0] + '.' + parts[parts.length - 1];
                console.warn(`[CURRENCY_UTILS] Fixed malformed amount "${amount}" to "${cleanAmount}"`);
            }
            const parsed = parseFloat(cleanAmount);
            if (isNaN(parsed) || !isFinite(parsed)) {
                console.error(`[CURRENCY_UTILS] Failed to parse amount: "${amount}" -> "${cleanAmount}" -> ${parsed}`);
                return 0;
            }
            return parsed;
        }
        return 0;
    }
    /**
     * Safely parse a balance value, handling null, undefined, and NaN
     */
    static safeParseBalance(balance) {
        if (balance === null || balance === undefined) {
            return 0;
        }
        const parsed = this.parse(balance);
        if (isNaN(parsed) || !isFinite(parsed)) {
            console.warn(`[CURRENCY_UTILS] Invalid balance value: "${balance}", defaulting to 0`);
            return 0;
        }
        return parsed;
    }
    /**
     * Validate if an amount is a valid currency value
     */
    static isValid(amount) {
        const parsed = this.parse(amount);
        return !isNaN(parsed) && isFinite(parsed) && parsed >= 0;
    }
    /**
     * Round amount to specified decimal places
     */
    static round(amount, decimals = 2) {
        return Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
    /**
     * Format amount for display (with symbol)
     */
    static formatForDisplay(amount, currency = 'USD') {
        return this.format(amount, { currency, showSymbol: true });
    }
    /**
     * Format amount for storage (without symbol)
     */
    static formatForStorage(amount, decimals = 2) {
        return this.format(amount, { showSymbol: false, maximumFractionDigits: decimals });
    }
    /**
     * Format amount for API responses
     */
    static formatForApi(amount, currency = 'USD') {
        return this.format(amount, { currency, showSymbol: false });
    }
    /**
     * Compare two currency amounts with tolerance for floating point errors
     */
    static equals(amount1, amount2, tolerance = 0.01) {
        return Math.abs(amount1 - amount2) < tolerance;
    }
    /**
     * Add two currency amounts
     */
    static add(amount1, amount2) {
        return this.round(amount1 + amount2);
    }
    /**
     * Subtract two currency amounts
     */
    static subtract(amount1, amount2) {
        return this.round(amount1 - amount2);
    }
    /**
     * Multiply currency amount by multiplier
     */
    static multiply(amount, multiplier) {
        return this.round(amount * multiplier);
    }
    /**
     * Divide currency amount by divisor
     */
    static divide(amount, divisor) {
        if (divisor === 0) {
            throw new Error('Cannot divide by zero');
        }
        return this.round(amount / divisor);
    }
    /**
     * Get the absolute value of a currency amount
     */
    static abs(amount) {
        return Math.abs(amount);
    }
    /**
     * Check if amount is positive
     */
    static isPositive(amount) {
        return amount > 0;
    }
    /**
     * Check if amount is negative
     */
    static isNegative(amount) {
        return amount < 0;
    }
    /**
     * Check if amount is zero
     */
    static isZero(amount) {
        return this.equals(amount, 0);
    }
    /**
     * Get the minimum of two amounts
     */
    static min(amount1, amount2) {
        return Math.min(amount1, amount2);
    }
    /**
     * Get the maximum of two amounts
     */
    static max(amount1, amount2) {
        return Math.max(amount1, amount2);
    }
    /**
     * Clamp amount between min and max values
     */
    static clamp(amount, min, max) {
        return this.max(min, this.min(amount, max));
    }
    /**
     * Calculate percentage of total
     */
    static percentage(part, total) {
        if (total === 0) {
            return 0;
        }
        return this.round((part / total) * 100, 2);
    }
    /**
     * Calculate percentage amount
     */
    static percentageOf(percentage, total) {
        return this.round((percentage / 100) * total);
    }
}
exports.CurrencyUtils = CurrencyUtils;

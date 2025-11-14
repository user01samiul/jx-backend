import { Request, Response, NextFunction } from "express";
import {
    getAllCurrencies,
    getCurrencyByCode,
    getAllCountries,
    getCountryByCode,
    isCountryRestricted,
    getAllMobilePrefixes,
    getPrefixesByCountry,
    getCountryByPrefix
} from "../../services/metadata/metadata.service";

/**
 * @route GET /api/metadata/currencies
 * @desc Get all currencies
 * @access Public
 */
export const getCurrencies = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const activeOnly = req.query.active_only !== 'false';
        const currencies = await getAllCurrencies(activeOnly);

        res.status(200).json({
            success: true,
            data: currencies,
            count: currencies.length
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route GET /api/metadata/currencies/:code
 * @desc Get currency by code
 * @access Public
 */
export const getCurrency = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const currency = await getCurrencyByCode(req.params.code);

        if (!currency) {
            res.status(404).json({
                success: false,
                message: 'Currency not found'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: currency
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route GET /api/metadata/countries
 * @desc Get all countries
 * @access Public
 */
export const getCountries = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const activeOnly = req.query.active_only !== 'false';
        const includeRestricted = req.query.include_restricted === 'true';
        const countries = await getAllCountries(activeOnly, includeRestricted);

        res.status(200).json({
            success: true,
            data: countries,
            count: countries.length
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route GET /api/metadata/countries/:code
 * @desc Get country by code
 * @access Public
 */
export const getCountry = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const country = await getCountryByCode(req.params.code);

        if (!country) {
            res.status(404).json({
                success: false,
                message: 'Country not found'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: country
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route GET /api/metadata/countries/:code/restricted
 * @desc Check if country is restricted
 * @access Public
 */
export const checkCountryRestriction = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const isRestricted = await isCountryRestricted(req.params.code);

        res.status(200).json({
            success: true,
            data: {
                country_code: req.params.code.toUpperCase(),
                is_restricted: isRestricted
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route GET /api/metadata/mobile-prefixes
 * @desc Get all mobile prefixes
 * @access Public
 */
export const getMobilePrefixes = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const activeOnly = req.query.active_only !== 'false';
        const prefixes = await getAllMobilePrefixes(activeOnly);

        res.status(200).json({
            success: true,
            data: prefixes,
            count: prefixes.length
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route GET /api/metadata/mobile-prefixes/country/:code
 * @desc Get prefixes by country code
 * @access Public
 */
export const getPrefixesByCountryCode = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const prefixes = await getPrefixesByCountry(req.params.code);

        res.status(200).json({
            success: true,
            data: prefixes,
            count: prefixes.length
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route GET /api/metadata/mobile-prefixes/:prefix/country
 * @desc Get country by prefix
 * @access Public
 */
export const getCountryByMobilePrefix = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const result = await getCountryByPrefix(req.params.prefix);

        if (!result) {
            res.status(404).json({
                success: false,
                message: 'Prefix not found'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

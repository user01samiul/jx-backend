"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCountryByMobilePrefix = exports.getPrefixesByCountryCode = exports.getMobilePrefixes = exports.checkCountryRestriction = exports.getCountry = exports.getCountries = exports.getCurrency = exports.getCurrencies = void 0;
const metadata_service_1 = require("../../services/metadata/metadata.service");
/**
 * @route GET /api/metadata/currencies
 * @desc Get all currencies
 * @access Public
 */
const getCurrencies = async (req, res, next) => {
    try {
        const activeOnly = req.query.active_only !== 'false';
        const currencies = await (0, metadata_service_1.getAllCurrencies)(activeOnly);
        res.status(200).json({
            success: true,
            data: currencies,
            count: currencies.length
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getCurrencies = getCurrencies;
/**
 * @route GET /api/metadata/currencies/:code
 * @desc Get currency by code
 * @access Public
 */
const getCurrency = async (req, res, next) => {
    try {
        const currency = await (0, metadata_service_1.getCurrencyByCode)(req.params.code);
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
    }
    catch (error) {
        next(error);
    }
};
exports.getCurrency = getCurrency;
/**
 * @route GET /api/metadata/countries
 * @desc Get all countries
 * @access Public
 */
const getCountries = async (req, res, next) => {
    try {
        const activeOnly = req.query.active_only !== 'false';
        const includeRestricted = req.query.include_restricted === 'true';
        const countries = await (0, metadata_service_1.getAllCountries)(activeOnly, includeRestricted);
        res.status(200).json({
            success: true,
            data: countries,
            count: countries.length
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getCountries = getCountries;
/**
 * @route GET /api/metadata/countries/:code
 * @desc Get country by code
 * @access Public
 */
const getCountry = async (req, res, next) => {
    try {
        const country = await (0, metadata_service_1.getCountryByCode)(req.params.code);
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
    }
    catch (error) {
        next(error);
    }
};
exports.getCountry = getCountry;
/**
 * @route GET /api/metadata/countries/:code/restricted
 * @desc Check if country is restricted
 * @access Public
 */
const checkCountryRestriction = async (req, res, next) => {
    try {
        const isRestricted = await (0, metadata_service_1.isCountryRestricted)(req.params.code);
        res.status(200).json({
            success: true,
            data: {
                country_code: req.params.code.toUpperCase(),
                is_restricted: isRestricted
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.checkCountryRestriction = checkCountryRestriction;
/**
 * @route GET /api/metadata/mobile-prefixes
 * @desc Get all mobile prefixes
 * @access Public
 */
const getMobilePrefixes = async (req, res, next) => {
    try {
        const activeOnly = req.query.active_only !== 'false';
        const prefixes = await (0, metadata_service_1.getAllMobilePrefixes)(activeOnly);
        res.status(200).json({
            success: true,
            data: prefixes,
            count: prefixes.length
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMobilePrefixes = getMobilePrefixes;
/**
 * @route GET /api/metadata/mobile-prefixes/country/:code
 * @desc Get prefixes by country code
 * @access Public
 */
const getPrefixesByCountryCode = async (req, res, next) => {
    try {
        const prefixes = await (0, metadata_service_1.getPrefixesByCountry)(req.params.code);
        res.status(200).json({
            success: true,
            data: prefixes,
            count: prefixes.length
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPrefixesByCountryCode = getPrefixesByCountryCode;
/**
 * @route GET /api/metadata/mobile-prefixes/:prefix/country
 * @desc Get country by prefix
 * @access Public
 */
const getCountryByMobilePrefix = async (req, res, next) => {
    try {
        const result = await (0, metadata_service_1.getCountryByPrefix)(req.params.prefix);
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
    }
    catch (error) {
        next(error);
    }
};
exports.getCountryByMobilePrefix = getCountryByMobilePrefix;

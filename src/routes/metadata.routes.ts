import { Router } from "express";
import {
    getCurrencies,
    getCurrency,
    getCountries,
    getCountry,
    checkCountryRestriction,
    getMobilePrefixes,
    getPrefixesByCountryCode,
    getCountryByMobilePrefix
} from "../api/metadata/metadata.controller";

const router = Router();

// Currencies
router.get('/currencies', getCurrencies);
router.get('/currencies/:code', getCurrency);

// Countries
router.get('/countries', getCountries);
router.get('/countries/:code', getCountry);
router.get('/countries/:code/restricted', checkCountryRestriction);

// Mobile Prefixes
router.get('/mobile-prefixes', getMobilePrefixes);
router.get('/mobile-prefixes/country/:code', getPrefixesByCountryCode);
router.get('/mobile-prefixes/:prefix/country', getCountryByMobilePrefix);

export default router;

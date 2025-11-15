"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const metadata_controller_1 = require("../api/metadata/metadata.controller");
const router = (0, express_1.Router)();
// Currencies
router.get('/currencies', metadata_controller_1.getCurrencies);
router.get('/currencies/:code', metadata_controller_1.getCurrency);
// Countries
router.get('/countries', metadata_controller_1.getCountries);
router.get('/countries/:code', metadata_controller_1.getCountry);
router.get('/countries/:code/restricted', metadata_controller_1.checkCountryRestriction);
// Mobile Prefixes
router.get('/mobile-prefixes', metadata_controller_1.getMobilePrefixes);
router.get('/mobile-prefixes/country/:code', metadata_controller_1.getPrefixesByCountryCode);
router.get('/mobile-prefixes/:prefix/country', metadata_controller_1.getCountryByMobilePrefix);
exports.default = router;

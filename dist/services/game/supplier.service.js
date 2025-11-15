"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupplierGameList = void 0;
const axios_1 = __importDefault(require("axios"));
const SUPPLIER_API_KEY = process.env.SUPPLIER_API_KEY;
const SUPPLIER_SECRET_KEY = process.env.SUPPLIER_SECRET_KEY;
const SUPPLIER_GAME_LIST_URL = process.env.SUPPLIER_GAME_LIST_URL;
if (!SUPPLIER_API_KEY || !SUPPLIER_SECRET_KEY || !SUPPLIER_GAME_LIST_URL) {
    throw new Error('Missing supplier API credentials or URL in environment variables');
}
/**
 * Fetch the game list from the supplier's API
 */
const getSupplierGameList = async () => {
    try {
        // If the supplier requires custom headers, update here
        const headers = {
            'Content-Type': 'application/json',
            'apiKey': SUPPLIER_API_KEY,
            'secretKey': SUPPLIER_SECRET_KEY
        };
        const response = await axios_1.default.get(SUPPLIER_GAME_LIST_URL, { headers });
        return response.data;
    }
    catch (error) {
        throw new Error('Failed to fetch supplier game list: ' + (error.response?.data?.message || error.message));
    }
};
exports.getSupplierGameList = getSupplierGameList;

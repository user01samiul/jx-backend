"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.string().default('3000'),
    NODE_ENV: zod_1.z.enum(['development', 'production']).default('development'),
    DB_PORT: zod_1.z.string(),
    DB_HOST: zod_1.z.string(),
    DB_USER: zod_1.z.string(),
    DB_PASS: zod_1.z.string(),
    DB_NAME: zod_1.z.string(),
    MONGO_URI: zod_1.z.string(),
    JWT_ACCESS_SECRET: zod_1.z.string(),
    JWT_REFRESH_SECRET: zod_1.z.string(),
    JWT_ACCESS_TOKEN_EXPIRES: zod_1.z.string().regex(/^[0-9]+[smhdwy]$/, "Must be a valid JWT duration like 1h, 15m, 7d").default('24h'), // 24 hours
    JWT_REFRESH_TOKEN_EXPIRES: zod_1.z.string().regex(/^[0-9]+[smhdwy]$/, "Must be a valid JWT duration like 7d, 30d").default('30d'), // 30 days
    SWAGGER_PASSWORD: zod_1.z.string().default('admin123'),
    // Supplier/Provider Configuration
    SUPPLIER_API_KEY: zod_1.z.string(),
    SUPPLIER_SECRET_KEY: zod_1.z.string(),
    SUPPLIER_GAME_LIST_URL: zod_1.z.string(),
    SUPPLIER_LAUNCH_HOST: zod_1.z.string(),
    SUPPLIER_CALLBACK_URL: zod_1.z.string(),
    SUPPLIER_OPERATOR_ID: zod_1.z.string(),
    OPERATOR_HOME_URL: zod_1.z.string(),
    GGR_FILTER_PERCENT: zod_1.z.string().transform(val => parseFloat(val)).default('0.5'),
    GGR_TOLERANCE: zod_1.z.string().transform(val => parseFloat(val)).default('0.05'),
    PROVIDER_GGR_ENDPOINT: zod_1.z.string(),
    PROVIDER_API_KEY: zod_1.z.string(),
    // Rate Limiting Configuration
    RATE_LIMIT_STANDARD_MAX: zod_1.z.string().transform(val => parseInt(val)).default('999999'),
    RATE_LIMIT_STANDARD_WINDOW_MS: zod_1.z.string().transform(val => parseInt(val)).default('900000'),
    RATE_LIMIT_STRICT_MAX: zod_1.z.string().transform(val => parseInt(val)).default('999999'),
    RATE_LIMIT_STRICT_WINDOW_MS: zod_1.z.string().transform(val => parseInt(val)).default('60000'),
    RATE_LIMIT_PROVIDER_MAX: zod_1.z.string().transform(val => parseInt(val)).default('999999'),
    RATE_LIMIT_PROVIDER_WINDOW_MS: zod_1.z.string().transform(val => parseInt(val)).default('60000'),
    RATE_LIMIT_AUTH_MAX: zod_1.z.string().transform(val => parseInt(val)).default('999999'),
    RATE_LIMIT_AUTH_WINDOW_MS: zod_1.z.string().transform(val => parseInt(val)).default('900000'),
});
const _env = envSchema.safeParse(process.env);
if (!_env.success) {
    console.error('Invalid environment variables:', _env.error.format());
    process.exit(1);
}
exports.env = _env.data;

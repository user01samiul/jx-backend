"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminCreateUserSchema = exports.RegisterSchema = exports.AuthHeaderSchema = exports.LoginSchema = void 0;
const zod_1 = require("zod");
const messages_1 = require("../../constants/messages");
exports.LoginSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .min(3, messages_1.ErrorMessages.INVALID_CREDENTIALS),
    password: zod_1.z.string().optional(),
    auth_code: zod_1.z.string().optional(),
    role_id: zod_1.z.number().optional().describe("Optional role ID to login with specific role. If not provided, defaults to Player role."),
}).refine((data) => data.password || data.auth_code, {
    message: 'Either password or auth_code is required',
    path: ['password', 'auth_code'],
});
exports.AuthHeaderSchema = zod_1.z.object({
    authorization: zod_1.z.string().startsWith("Bearer "),
});
exports.RegisterSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .min(5, messages_1.ErrorMessages.INVALID_USERNAME),
    email: zod_1.z.string().email(messages_1.ErrorMessages.INVALID_EMAIL),
    password: zod_1.z
        .string()
        .min(8, messages_1.ErrorMessages.INVALID_PASSWORD),
    type: zod_1.z
        .string()
        .min(3, 'Role type must be at least 3 characters')
        .describe('Role to assign to the user (e.g., Player, Admin, Support, etc.). Must match a role in the roles table.'),
    captcha_id: zod_1.z
        .string()
        .min(1, 'Captcha ID is required'),
    captcha_text: zod_1.z
        .string()
        .min(1, 'Captcha text is required')
        .max(10, 'Captcha text is too long'),
    referral_code: zod_1.z
        .string()
        .optional()
        .describe('Optional referral code for affiliate tracking'),
});
// Admin user creation schema (no captcha required)
exports.AdminCreateUserSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .min(5, messages_1.ErrorMessages.INVALID_USERNAME),
    email: zod_1.z.string().email(messages_1.ErrorMessages.INVALID_EMAIL),
    password: zod_1.z
        .string()
        .min(8, messages_1.ErrorMessages.INVALID_PASSWORD),
    type: zod_1.z
        .string()
        .min(3, 'Role type must be at least 3 characters')
        .describe('Role to assign to the user (e.g., Player, Admin, Support, etc.). Must match a role in the roles table.'),
    first_name: zod_1.z.string().optional(),
    last_name: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
    timezone: zod_1.z.string().optional(),
    is_active: zod_1.z.boolean().default(true),
    send_welcome_email: zod_1.z.boolean().default(false),
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangePasswordInputType = exports.ChangePasswordInput = exports.Skip2FAInput = exports.UpdateProfileInputType = exports.UpdateProfileInput = void 0;
const zod_1 = require("zod");
// =====================================================
// USER PROFILE UPDATE SCHEMAS
// =====================================================
exports.UpdateProfileInput = zod_1.z.object({
    first_name: zod_1.z.string().max(100).optional().transform(val => val === "" ? undefined : val),
    last_name: zod_1.z.string().max(100).optional().transform(val => val === "" ? undefined : val),
    phone_number: zod_1.z.string().max(20).optional().transform(val => val === "" ? undefined : val),
    date_of_birth: zod_1.z.string().optional().transform(val => {
        if (val === "" || val === null || val === undefined)
            return undefined;
        // Only validate format if a value is provided
        if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            throw new Error("Date must be in YYYY-MM-DD format");
        }
        return val;
    }),
    nationality: zod_1.z.string().max(100).optional().transform(val => val === "" ? undefined : val),
    country: zod_1.z.string().max(100).optional().transform(val => val === "" ? undefined : val),
    city: zod_1.z.string().max(100).optional().transform(val => val === "" ? undefined : val),
    address: zod_1.z.string().max(500).optional().transform(val => val === "" ? undefined : val),
    postal_code: zod_1.z.string().max(20).optional().transform(val => val === "" ? undefined : val),
    gender: zod_1.z.enum(["male", "female", "other"]).optional().transform(val => val === "" ? undefined : val),
    timezone: zod_1.z.string().max(50).optional().transform(val => val === "" ? undefined : val),
    language: zod_1.z.string().max(10).optional().transform(val => val === "" ? undefined : val),
    currency: zod_1.z.string().max(3).optional().transform(val => val === "" ? undefined : val)
});
exports.UpdateProfileInputType = (zod_1.z.infer);
// =====================================================
// 2FA MANAGEMENT SCHEMAS
// =====================================================
// Note: Enable and Disable 2FA endpoints don't require any input parameters
// They simply toggle the is_2fa_enabled flag in the database
exports.Skip2FAInput = zod_1.z.object({
    password: zod_1.z.string().min(1, "Password is required")
});
// =====================================================
// PASSWORD CHANGE SCHEMAS
// =====================================================
exports.ChangePasswordInput = zod_1.z.object({
    current_password: zod_1.z.string().min(1, "Current password is required"),
    new_password: zod_1.z.string().min(8, "New password must be at least 8 characters"),
    confirm_password: zod_1.z.string().min(1, "Password confirmation is required")
}).refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"]
});
exports.ChangePasswordInputType = (zod_1.z.infer);

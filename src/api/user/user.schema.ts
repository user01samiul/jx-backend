import { z } from "zod";

// =====================================================
// USER PROFILE UPDATE SCHEMAS
// =====================================================

export const UpdateProfileInput = z.object({
  first_name: z.string().max(100).optional().transform(val => val === "" ? undefined : val),
  last_name: z.string().max(100).optional().transform(val => val === "" ? undefined : val),
  phone_number: z.string().max(20).optional().transform(val => val === "" ? undefined : val),
  date_of_birth: z.string().optional().transform(val => {
    if (val === "" || val === null || val === undefined) return undefined;
    // Only validate format if a value is provided
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      throw new Error("Date must be in YYYY-MM-DD format");
    }
    return val;
  }),
  nationality: z.string().max(100).optional().transform(val => val === "" ? undefined : val),
  country: z.string().max(100).optional().transform(val => val === "" ? undefined : val),
  city: z.string().max(100).optional().transform(val => val === "" ? undefined : val),
  address: z.string().max(500).optional().transform(val => val === "" ? undefined : val),
  postal_code: z.string().max(20).optional().transform(val => val === "" ? undefined : val),
  gender: z.enum(["male", "female", "other"]).optional().transform(val => val === "" ? undefined : val),
  timezone: z.string().max(50).optional().transform(val => val === "" ? undefined : val),
  language: z.string().max(10).optional().transform(val => val === "" ? undefined : val),
  currency: z.string().max(3).optional().transform(val => val === "" ? undefined : val)
});

export const UpdateProfileInputType = z.infer<typeof UpdateProfileInput>;

// =====================================================
// 2FA MANAGEMENT SCHEMAS
// =====================================================

// Note: Enable and Disable 2FA endpoints don't require any input parameters
// They simply toggle the is_2fa_enabled flag in the database

export const Skip2FAInput = z.object({
  password: z.string().min(1, "Password is required")
});

export type Skip2FAInputType = z.infer<typeof Skip2FAInput>;

// =====================================================
// PASSWORD CHANGE SCHEMAS
// =====================================================

export const ChangePasswordInput = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(8, "New password must be at least 8 characters"),
  confirm_password: z.string().min(1, "Password confirmation is required")
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
});

export const ChangePasswordInputType = z.infer<typeof ChangePasswordInput>; 
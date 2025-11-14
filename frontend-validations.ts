/**
 * Frontend Validation Schemas
 *
 * This file contains all validation schemas for the JackpotX frontend.
 * Use these with Zod or convert to Yup/Joi as needed.
 *
 * Generated from: jx_backend validation schemas
 * Date: 2025-11-14
 */

import { z } from "zod";

// ==========================================
// ERROR MESSAGES
// ==========================================

export const ErrorMessages = {
  USER_NOT_FOUND: "User not found.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  SERVER_ERROR: "Something went wrong. Please try again.",
  INTERNAL_SERVER_ERROR: "Internal server error. Please try again later.",
  INVALID_EMAIL: "Invalid email format",
  INVALID_USERNAME: "Username minimum 5 characters",
  INVALID_PASSWORD: "Password minimum 8 characters",
  EXPIRED_ACCESS_TOKEN: "Access token expired",
  INVALID_ACCESS_TOKEN: "Invalid access token",
  EXPIRED_REFRESH_TOKEN: "Refresh token expired",
  INVALID_REFRESH_TOKEN: "Invalid refresh token",
  INVALID_CAPTCHA: "Invalid captcha",
  CAPTCHA_EXPIRED: "Captcha has expired",
  CAPTCHA_REQUIRED: "Captcha is required",
  QR_GENERATION_FAILED: "Failed to generate QR code",
  INVALID_2FA_CODE: "Invalid 2FA authentication code",
  TWOFA_REQUIRED: "2FA authentication code is required",
} as const;

export const SuccessMessages = {
  USER_CREATED: "User created successfully.",
  REGISTER_SUCCESS: "Registered Successfully",
  LOGIN_SUCCESS: "Login Successfully"
} as const;

// ==========================================
// ENUMS
// ==========================================

export const UserStatus = ["Active", "Inactive", "Suspended", "Banned"] as const;
export const UserRoles = ["Player", "Admin", "Support", "Manager"] as const;
export const Gender = ["male", "female", "other"] as const;
export const TransactionTypes = ["deposit", "withdrawal", "bet", "win", "bonus", "cashback", "refund", "adjustment"] as const;
export const TransactionStatus = ["pending", "completed", "failed", "cancelled"] as const;
export const PaymentGatewayType = ["deposit", "withdrawal", "both"] as const;
export const GameVolatility = ["low", "medium", "high"] as const;
export const PromotionTypes = ["welcome_bonus", "deposit_bonus", "free_spins", "cashback", "reload_bonus", "tournament"] as const;
export const PromotionStatus = ["active", "completed", "expired", "cancelled"] as const;
export const BetOutcome = ["win", "lose"] as const;
export const KYCStatus = ["approved", "rejected"] as const;

// ==========================================
// AUTHENTICATION SCHEMAS
// ==========================================

export const LoginSchema = z.object({
  username: z.string().min(3, ErrorMessages.INVALID_CREDENTIALS),
  password: z.string().optional(),
  auth_code: z.string().optional(),
  role_id: z.number().optional(),
}).refine((data) => data.password || data.auth_code, {
  message: 'Either password or auth_code is required',
  path: ['password', 'auth_code'],
});

export const RegisterSchema = z.object({
  username: z.string().min(5, ErrorMessages.INVALID_USERNAME),
  email: z.string().email(ErrorMessages.INVALID_EMAIL),
  password: z.string().min(8, ErrorMessages.INVALID_PASSWORD),
  type: z.string().min(3, 'Role type must be at least 3 characters'),
  captcha_id: z.string().min(1, 'Captcha ID is required'),
  captcha_text: z.string().min(1, 'Captcha text is required').max(10, 'Captcha text is too long'),
  referral_code: z.string().optional(),
});

export const AdminCreateUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"), // Dev: 3, Prod: 5
  email: z.string().email("Invalid email format"),
  password: z.string().min(4, "Password must be at least 4 characters"), // Dev: 4, Prod: 8
  type: z.string().min(3, "Role type must be at least 3 characters"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  is_active: z.boolean().default(true),
  send_welcome_email: z.boolean().default(false),
});

// ==========================================
// USER PROFILE SCHEMAS
// ==========================================

export const UpdateProfileSchema = z.object({
  first_name: z.string().max(100).optional().transform(val => val === "" ? undefined : val),
  last_name: z.string().max(100).optional().transform(val => val === "" ? undefined : val),
  phone_number: z.string().max(20).optional().transform(val => val === "" ? undefined : val),
  date_of_birth: z.string().optional().transform(val => {
    if (val === "" || val === null || val === undefined) return undefined;
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
  gender: z.enum(Gender).optional().transform(val => val === "" ? undefined : val),
  timezone: z.string().max(50).optional().transform(val => val === "" ? undefined : val),
  language: z.string().max(10).optional().transform(val => val === "" ? undefined : val),
  currency: z.string().max(3).optional().transform(val => val === "" ? undefined : val)
});

export const ChangePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(8, "New password must be at least 8 characters"),
  confirm_password: z.string().min(1, "Password confirmation is required")
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
});

export const Skip2FASchema = z.object({
  password: z.string().min(1, "Password is required")
});

// ==========================================
// GAME SCHEMAS
// ==========================================

export const PlaceBetSchema = z.object({
  game_id: z.number().positive("Game ID must be a positive number"),
  bet_amount: z.number().positive("Bet amount must be positive"),
  game_data: z.any().optional(),
  user_id: z.number().positive("User ID must be a positive number").optional(),
});

export const ProcessBetResultSchema = z.object({
  bet_id: z.number().positive("Bet ID must be a positive number"),
  outcome: z.enum(BetOutcome, {
    errorMap: () => ({ message: "Outcome must be either 'win' or 'lose'" })
  }),
  win_amount: z.number().min(0, "Win amount must be non-negative").optional(),
  game_result: z.any().optional(),
});

export const ToggleGameFavoriteSchema = z.object({
  game_id: z.number().positive("Game ID must be a positive number"),
});

export const PlayGameSchema = z.object({
  game_id: z.number().positive("Game ID must be a positive number"),
});

export const CancelGameSchema = z.object({
  transaction_id: z.string().min(1, "Transaction ID is required"),
  game_id: z.number().positive("Game ID must be a positive number").optional(),
  reason: z.string().max(500, "Reason must be less than 500 characters").optional(),
});

export const GameFiltersSchema = z.object({
  category: z.string().optional(),
  provider: z.string().optional(),
  is_featured: z.boolean().optional(),
  is_new: z.boolean().optional(),
  is_hot: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

// ==========================================
// PROMOTION SCHEMAS
// ==========================================

export const ClaimPromotionSchema = z.object({
  promotion_id: z.number().positive("Promotion ID must be a positive number")
});

export const PromotionFiltersSchema = z.object({
  type: z.enum(PromotionTypes).optional(),
  status: z.enum(PromotionStatus).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
});

export const CreatePromotionSchema = z.object({
  name: z.string().min(1, "Promotion name is required"),
  description: z.string().optional(),
  type: z.enum(PromotionTypes),
  bonus_percentage: z.number().min(0).optional(),
  max_bonus_amount: z.number().min(0).optional(),
  min_deposit_amount: z.number().min(0).optional(),
  wagering_requirement: z.number().min(0).optional(),
  free_spins_count: z.number().min(0).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_active: z.boolean().optional(),
  target_users: z.array(z.number().positive()).optional(),
  excluded_users: z.array(z.number().positive()).optional(),
  game_restrictions: z.array(z.number().positive()).optional(),
  user_level_restrictions: z.array(z.number().positive()).optional()
});

// ==========================================
// ADMIN SCHEMAS
// ==========================================

export const UpdateUserStatusSchema = z.object({
  status: z.enum(UserStatus),
  reason: z.string().optional()
});

export const UpdateUserRoleSchema = z.object({
  role_id: z.number().positive()
});

export const UpdateUserBalanceSchema = z.object({
  amount: z.number(),
  type: z.enum(["deposit", "withdrawal", "adjustment"] as const),
  reason: z.string().optional(),
  category: z.string().optional()
});

export const UserFiltersSchema = z.object({
  status: z.string().optional(),
  role: z.string().optional(),
  verification_level: z.number().min(0).max(2).optional(),
  country: z.string().optional(),
  search: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

export const KYCApprovalSchema = z.object({
  document_id: z.number().positive(),
  status: z.enum(KYCStatus),
  rejection_reason: z.string().optional()
});

// ==========================================
// TRANSACTION SCHEMAS
// ==========================================

export const TransactionFiltersSchema = z.object({
  user_id: z.number().positive().optional(),
  type: z.enum(TransactionTypes).optional(),
  status: z.enum(TransactionStatus).optional(),
  payment_gateway: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  min_amount: z.number().optional(),
  max_amount: z.number().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

export const ApproveTransactionSchema = z.object({
  transaction_id: z.number().positive(),
  status: z.enum(["completed", "failed", "cancelled"] as const),
  reason: z.string().optional(),
  admin_notes: z.string().optional()
});

// ==========================================
// TYPE EXPORTS
// ==========================================

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type AdminCreateUserInput = z.infer<typeof AdminCreateUserSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type Skip2FAInput = z.infer<typeof Skip2FASchema>;
export type PlaceBetInput = z.infer<typeof PlaceBetSchema>;
export type ProcessBetResultInput = z.infer<typeof ProcessBetResultSchema>;
export type ToggleGameFavoriteInput = z.infer<typeof ToggleGameFavoriteSchema>;
export type PlayGameInput = z.infer<typeof PlayGameSchema>;
export type CancelGameInput = z.infer<typeof CancelGameSchema>;
export type GameFiltersInput = z.infer<typeof GameFiltersSchema>;
export type ClaimPromotionInput = z.infer<typeof ClaimPromotionSchema>;
export type PromotionFiltersInput = z.infer<typeof PromotionFiltersSchema>;
export type CreatePromotionInput = z.infer<typeof CreatePromotionSchema>;
export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusSchema>;
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;
export type UpdateUserBalanceInput = z.infer<typeof UpdateUserBalanceSchema>;
export type UserFiltersInput = z.infer<typeof UserFiltersSchema>;
export type KYCApprovalInput = z.infer<typeof KYCApprovalSchema>;
export type TransactionFiltersInput = z.infer<typeof TransactionFiltersSchema>;
export type ApproveTransactionInput = z.infer<typeof ApproveTransactionSchema>;

// ==========================================
// USAGE EXAMPLE
// ==========================================

/*
// React Hook Form Example
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, LoginInput } from "./frontend-validations";

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema)
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("username")} placeholder="Username" />
      {errors.username && <span>{errors.username.message}</span>}

      <input type="password" {...register("password")} placeholder="Password" />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit">Login</button>
    </form>
  );
}

// Direct Validation Example
try {
  const validatedData = LoginSchema.parse({
    username: "test123",
    password: "password123"
  });
  console.log("Valid data:", validatedData);
} catch (error) {
  console.error("Validation errors:", error.errors);
}

// Safe Parse (no throw)
const result = LoginSchema.safeParse({
  username: "ab", // Too short
  password: "pass"
});

if (!result.success) {
  console.error("Validation errors:", result.error.errors);
} else {
  console.log("Valid data:", result.data);
}
*/

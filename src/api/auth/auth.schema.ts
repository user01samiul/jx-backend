import { z } from "zod";
import { ErrorMessages } from "../../constants/messages";

export const LoginSchema = z.object({
  username: z
    .string()
    .min(3, ErrorMessages.INVALID_CREDENTIALS),
  password: z.string().optional(),
  auth_code: z.string().optional(),
  role_id: z.number().optional().describe("Optional role ID to login with specific role. If not provided, defaults to Player role."),
}).refine((data) => data.password || data.auth_code, {
  message: 'Either password or auth_code is required',
  path: ['password', 'auth_code'],
});

export const AuthHeaderSchema = z.object({
  authorization: z.string().startsWith("Bearer "),
});

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(5, ErrorMessages.INVALID_USERNAME),
  email: z.string().email(ErrorMessages.INVALID_EMAIL),
  password: z
    .string()
    .min(8, ErrorMessages.INVALID_PASSWORD),
  type: z
    .string()
    .min(3, 'Role type must be at least 3 characters')
    .describe('Role to assign to the user (e.g., Player, Admin, Support, etc.). Must match a role in the roles table.'),
  captcha_id: z
    .string()
    .min(1, 'Captcha ID is required'),
  captcha_text: z
    .string()
    .min(1, 'Captcha text is required')
    .max(10, 'Captcha text is too long'),
  referral_code: z
    .string()
    .optional()
    .describe('Optional referral code for affiliate tracking'),
});

// Admin user creation schema (no captcha required)
export const AdminCreateUserSchema = z.object({
  username: z
    .string()
    .min(5, ErrorMessages.INVALID_USERNAME),
  email: z.string().email(ErrorMessages.INVALID_EMAIL),
  password: z
    .string()
    .min(8, ErrorMessages.INVALID_PASSWORD),
  type: z
    .string()
    .min(3, 'Role type must be at least 3 characters')
    .describe('Role to assign to the user (e.g., Player, Admin, Support, etc.). Must match a role in the roles table.'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  is_active: z.boolean().default(true),
  send_welcome_email: z.boolean().default(false),
});

// Forgot password schema
export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .email(ErrorMessages.INVALID_EMAIL)
    .describe('Email address associated with the account'),
});

// Reset password schema
export const ResetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Reset token is required')
    .describe('Password reset token from email'),
  password: z
    .string()
    .min(8, ErrorMessages.INVALID_PASSWORD)
    .describe('New password (minimum 8 characters)'),
});

// ============================
// Type Definitions
// ============================

export type LoginInput = z.infer<typeof LoginSchema>;
export type AuthHeaderInput = z.infer<typeof AuthHeaderSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type AdminCreateUserInput = z.infer<typeof AdminCreateUserSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  role: {
    id: number;
    name: string;
    description: string | null;
  };
};
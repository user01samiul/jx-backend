import { z } from "zod";

// =====================================================
// GAME MANAGEMENT SCHEMAS
// =====================================================

export const CreateGameInput = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  image_url: z.string().url().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  game_code: z.string().min(1).nullable().optional(),
  rtp_percentage: z.number().min(0).max(100).optional(),
  volatility: z.enum(["low", "medium", "high"]).optional(),
  min_bet: z.number().positive().optional(),
  max_bet: z.number().positive().optional(),
  max_win: z.number().min(0).optional(),
  is_featured: z.boolean().optional(),
  is_new: z.boolean().optional(),
  is_hot: z.boolean().optional(),
  is_active: z.boolean().optional(),
  features: z.array(z.string()).optional(),
  rating: z.number().min(0).max(5).optional(),
  popularity: z.number().min(0).max(100).optional(),
  description: z.string().optional()
});

export const UpdateGameInput = CreateGameInput.partial();

export const GameFiltersInput = z.object({
  provider: z.string().optional(),
  category: z.string().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_new: z.boolean().optional(),
  is_hot: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

// =====================================================
// PROVIDER MANAGEMENT SCHEMAS
// =====================================================

export const CreateProviderInput = z.object({
  name: z.string().min(1, "Provider name is required"),
  code: z.string().min(1, "Provider code is required"),
  description: z.string().optional(),
  logo_url: z.string().url().optional(),
  website_url: z.string().url().optional(),
  api_endpoint: z.string().url().optional(),
  api_key: z.string().optional(),
  api_secret: z.string().optional(),
  is_active: z.boolean().optional(),
  supported_currencies: z.array(z.string()).optional(),
  supported_languages: z.array(z.string()).optional(),
  min_bet: z.number().positive().optional(),
  max_bet: z.number().positive().optional(),
  rtp_range: z.object({
    min: z.number().min(0).max(100),
    max: z.number().min(0).max(100)
  }).optional()
});

export const UpdateProviderInput = CreateProviderInput.partial();

// =====================================================
// USER MANAGEMENT SCHEMAS
// =====================================================

export const UserFiltersInput = z.object({
  status: z.string().optional(),
  role: z.string().optional(),
  verification_level: z.number().min(0).max(2).optional(),
  country: z.string().optional(),
  search: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

export const UpdateUserStatusInput = z.object({
  status: z.enum(["Active", "Inactive", "Suspended", "Banned"]),
  reason: z.string().optional()
});

export const UpdateUserRoleInput = z.object({
  role_id: z.number().positive()
});

export const UpdateUserBalanceInput = z.object({
  amount: z.number(),
  type: z.enum(["deposit", "withdrawal", "adjustment"]),
  reason: z.string().optional(),
  category: z.string().optional()
});

export const AdminCreateUserInput = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"), // Relaxed for dev
  email: z.string().email("Invalid email format"),
  password: z.string().min(4, "Password must be at least 4 characters"), // Relaxed for dev
  type: z.string().min(3, "Role type must be at least 3 characters"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  is_active: z.boolean().default(true),
  send_welcome_email: z.boolean().default(false),
});

export const KYCApprovalInput = z.object({
  document_id: z.number().positive(),
  status: z.enum(["approved", "rejected"]),
  rejection_reason: z.string().optional()
});

// =====================================================
// PAYMENT GATEWAY SCHEMAS
// =====================================================

export const CreatePaymentGatewayInput = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  type: z.enum(["deposit", "withdrawal", "both"]),
  description: z.string().optional(),
  logo_url: z.string().url().optional(),
  website_url: z.string().url().optional(),
  api_endpoint: z.string().url().optional(),
  api_key: z.string().optional(),
  api_secret: z.string().optional(),
  merchant_id: z.string().optional(),
  payout_api_key: z.string().optional(),
  webhook_url: z.string().url().optional(),
  webhook_secret: z.string().optional(),
  is_active: z.boolean().optional(),
  supported_currencies: z.array(z.string()).optional(),
  supported_countries: z.array(z.string()).optional(),
  min_amount: z.number().positive().optional(),
  max_amount: z.number().positive().optional(),
  processing_time: z.string().optional(),
  fees_percentage: z.number().min(0).optional(),
  fees_fixed: z.number().min(0).optional(),
  auto_approval: z.boolean().optional(),
  requires_kyc: z.boolean().optional(),
  config: z.record(z.any()).optional()
});

export const UpdatePaymentGatewayInput = CreatePaymentGatewayInput.partial();

export const PaymentGatewayFiltersInput = z.object({
  type: z.enum(["deposit", "withdrawal", "both"]).optional(),
  is_active: z.boolean().optional(),
  supported_currency: z.string().optional(),
  search: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

// =====================================================
// TRANSACTION MANAGEMENT SCHEMAS
// =====================================================

export const TransactionFiltersInput = z.object({
  user_id: z.number().positive().optional(),
  type: z.enum(["deposit", "withdrawal", "bet", "win", "bonus", "cashback", "refund", "adjustment"]).optional(),
  status: z.enum(["pending", "completed", "failed", "cancelled"]).optional(),
  payment_gateway: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  min_amount: z.number().optional(),
  max_amount: z.number().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

export const ApproveTransactionInput = z.object({
  transaction_id: z.number().positive(),
  status: z.enum(["completed", "failed", "cancelled"]),
  reason: z.string().optional(),
  admin_notes: z.string().optional()
});

export const BulkApproveTransactionsInput = z.object({
  transaction_ids: z.array(z.number().positive()),
  status: z.enum(["completed", "failed", "cancelled"]),
  reason: z.string().optional(),
  admin_notes: z.string().optional()
});

// =====================================================
// SETTINGS SCHEMAS
// =====================================================

export const UpdateSystemSettingsInput = z.object({
  site_name: z.string().optional(),
  site_description: z.string().optional(),
  site_logo: z.string().url().optional(),
  site_favicon: z.string().url().optional(),
  maintenance_mode: z.boolean().optional(),
  maintenance_message: z.string().optional(),
  default_currency: z.string().optional(),
  supported_currencies: z.array(z.string()).optional(),
  default_language: z.string().optional(),
  supported_languages: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  date_format: z.string().optional(),
  time_format: z.string().optional(),
  min_deposit: z.number().positive().optional(),
  max_deposit: z.number().positive().optional(),
  min_withdrawal: z.number().positive().optional(),
  max_withdrawal: z.number().positive().optional(),
  withdrawal_fee: z.number().min(0).optional(),
  withdrawal_fee_percentage: z.number().min(0).optional(),
  auto_approval_limit: z.number().min(0).optional(),
  kyc_required: z.boolean().optional(),
  kyc_levels: z.object({
    basic: z.object({
      required: z.boolean(),
      documents: z.array(z.string())
    }),
    full: z.object({
      required: z.boolean(),
      documents: z.array(z.string())
    })
  }).optional(),
  email_settings: z.object({
    smtp_host: z.string().optional(),
    smtp_port: z.number().optional(),
    smtp_user: z.string().optional(),
    smtp_pass: z.string().optional(),
    from_email: z.string().email().optional(),
    from_name: z.string().optional()
  }).optional(),
  sms_settings: z.object({
    provider: z.string().optional(),
    api_key: z.string().optional(),
    api_secret: z.string().optional(),
    from_number: z.string().optional()
  }).optional(),
  security_settings: z.object({
    password_min_length: z.number().min(6).optional(),
    password_require_special: z.boolean().optional(),
    session_timeout: z.number().min(1).optional(),
    max_login_attempts: z.number().min(1).optional(),
    lockout_duration: z.number().min(1).optional(),
    require_2fa: z.boolean().optional(),
    allowed_ip_ranges: z.array(z.string()).optional()
  }).optional(),
  gaming_settings: z.object({
    default_rtp: z.number().min(0).max(100).optional(),
    max_bet_multiplier: z.number().positive().optional(),
    auto_play_limit: z.number().min(1).optional(),
    responsible_gaming: z.object({
      deposit_limits: z.boolean().optional(),
      session_limits: z.boolean().optional(),
      loss_limits: z.boolean().optional(),
      self_exclusion: z.boolean().optional()
    }).optional()
  }).optional()
});

// =====================================================
// RTP MANAGEMENT SCHEMAS
// =====================================================

export const UpdateRTPSettingsInput = z.object({
  default_rtp: z.number().min(0).max(100).optional(),
  rtp_ranges: z.record(z.object({
    min: z.number().min(0).max(100),
    max: z.number().min(0).max(100)
  })).optional(),
  rtp_categories: z.record(z.number().min(0).max(100)).optional()
});

export const RTPAnalyticsFiltersInput = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  game_id: z.number().positive().optional(),
  provider: z.string().optional(),
  category: z.string().optional()
});

export const BulkUpdateRTPInput = z.object({
  game_ids: z.array(z.number().positive()).optional(),
  rtp_percentage: z.number().min(0).max(100),
  category: z.string().optional(),
  provider: z.string().optional()
});

export const RTPReportFiltersInput = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  format: z.enum(['json', 'csv']).optional()
});

// =====================================================
// SERVER SETTINGS SCHEMAS
// =====================================================

export const UpdateServerSettingsInput = z.object({
  database: z.object({
    host: z.string().optional(),
    port: z.number().optional(),
    name: z.string().optional(),
    user: z.string().optional(),
    password: z.string().optional(),
    pool_size: z.number().min(1).optional(),
    connection_timeout: z.number().min(1).optional()
  }).optional(),
  redis: z.object({
    host: z.string().optional(),
    port: z.number().optional(),
    password: z.string().optional(),
    db: z.number().min(0).optional()
  }).optional(),
  server: z.object({
    port: z.number().min(1).optional(),
    host: z.string().optional(),
    cors_origins: z.array(z.string()).optional(),
    rate_limit_window: z.number().min(1).optional(),
    rate_limit_max: z.number().min(1).optional(),
    upload_max_size: z.number().min(1).optional(),
    session_secret: z.string().optional(),
    jwt_secret: z.string().optional(),
    jwt_expires_in: z.string().optional()
  }).optional(),
  logging: z.object({
    level: z.enum(["error", "warn", "info", "debug"]).optional(),
    file_path: z.string().optional(),
    max_size: z.number().min(1).optional(),
    max_files: z.number().min(1).optional()
  }).optional(),
  cache: z.object({
    ttl: z.number().min(1).optional(),
    check_period: z.number().min(1).optional(),
    max_keys: z.number().min(1).optional()
  }).optional()
});

// =====================================================
// ANALYTICS & REPORTS SCHEMAS
// =====================================================

export const AnalyticsFiltersInput = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  group_by: z.enum(["day", "week", "month", "year"]).optional(),
  user_id: z.number().positive().optional(),
  game_id: z.number().positive().optional(),
  provider: z.string().optional()
});

export const ReportFiltersInput = z.object({
  report_type: z.enum(["user_activity", "financial", "gaming", "kyc", "transactions"]),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  format: z.enum(["json", "csv", "pdf"]).optional(),
  include_charts: z.boolean().optional()
});

// =====================================================
// PROMOTION MANAGEMENT SCHEMAS
// =====================================================

export const CreatePromotionInput = z.object({
  name: z.string().min(1, "Promotion name is required"),
  description: z.string().optional(),
  type: z.enum(["welcome_bonus", "deposit_bonus", "free_spins", "cashback", "reload_bonus", "tournament"]),
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

export const UpdatePromotionInput = CreatePromotionInput.partial();

// =====================================================
// LEVEL MANAGEMENT SCHEMAS
// =====================================================

export const CreateUserLevelInput = z.object({
  name: z.string().min(1, "Level name is required"),
  description: z.string().optional(),
  min_points: z.number().min(0, "Minimum points is required"),
  max_points: z.number().min(0).optional(),
  benefits: z.array(z.string()).optional(),
  cashback_percentage: z.number().min(0).max(100).optional(),
  withdrawal_limit: z.number().min(0).optional(),
  deposit_bonus: z.number().min(0).optional(),
  monthly_bonus: z.number().min(0).optional(),
  exclusive_games: z.array(z.number().positive()).optional()
});

export const UpdateUserLevelInput = CreateUserLevelInput.partial();

// =====================================================
// BULK OPERATIONS SCHEMAS
// =====================================================

export const BulkUserOperationInput = z.object({
  user_ids: z.array(z.number().positive()),
  operation: z.enum(["activate", "deactivate", "suspend", "ban", "delete", "assign_role", "update_level"]),
  value: z.union([z.string(), z.number()]).optional()
});

export const BulkGameOperationInput = z.object({
  game_ids: z.array(z.number().positive()),
  operation: z.enum(["activate", "deactivate", "feature", "unfeature", "mark_new", "mark_hot"]),
  value: z.boolean().optional()
});

// =====================================================
// EXPORT TYPES
// =====================================================

export type CreateGameInputType = z.infer<typeof CreateGameInput>;
export type UpdateGameInputType = z.infer<typeof UpdateGameInput>;
export type GameFiltersInputType = z.infer<typeof GameFiltersInput>;
export type CreateProviderInputType = z.infer<typeof CreateProviderInput>;
export type UpdateProviderInputType = z.infer<typeof UpdateProviderInput>;
export type UserFiltersInputType = z.infer<typeof UserFiltersInput>;
export type UpdateUserStatusInputType = z.infer<typeof UpdateUserStatusInput>;
export type UpdateUserRoleInputType = z.infer<typeof UpdateUserRoleInput>;
export type UpdateUserBalanceInputType = z.infer<typeof UpdateUserBalanceInput>;
export type AdminCreateUserInputType = z.infer<typeof AdminCreateUserInput>;
export type KYCApprovalInputType = z.infer<typeof KYCApprovalInput>;
export type CreatePaymentGatewayInputType = z.infer<typeof CreatePaymentGatewayInput>;
export type UpdatePaymentGatewayInputType = z.infer<typeof UpdatePaymentGatewayInput>;
export type PaymentGatewayFiltersInputType = z.infer<typeof PaymentGatewayFiltersInput>;
export type TransactionFiltersInputType = z.infer<typeof TransactionFiltersInput>;
export type ApproveTransactionInputType = z.infer<typeof ApproveTransactionInput>;
export type BulkApproveTransactionsInputType = z.infer<typeof BulkApproveTransactionsInput>;
export type UpdateSystemSettingsInputType = z.infer<typeof UpdateSystemSettingsInput>;
export type UpdateServerSettingsInputType = z.infer<typeof UpdateServerSettingsInput>;
export type AnalyticsFiltersInputType = z.infer<typeof AnalyticsFiltersInput>;
export type ReportFiltersInputType = z.infer<typeof ReportFiltersInput>;
export type CreatePromotionInputType = z.infer<typeof CreatePromotionInput>;
export type UpdatePromotionInputType = z.infer<typeof UpdatePromotionInput>;
export type CreateUserLevelInputType = z.infer<typeof CreateUserLevelInput>;
export type UpdateUserLevelInputType = z.infer<typeof UpdateUserLevelInput>;
export type BulkUserOperationInputType = z.infer<typeof BulkUserOperationInput>;
export type BulkGameOperationInputType = z.infer<typeof BulkGameOperationInput>;

// RTP Management Types
export type UpdateRTPSettingsInputType = z.infer<typeof UpdateRTPSettingsInput>;
export type RTPAnalyticsFiltersInputType = z.infer<typeof RTPAnalyticsFiltersInput>;
export type BulkUpdateRTPInputType = z.infer<typeof BulkUpdateRTPInput>;
export type RTPReportFiltersInputType = z.infer<typeof RTPReportFiltersInput>; 
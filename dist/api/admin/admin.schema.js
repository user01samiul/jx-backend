"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkGameOperationInput = exports.BulkUserOperationInput = exports.UpdateUserLevelInput = exports.CreateUserLevelInput = exports.UpdatePromotionInput = exports.CreatePromotionInput = exports.ReportFiltersInput = exports.AnalyticsFiltersInput = exports.UpdateServerSettingsInput = exports.RTPReportFiltersInput = exports.BulkUpdateRTPInput = exports.RTPAnalyticsFiltersInput = exports.UpdateRTPSettingsInput = exports.UpdateSystemSettingsInput = exports.BulkApproveTransactionsInput = exports.ApproveTransactionInput = exports.TransactionFiltersInput = exports.PaymentGatewayFiltersInput = exports.UpdatePaymentGatewayInput = exports.CreatePaymentGatewayInput = exports.KYCApprovalInput = exports.AdminCreateUserInput = exports.UpdateUserBalanceInput = exports.UpdateUserRoleInput = exports.UpdateUserStatusInput = exports.UserFiltersInput = exports.UpdateProviderInput = exports.CreateProviderInput = exports.GameFiltersInput = exports.UpdateGameInput = exports.CreateGameInput = void 0;
const zod_1 = require("zod");
// =====================================================
// GAME MANAGEMENT SCHEMAS
// =====================================================
exports.CreateGameInput = zod_1.z.object({
    name: zod_1.z.string().min(1),
    provider: zod_1.z.string().min(1),
    category: zod_1.z.string().min(1),
    subcategory: zod_1.z.string().optional(),
    image_url: zod_1.z.string().url().nullable().optional(),
    thumbnail_url: zod_1.z.string().url().nullable().optional(),
    game_code: zod_1.z.string().min(1).nullable().optional(),
    rtp_percentage: zod_1.z.number().min(0).max(100).optional(),
    volatility: zod_1.z.enum(["low", "medium", "high"]).optional(),
    min_bet: zod_1.z.number().positive().optional(),
    max_bet: zod_1.z.number().positive().optional(),
    max_win: zod_1.z.number().min(0).optional(),
    is_featured: zod_1.z.boolean().optional(),
    is_new: zod_1.z.boolean().optional(),
    is_hot: zod_1.z.boolean().optional(),
    is_active: zod_1.z.boolean().optional(),
    features: zod_1.z.array(zod_1.z.string()).optional(),
    rating: zod_1.z.number().min(0).max(5).optional(),
    popularity: zod_1.z.number().min(0).max(100).optional(),
    description: zod_1.z.string().optional()
});
exports.UpdateGameInput = exports.CreateGameInput.partial();
exports.GameFiltersInput = zod_1.z.object({
    provider: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    is_active: zod_1.z.boolean().optional(),
    is_featured: zod_1.z.boolean().optional(),
    is_new: zod_1.z.boolean().optional(),
    is_hot: zod_1.z.boolean().optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.number().min(1).optional(),
    limit: zod_1.z.number().min(1).max(100).optional()
});
// =====================================================
// PROVIDER MANAGEMENT SCHEMAS
// =====================================================
exports.CreateProviderInput = zod_1.z.object({
    name: zod_1.z.string().min(1, "Provider name is required"),
    code: zod_1.z.string().min(1, "Provider code is required"),
    description: zod_1.z.string().optional(),
    logo_url: zod_1.z.string().url().optional(),
    website_url: zod_1.z.string().url().optional(),
    api_endpoint: zod_1.z.string().url().optional(),
    api_key: zod_1.z.string().optional(),
    api_secret: zod_1.z.string().optional(),
    is_active: zod_1.z.boolean().optional(),
    supported_currencies: zod_1.z.array(zod_1.z.string()).optional(),
    supported_languages: zod_1.z.array(zod_1.z.string()).optional(),
    min_bet: zod_1.z.number().positive().optional(),
    max_bet: zod_1.z.number().positive().optional(),
    rtp_range: zod_1.z.object({
        min: zod_1.z.number().min(0).max(100),
        max: zod_1.z.number().min(0).max(100)
    }).optional()
});
exports.UpdateProviderInput = exports.CreateProviderInput.partial();
// =====================================================
// USER MANAGEMENT SCHEMAS
// =====================================================
exports.UserFiltersInput = zod_1.z.object({
    status: zod_1.z.string().optional(),
    role: zod_1.z.string().optional(),
    verification_level: zod_1.z.number().min(0).max(2).optional(),
    country: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.number().min(1).optional(),
    limit: zod_1.z.number().min(1).max(100).optional()
});
exports.UpdateUserStatusInput = zod_1.z.object({
    status: zod_1.z.enum(["Active", "Inactive", "Suspended", "Banned"]),
    reason: zod_1.z.string().optional()
});
exports.UpdateUserRoleInput = zod_1.z.object({
    role_id: zod_1.z.number().positive()
});
exports.UpdateUserBalanceInput = zod_1.z.object({
    amount: zod_1.z.number(),
    type: zod_1.z.enum(["deposit", "withdrawal", "adjustment"]),
    reason: zod_1.z.string().optional(),
    category: zod_1.z.string().optional()
});
exports.AdminCreateUserInput = zod_1.z.object({
    username: zod_1.z.string().min(3, "Username must be at least 3 characters"), // Relaxed for dev
    email: zod_1.z.string().email("Invalid email format"),
    password: zod_1.z.string().min(4, "Password must be at least 4 characters"), // Relaxed for dev
    type: zod_1.z.string().min(3, "Role type must be at least 3 characters"),
    first_name: zod_1.z.string().optional(),
    last_name: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
    timezone: zod_1.z.string().optional(),
    is_active: zod_1.z.boolean().default(true),
    send_welcome_email: zod_1.z.boolean().default(false),
});
exports.KYCApprovalInput = zod_1.z.object({
    document_id: zod_1.z.number().positive(),
    status: zod_1.z.enum(["approved", "rejected"]),
    rejection_reason: zod_1.z.string().optional()
});
// =====================================================
// PAYMENT GATEWAY SCHEMAS
// =====================================================
exports.CreatePaymentGatewayInput = zod_1.z.object({
    name: zod_1.z.string().min(1),
    code: zod_1.z.string().min(1),
    type: zod_1.z.enum(["deposit", "withdrawal", "both"]),
    description: zod_1.z.string().optional(),
    logo_url: zod_1.z.string().url().optional(),
    website_url: zod_1.z.string().url().optional(),
    api_endpoint: zod_1.z.string().url().optional(),
    api_key: zod_1.z.string().optional(),
    api_secret: zod_1.z.string().optional(),
    merchant_id: zod_1.z.string().optional(),
    payout_api_key: zod_1.z.string().optional(),
    webhook_url: zod_1.z.string().url().optional(),
    webhook_secret: zod_1.z.string().optional(),
    is_active: zod_1.z.boolean().optional(),
    supported_currencies: zod_1.z.array(zod_1.z.string()).optional(),
    supported_countries: zod_1.z.array(zod_1.z.string()).optional(),
    min_amount: zod_1.z.number().positive().optional(),
    max_amount: zod_1.z.number().positive().optional(),
    processing_time: zod_1.z.string().optional(),
    fees_percentage: zod_1.z.number().min(0).optional(),
    fees_fixed: zod_1.z.number().min(0).optional(),
    auto_approval: zod_1.z.boolean().optional(),
    requires_kyc: zod_1.z.boolean().optional(),
    config: zod_1.z.record(zod_1.z.any()).optional()
});
exports.UpdatePaymentGatewayInput = exports.CreatePaymentGatewayInput.partial();
exports.PaymentGatewayFiltersInput = zod_1.z.object({
    type: zod_1.z.enum(["deposit", "withdrawal", "both"]).optional(),
    is_active: zod_1.z.boolean().optional(),
    supported_currency: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.number().min(1).optional(),
    limit: zod_1.z.number().min(1).max(100).optional()
});
// =====================================================
// TRANSACTION MANAGEMENT SCHEMAS
// =====================================================
exports.TransactionFiltersInput = zod_1.z.object({
    user_id: zod_1.z.number().positive().optional(),
    type: zod_1.z.enum(["deposit", "withdrawal", "bet", "win", "bonus", "cashback", "refund", "adjustment"]).optional(),
    status: zod_1.z.enum(["pending", "completed", "failed", "cancelled"]).optional(),
    payment_gateway: zod_1.z.string().optional(),
    start_date: zod_1.z.string().optional(),
    end_date: zod_1.z.string().optional(),
    min_amount: zod_1.z.number().optional(),
    max_amount: zod_1.z.number().optional(),
    page: zod_1.z.number().min(1).optional(),
    limit: zod_1.z.number().min(1).max(100).optional()
});
exports.ApproveTransactionInput = zod_1.z.object({
    transaction_id: zod_1.z.number().positive(),
    status: zod_1.z.enum(["completed", "failed", "cancelled"]),
    reason: zod_1.z.string().optional(),
    admin_notes: zod_1.z.string().optional()
});
exports.BulkApproveTransactionsInput = zod_1.z.object({
    transaction_ids: zod_1.z.array(zod_1.z.number().positive()),
    status: zod_1.z.enum(["completed", "failed", "cancelled"]),
    reason: zod_1.z.string().optional(),
    admin_notes: zod_1.z.string().optional()
});
// =====================================================
// SETTINGS SCHEMAS
// =====================================================
exports.UpdateSystemSettingsInput = zod_1.z.object({
    site_name: zod_1.z.string().optional(),
    site_description: zod_1.z.string().optional(),
    site_logo: zod_1.z.string().url().optional(),
    site_favicon: zod_1.z.string().url().optional(),
    maintenance_mode: zod_1.z.boolean().optional(),
    maintenance_message: zod_1.z.string().optional(),
    default_currency: zod_1.z.string().optional(),
    supported_currencies: zod_1.z.array(zod_1.z.string()).optional(),
    default_language: zod_1.z.string().optional(),
    supported_languages: zod_1.z.array(zod_1.z.string()).optional(),
    timezone: zod_1.z.string().optional(),
    date_format: zod_1.z.string().optional(),
    time_format: zod_1.z.string().optional(),
    min_deposit: zod_1.z.number().positive().optional(),
    max_deposit: zod_1.z.number().positive().optional(),
    min_withdrawal: zod_1.z.number().positive().optional(),
    max_withdrawal: zod_1.z.number().positive().optional(),
    withdrawal_fee: zod_1.z.number().min(0).optional(),
    withdrawal_fee_percentage: zod_1.z.number().min(0).optional(),
    auto_approval_limit: zod_1.z.number().min(0).optional(),
    kyc_required: zod_1.z.boolean().optional(),
    kyc_levels: zod_1.z.object({
        basic: zod_1.z.object({
            required: zod_1.z.boolean(),
            documents: zod_1.z.array(zod_1.z.string())
        }),
        full: zod_1.z.object({
            required: zod_1.z.boolean(),
            documents: zod_1.z.array(zod_1.z.string())
        })
    }).optional(),
    email_settings: zod_1.z.object({
        smtp_host: zod_1.z.string().optional(),
        smtp_port: zod_1.z.number().optional(),
        smtp_user: zod_1.z.string().optional(),
        smtp_pass: zod_1.z.string().optional(),
        from_email: zod_1.z.string().email().optional(),
        from_name: zod_1.z.string().optional()
    }).optional(),
    sms_settings: zod_1.z.object({
        provider: zod_1.z.string().optional(),
        api_key: zod_1.z.string().optional(),
        api_secret: zod_1.z.string().optional(),
        from_number: zod_1.z.string().optional()
    }).optional(),
    security_settings: zod_1.z.object({
        password_min_length: zod_1.z.number().min(6).optional(),
        password_require_special: zod_1.z.boolean().optional(),
        session_timeout: zod_1.z.number().min(1).optional(),
        max_login_attempts: zod_1.z.number().min(1).optional(),
        lockout_duration: zod_1.z.number().min(1).optional(),
        require_2fa: zod_1.z.boolean().optional(),
        allowed_ip_ranges: zod_1.z.array(zod_1.z.string()).optional()
    }).optional(),
    gaming_settings: zod_1.z.object({
        default_rtp: zod_1.z.number().min(0).max(100).optional(),
        max_bet_multiplier: zod_1.z.number().positive().optional(),
        auto_play_limit: zod_1.z.number().min(1).optional(),
        responsible_gaming: zod_1.z.object({
            deposit_limits: zod_1.z.boolean().optional(),
            session_limits: zod_1.z.boolean().optional(),
            loss_limits: zod_1.z.boolean().optional(),
            self_exclusion: zod_1.z.boolean().optional()
        }).optional()
    }).optional()
});
// =====================================================
// RTP MANAGEMENT SCHEMAS
// =====================================================
exports.UpdateRTPSettingsInput = zod_1.z.object({
    default_rtp: zod_1.z.number().min(0).max(100).optional(),
    rtp_ranges: zod_1.z.record(zod_1.z.object({
        min: zod_1.z.number().min(0).max(100),
        max: zod_1.z.number().min(0).max(100)
    })).optional(),
    rtp_categories: zod_1.z.record(zod_1.z.number().min(0).max(100)).optional()
});
exports.RTPAnalyticsFiltersInput = zod_1.z.object({
    start_date: zod_1.z.string().optional(),
    end_date: zod_1.z.string().optional(),
    game_id: zod_1.z.number().positive().optional(),
    provider: zod_1.z.string().optional(),
    category: zod_1.z.string().optional()
});
exports.BulkUpdateRTPInput = zod_1.z.object({
    game_ids: zod_1.z.array(zod_1.z.number().positive()).optional(),
    rtp_percentage: zod_1.z.number().min(0).max(100),
    category: zod_1.z.string().optional(),
    provider: zod_1.z.string().optional()
});
exports.RTPReportFiltersInput = zod_1.z.object({
    start_date: zod_1.z.string().optional(),
    end_date: zod_1.z.string().optional(),
    format: zod_1.z.enum(['json', 'csv']).optional()
});
// =====================================================
// SERVER SETTINGS SCHEMAS
// =====================================================
exports.UpdateServerSettingsInput = zod_1.z.object({
    database: zod_1.z.object({
        host: zod_1.z.string().optional(),
        port: zod_1.z.number().optional(),
        name: zod_1.z.string().optional(),
        user: zod_1.z.string().optional(),
        password: zod_1.z.string().optional(),
        pool_size: zod_1.z.number().min(1).optional(),
        connection_timeout: zod_1.z.number().min(1).optional()
    }).optional(),
    redis: zod_1.z.object({
        host: zod_1.z.string().optional(),
        port: zod_1.z.number().optional(),
        password: zod_1.z.string().optional(),
        db: zod_1.z.number().min(0).optional()
    }).optional(),
    server: zod_1.z.object({
        port: zod_1.z.number().min(1).optional(),
        host: zod_1.z.string().optional(),
        cors_origins: zod_1.z.array(zod_1.z.string()).optional(),
        rate_limit_window: zod_1.z.number().min(1).optional(),
        rate_limit_max: zod_1.z.number().min(1).optional(),
        upload_max_size: zod_1.z.number().min(1).optional(),
        session_secret: zod_1.z.string().optional(),
        jwt_secret: zod_1.z.string().optional(),
        jwt_expires_in: zod_1.z.string().optional()
    }).optional(),
    logging: zod_1.z.object({
        level: zod_1.z.enum(["error", "warn", "info", "debug"]).optional(),
        file_path: zod_1.z.string().optional(),
        max_size: zod_1.z.number().min(1).optional(),
        max_files: zod_1.z.number().min(1).optional()
    }).optional(),
    cache: zod_1.z.object({
        ttl: zod_1.z.number().min(1).optional(),
        check_period: zod_1.z.number().min(1).optional(),
        max_keys: zod_1.z.number().min(1).optional()
    }).optional()
});
// =====================================================
// ANALYTICS & REPORTS SCHEMAS
// =====================================================
exports.AnalyticsFiltersInput = zod_1.z.object({
    start_date: zod_1.z.string().optional(),
    end_date: zod_1.z.string().optional(),
    group_by: zod_1.z.enum(["day", "week", "month", "year"]).optional(),
    user_id: zod_1.z.number().positive().optional(),
    game_id: zod_1.z.number().positive().optional(),
    provider: zod_1.z.string().optional()
});
exports.ReportFiltersInput = zod_1.z.object({
    report_type: zod_1.z.enum(["user_activity", "financial", "gaming", "kyc", "transactions"]),
    start_date: zod_1.z.string().optional(),
    end_date: zod_1.z.string().optional(),
    format: zod_1.z.enum(["json", "csv", "pdf"]).optional(),
    include_charts: zod_1.z.boolean().optional()
});
// =====================================================
// PROMOTION MANAGEMENT SCHEMAS
// =====================================================
exports.CreatePromotionInput = zod_1.z.object({
    name: zod_1.z.string().min(1, "Promotion name is required"),
    description: zod_1.z.string().optional(),
    type: zod_1.z.enum(["welcome_bonus", "deposit_bonus", "free_spins", "cashback", "reload_bonus", "tournament"]),
    bonus_percentage: zod_1.z.number().min(0).optional(),
    max_bonus_amount: zod_1.z.number().min(0).optional(),
    min_deposit_amount: zod_1.z.number().min(0).optional(),
    wagering_requirement: zod_1.z.number().min(0).optional(),
    free_spins_count: zod_1.z.number().min(0).optional(),
    start_date: zod_1.z.string().optional(),
    end_date: zod_1.z.string().optional(),
    is_active: zod_1.z.boolean().optional(),
    target_users: zod_1.z.array(zod_1.z.number().positive()).optional(),
    excluded_users: zod_1.z.array(zod_1.z.number().positive()).optional(),
    game_restrictions: zod_1.z.array(zod_1.z.number().positive()).optional(),
    user_level_restrictions: zod_1.z.array(zod_1.z.number().positive()).optional()
});
exports.UpdatePromotionInput = exports.CreatePromotionInput.partial();
// =====================================================
// LEVEL MANAGEMENT SCHEMAS
// =====================================================
exports.CreateUserLevelInput = zod_1.z.object({
    name: zod_1.z.string().min(1, "Level name is required"),
    description: zod_1.z.string().optional(),
    min_points: zod_1.z.number().min(0, "Minimum points is required"),
    max_points: zod_1.z.number().min(0).optional(),
    benefits: zod_1.z.array(zod_1.z.string()).optional(),
    cashback_percentage: zod_1.z.number().min(0).max(100).optional(),
    withdrawal_limit: zod_1.z.number().min(0).optional(),
    deposit_bonus: zod_1.z.number().min(0).optional(),
    monthly_bonus: zod_1.z.number().min(0).optional(),
    exclusive_games: zod_1.z.array(zod_1.z.number().positive()).optional()
});
exports.UpdateUserLevelInput = exports.CreateUserLevelInput.partial();
// =====================================================
// BULK OPERATIONS SCHEMAS
// =====================================================
exports.BulkUserOperationInput = zod_1.z.object({
    user_ids: zod_1.z.array(zod_1.z.number().positive()),
    operation: zod_1.z.enum(["activate", "deactivate", "suspend", "ban", "delete", "assign_role", "update_level"]),
    value: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional()
});
exports.BulkGameOperationInput = zod_1.z.object({
    game_ids: zod_1.z.array(zod_1.z.number().positive()),
    operation: zod_1.z.enum(["activate", "deactivate", "feature", "unfeature", "mark_new", "mark_hot"]),
    value: zod_1.z.boolean().optional()
});

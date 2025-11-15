"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketingMaterialResponse = exports.PayoutResponse = exports.CommissionResponse = exports.AffiliateDashboardResponse = exports.AffiliateProfileResponse = exports.AdminUpdatePayoutSchema = exports.AdminCreatePayoutSchema = exports.AdminUpdateAffiliateSchema = exports.AdminGetAffiliatesSchema = exports.RecordConversionSchema = exports.TrackClickSchema = exports.GetPayoutsSchema = exports.RequestPayoutSchema = exports.GetCommissionsSchema = exports.UpdateAffiliateProfileSchema = exports.CreateAffiliateProfileSchema = void 0;
const zod_1 = require("zod");
// =====================================================
// AFFILIATE PROFILE SCHEMAS
// =====================================================
exports.CreateAffiliateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        display_name: zod_1.z.string().min(1).max(100).optional(),
        website_url: zod_1.z.string().url().optional(),
        social_media_links: zod_1.z.record(zod_1.z.string().url()).optional(),
        commission_rate: zod_1.z.number().min(1).max(50).optional(), // 1-50%
        minimum_payout: zod_1.z.number().min(10).max(10000).optional(),
        payment_methods: zod_1.z.array(zod_1.z.string()).optional()
    })
});
exports.UpdateAffiliateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        display_name: zod_1.z.string().min(1).max(100).optional(),
        website_url: zod_1.z.string().url().optional(),
        social_media_links: zod_1.z.record(zod_1.z.string().url()).optional(),
        commission_rate: zod_1.z.number().min(1).max(50).optional(),
        minimum_payout: zod_1.z.number().min(10).max(10000).optional(),
        payment_methods: zod_1.z.array(zod_1.z.string()).optional()
    })
});
// =====================================================
// AFFILIATE COMMISSION SCHEMAS
// =====================================================
exports.GetCommissionsSchema = zod_1.z.object({
    query: zod_1.z.object({
        status: zod_1.z.enum(['pending', 'approved', 'paid', 'cancelled']).optional(),
        commission_type: zod_1.z.enum(['deposit', 'bet', 'loss', 'net_gaming_revenue']).optional(),
        start_date: zod_1.z.string().datetime().optional(),
        end_date: zod_1.z.string().datetime().optional(),
        page: zod_1.z.coerce.number().min(1).default(1),
        limit: zod_1.z.coerce.number().min(1).max(100).default(20)
    })
});
// =====================================================
// AFFILIATE PAYOUT SCHEMAS
// =====================================================
exports.RequestPayoutSchema = zod_1.z.object({
    body: zod_1.z.object({
        amount: zod_1.z.number().min(10).max(100000),
        payment_method: zod_1.z.string().min(1).max(50)
    })
});
exports.GetPayoutsSchema = zod_1.z.object({
    query: zod_1.z.object({
        status: zod_1.z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
        start_date: zod_1.z.string().datetime().optional(),
        end_date: zod_1.z.string().datetime().optional(),
        page: zod_1.z.coerce.number().min(1).default(1),
        limit: zod_1.z.coerce.number().min(1).max(100).default(20)
    })
});
// =====================================================
// AFFILIATE TRACKING SCHEMAS
// =====================================================
exports.TrackClickSchema = zod_1.z.object({
    body: zod_1.z.object({
        referral_code: zod_1.z.string().min(1).max(50),
        visitor_ip: zod_1.z.string().ip().optional(),
        user_agent: zod_1.z.string().optional(),
        landing_page: zod_1.z.string().url().optional(),
        session_id: zod_1.z.string().optional()
    })
});
exports.RecordConversionSchema = zod_1.z.object({
    body: zod_1.z.object({
        referral_code: zod_1.z.string().min(1).max(50),
        conversion_type: zod_1.z.enum(['registration', 'deposit', 'first_deposit']),
        converted_user_id: zod_1.z.number().int().positive(),
        conversion_amount: zod_1.z.number().positive().optional()
    })
});
// =====================================================
// ADMIN AFFILIATE MANAGEMENT SCHEMAS
// =====================================================
exports.AdminGetAffiliatesSchema = zod_1.z.object({
    query: zod_1.z.object({
        status: zod_1.z.enum(['active', 'inactive', 'suspended']).optional(),
        search: zod_1.z.string().optional(),
        page: zod_1.z.coerce.number().min(1).default(1),
        limit: zod_1.z.coerce.number().min(1).max(100).default(20)
    })
});
exports.AdminUpdateAffiliateSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.coerce.number().int().positive()
    }),
    body: zod_1.z.object({
        commission_rate: zod_1.z.number().min(1).max(50).optional(),
        minimum_payout: zod_1.z.number().min(10).max(10000).optional(),
        is_active: zod_1.z.boolean().optional(),
        status: zod_1.z.enum(['active', 'inactive', 'suspended']).optional()
    })
});
exports.AdminCreatePayoutSchema = zod_1.z.object({
    body: zod_1.z.object({
        affiliate_id: zod_1.z.number().int().positive(),
        amount: zod_1.z.number().min(10).max(100000),
        payment_method: zod_1.z.string().min(1).max(50),
        payment_reference: zod_1.z.string().optional(),
        notes: zod_1.z.string().optional()
    })
});
exports.AdminUpdatePayoutSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.coerce.number().int().positive()
    }),
    body: zod_1.z.object({
        status: zod_1.z.enum(['pending', 'processing', 'completed', 'failed']),
        payment_reference: zod_1.z.string().optional(),
        notes: zod_1.z.string().optional()
    })
});
// =====================================================
// RESPONSE SCHEMAS
// =====================================================
exports.AffiliateProfileResponse = zod_1.z.object({
    id: zod_1.z.number(),
    user_id: zod_1.z.number(),
    referral_code: zod_1.z.string(),
    display_name: zod_1.z.string().nullable(),
    website_url: zod_1.z.string().nullable(),
    social_media_links: zod_1.z.record(zod_1.z.string()).nullable(),
    commission_rate: zod_1.z.number(),
    minimum_payout: zod_1.z.number(),
    payment_methods: zod_1.z.array(zod_1.z.string()).nullable(),
    is_active: zod_1.z.boolean(),
    total_referrals: zod_1.z.number(),
    total_commission_earned: zod_1.z.number(),
    total_payouts_received: zod_1.z.number(),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime()
});
exports.AffiliateDashboardResponse = zod_1.z.object({
    total_referrals: zod_1.z.number(),
    active_referrals: zod_1.z.number(),
    total_commission_earned: zod_1.z.number(),
    pending_commission: zod_1.z.number(),
    total_payouts_received: zod_1.z.number(),
    available_for_payout: zod_1.z.number(),
    monthly_stats: zod_1.z.object({
        new_referrals: zod_1.z.number(),
        commission_earned: zod_1.z.number(),
        conversions: zod_1.z.number()
    }),
    recent_referrals: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.number(),
        username: zod_1.z.string(),
        email: zod_1.z.string(),
        registration_date: zod_1.z.string().datetime(),
        first_deposit_amount: zod_1.z.number().nullable(),
        first_deposit_date: zod_1.z.string().datetime().nullable(),
        total_commission_earned: zod_1.z.number(),
        status: zod_1.z.string()
    })),
    recent_commissions: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.number(),
        referred_user: zod_1.z.string(),
        commission_amount: zod_1.z.number(),
        commission_type: zod_1.z.string(),
        base_amount: zod_1.z.number(),
        status: zod_1.z.string(),
        created_at: zod_1.z.string().datetime()
    })),
    recent_payouts: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.number(),
        total_amount: zod_1.z.number(),
        status: zod_1.z.string(),
        created_at: zod_1.z.string().datetime()
    }))
});
exports.CommissionResponse = zod_1.z.object({
    id: zod_1.z.number(),
    affiliate_id: zod_1.z.number(),
    referred_user_id: zod_1.z.number(),
    transaction_id: zod_1.z.number(),
    commission_amount: zod_1.z.number(),
    commission_rate: zod_1.z.number(),
    base_amount: zod_1.z.number(),
    commission_type: zod_1.z.string(),
    status: zod_1.z.string(),
    paid_at: zod_1.z.string().datetime().nullable(),
    notes: zod_1.z.string().nullable(),
    created_at: zod_1.z.string().datetime(),
    referred_user_username: zod_1.z.string()
});
exports.PayoutResponse = zod_1.z.object({
    id: zod_1.z.number(),
    affiliate_id: zod_1.z.number(),
    total_amount: zod_1.z.number(),
    commission_ids: zod_1.z.array(zod_1.z.number()),
    payment_method: zod_1.z.string().nullable(),
    payment_reference: zod_1.z.string().nullable(),
    status: zod_1.z.string(),
    processed_at: zod_1.z.string().datetime().nullable(),
    notes: zod_1.z.string().nullable(),
    created_at: zod_1.z.string().datetime()
});
exports.MarketingMaterialResponse = zod_1.z.object({
    id: zod_1.z.number(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    type: zod_1.z.string(),
    content: zod_1.z.string(),
    image_url: zod_1.z.string().nullable(),
    target_url: zod_1.z.string().nullable(),
    is_active: zod_1.z.boolean(),
    created_at: zod_1.z.string().datetime()
});

import { z } from "zod";

// =====================================================
// AFFILIATE PROFILE SCHEMAS
// =====================================================

export const CreateAffiliateProfileSchema = z.object({
  body: z.object({
    display_name: z.string().min(1).max(100).optional(),
    website_url: z.string().url().optional(),
    social_media_links: z.record(z.string().url()).optional(),
    commission_rate: z.number().min(1).max(50).optional(), // 1-50%
    minimum_payout: z.number().min(10).max(10000).optional(),
    payment_methods: z.array(z.string()).optional()
  })
});

export const UpdateAffiliateProfileSchema = z.object({
  body: z.object({
    display_name: z.string().min(1).max(100).optional(),
    website_url: z.string().url().optional(),
    social_media_links: z.record(z.string().url()).optional(),
    commission_rate: z.number().min(1).max(50).optional(),
    minimum_payout: z.number().min(10).max(10000).optional(),
    payment_methods: z.array(z.string()).optional()
  })
});

// =====================================================
// AFFILIATE COMMISSION SCHEMAS
// =====================================================

export const GetCommissionsSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'paid', 'cancelled']).optional(),
    commission_type: z.enum(['deposit', 'bet', 'loss', 'net_gaming_revenue']).optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20)
  })
});

// =====================================================
// AFFILIATE PAYOUT SCHEMAS
// =====================================================

export const RequestPayoutSchema = z.object({
  body: z.object({
    amount: z.number().min(10).max(100000),
    payment_method: z.string().min(1).max(50)
  })
});

export const GetPayoutsSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20)
  })
});

// =====================================================
// AFFILIATE TRACKING SCHEMAS
// =====================================================

export const TrackClickSchema = z.object({
  body: z.object({
    referral_code: z.string().min(1).max(50),
    visitor_ip: z.string().ip().optional(),
    user_agent: z.string().optional(),
    landing_page: z.string().url().optional(),
    session_id: z.string().optional()
  })
});

export const RecordConversionSchema = z.object({
  body: z.object({
    referral_code: z.string().min(1).max(50),
    conversion_type: z.enum(['registration', 'deposit', 'first_deposit']),
    converted_user_id: z.number().int().positive(),
    conversion_amount: z.number().positive().optional()
  })
});

// =====================================================
// ADMIN AFFILIATE MANAGEMENT SCHEMAS
// =====================================================

export const AdminGetAffiliatesSchema = z.object({
  query: z.object({
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    search: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20)
  })
});

export const AdminUpdateAffiliateSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive()
  }),
  body: z.object({
    commission_rate: z.number().min(1).max(50).optional(),
    minimum_payout: z.number().min(10).max(10000).optional(),
    is_active: z.boolean().optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional()
  })
});

export const AdminCreatePayoutSchema = z.object({
  body: z.object({
    affiliate_id: z.number().int().positive(),
    amount: z.number().min(10).max(100000),
    payment_method: z.string().min(1).max(50),
    payment_reference: z.string().optional(),
    notes: z.string().optional()
  })
});

export const AdminUpdatePayoutSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive()
  }),
  body: z.object({
    status: z.enum(['pending', 'processing', 'completed', 'failed']),
    payment_reference: z.string().optional(),
    notes: z.string().optional()
  })
});

// =====================================================
// RESPONSE SCHEMAS
// =====================================================

export const AffiliateProfileResponse = z.object({
  id: z.number(),
  user_id: z.number(),
  referral_code: z.string(),
  display_name: z.string().nullable(),
  website_url: z.string().nullable(),
  social_media_links: z.record(z.string()).nullable(),
  commission_rate: z.number(),
  minimum_payout: z.number(),
  payment_methods: z.array(z.string()).nullable(),
  is_active: z.boolean(),
  total_referrals: z.number(),
  total_commission_earned: z.number(),
  total_payouts_received: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export const AffiliateDashboardResponse = z.object({
  total_referrals: z.number(),
  active_referrals: z.number(),
  total_commission_earned: z.number(),
  pending_commission: z.number(),
  total_payouts_received: z.number(),
  available_for_payout: z.number(),
  monthly_stats: z.object({
    new_referrals: z.number(),
    commission_earned: z.number(),
    conversions: z.number()
  }),
  recent_referrals: z.array(z.object({
    id: z.number(),
    username: z.string(),
    email: z.string(),
    registration_date: z.string().datetime(),
    first_deposit_amount: z.number().nullable(),
    first_deposit_date: z.string().datetime().nullable(),
    total_commission_earned: z.number(),
    status: z.string()
  })),
  recent_commissions: z.array(z.object({
    id: z.number(),
    referred_user: z.string(),
    commission_amount: z.number(),
    commission_type: z.string(),
    base_amount: z.number(),
    status: z.string(),
    created_at: z.string().datetime()
  })),
  recent_payouts: z.array(z.object({
    id: z.number(),
    total_amount: z.number(),
    status: z.string(),
    created_at: z.string().datetime()
  }))
});

export const CommissionResponse = z.object({
  id: z.number(),
  affiliate_id: z.number(),
  referred_user_id: z.number(),
  transaction_id: z.number(),
  commission_amount: z.number(),
  commission_rate: z.number(),
  base_amount: z.number(),
  commission_type: z.string(),
  status: z.string(),
  paid_at: z.string().datetime().nullable(),
  notes: z.string().nullable(),
  created_at: z.string().datetime(),
  referred_user_username: z.string()
});

export const PayoutResponse = z.object({
  id: z.number(),
  affiliate_id: z.number(),
  total_amount: z.number(),
  commission_ids: z.array(z.number()),
  payment_method: z.string().nullable(),
  payment_reference: z.string().nullable(),
  status: z.string(),
  processed_at: z.string().datetime().nullable(),
  notes: z.string().nullable(),
  created_at: z.string().datetime()
});

export const MarketingMaterialResponse = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  content: z.string(),
  image_url: z.string().nullable(),
  target_url: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string().datetime()
}); 
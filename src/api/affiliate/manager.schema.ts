import { z } from "zod";

// =====================================================
// MANAGER TEAM SCHEMAS
// =====================================================

export const CreateTeamSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    team_commission_rate: z.number().min(1).max(50).optional(),
    team_goals: z.record(z.any()).optional()
  })
});

export const UpdateTeamSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    team_commission_rate: z.number().min(1).max(50).optional(),
    team_goals: z.record(z.any()).optional(),
    is_active: z.boolean().optional()
  })
});

export const AssignAffiliateSchema = z.object({
  body: z.object({
    affiliate_id: z.number().int().positive(),
    team_id: z.number().int().positive()
  })
});

export const TeamPerformanceSchema = z.object({
  query: z.object({
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional()
  })
});

// =====================================================
// RESPONSE SCHEMAS
// =====================================================

export const TeamResponse = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  manager_id: z.number().nullable(),
  team_commission_rate: z.number(),
  team_goals: z.record(z.any()).nullable(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export const ManagerDashboardResponse = z.object({
  total_teams: z.number(),
  total_affiliates: z.number(),
  active_affiliates: z.number(),
  total_commission_earned: z.number(),
  team_summaries: z.array(z.object({
    team_id: z.number(),
    team_name: z.string(),
    affiliate_count: z.number(),
    active_affiliates: z.number(),
    total_referrals: z.number(),
    total_commission: z.number()
  }))
});

export const TeamPerformanceResponse = z.object({
  team_name: z.string(),
  total_affiliates: z.number(),
  active_affiliates: z.number(),
  total_referrals: z.number(),
  total_commission_earned: z.number(),
  total_payouts: z.number()
}); 
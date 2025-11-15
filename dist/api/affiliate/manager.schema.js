"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamPerformanceResponse = exports.ManagerDashboardResponse = exports.TeamResponse = exports.TeamPerformanceSchema = exports.AssignAffiliateSchema = exports.UpdateTeamSchema = exports.CreateTeamSchema = void 0;
const zod_1 = require("zod");
// =====================================================
// MANAGER TEAM SCHEMAS
// =====================================================
exports.CreateTeamSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(100),
        description: zod_1.z.string().optional(),
        team_commission_rate: zod_1.z.number().min(1).max(50).optional(),
        team_goals: zod_1.z.record(zod_1.z.any()).optional()
    })
});
exports.UpdateTeamSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(100).optional(),
        description: zod_1.z.string().optional(),
        team_commission_rate: zod_1.z.number().min(1).max(50).optional(),
        team_goals: zod_1.z.record(zod_1.z.any()).optional(),
        is_active: zod_1.z.boolean().optional()
    })
});
exports.AssignAffiliateSchema = zod_1.z.object({
    body: zod_1.z.object({
        affiliate_id: zod_1.z.number().int().positive(),
        team_id: zod_1.z.number().int().positive()
    })
});
exports.TeamPerformanceSchema = zod_1.z.object({
    query: zod_1.z.object({
        start_date: zod_1.z.string().datetime().optional(),
        end_date: zod_1.z.string().datetime().optional()
    })
});
// =====================================================
// RESPONSE SCHEMAS
// =====================================================
exports.TeamResponse = zod_1.z.object({
    id: zod_1.z.number(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    manager_id: zod_1.z.number().nullable(),
    team_commission_rate: zod_1.z.number(),
    team_goals: zod_1.z.record(zod_1.z.any()).nullable(),
    is_active: zod_1.z.boolean(),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime()
});
exports.ManagerDashboardResponse = zod_1.z.object({
    total_teams: zod_1.z.number(),
    total_affiliates: zod_1.z.number(),
    active_affiliates: zod_1.z.number(),
    total_commission_earned: zod_1.z.number(),
    team_summaries: zod_1.z.array(zod_1.z.object({
        team_id: zod_1.z.number(),
        team_name: zod_1.z.string(),
        affiliate_count: zod_1.z.number(),
        active_affiliates: zod_1.z.number(),
        total_referrals: zod_1.z.number(),
        total_commission: zod_1.z.number()
    }))
});
exports.TeamPerformanceResponse = zod_1.z.object({
    team_name: zod_1.z.string(),
    total_affiliates: zod_1.z.number(),
    active_affiliates: zod_1.z.number(),
    total_referrals: zod_1.z.number(),
    total_commission_earned: zod_1.z.number(),
    total_payouts: zod_1.z.number()
});

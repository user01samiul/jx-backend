"use strict";
/**
 * RFM Segmentation Service
 * Recency, Frequency, Monetary analysis for player segmentation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RFMSegmentationService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
// Segment definitions based on RFM scores
const SEGMENT_DEFINITIONS = [
    {
        segment: 'Champions',
        description: 'Best customers - High value, frequent, recent',
        r_min: 4, r_max: 5,
        f_min: 4, f_max: 5,
        m_min: 4, m_max: 5,
        recommended_action: 'Reward with VIP perks, exclusive tournaments, personal account manager'
    },
    {
        segment: 'Loyal Customers',
        description: 'Consistent players with good value',
        r_min: 3, r_max: 5,
        f_min: 3, f_max: 5,
        m_min: 3, m_max: 5,
        recommended_action: 'Upsell to VIP, offer loyalty bonuses, exclusive game access'
    },
    {
        segment: 'Potential Loyalists',
        description: 'Recent customers with potential',
        r_min: 4, r_max: 5,
        f_min: 2, f_max: 3,
        m_min: 2, m_max: 3,
        recommended_action: 'Engage with personalized offers, encourage frequency with reload bonuses'
    },
    {
        segment: 'New Customers',
        description: 'Recently joined, need nurturing',
        r_min: 4, r_max: 5,
        f_min: 1, f_max: 2,
        m_min: 1, m_max: 2,
        recommended_action: 'Onboarding campaigns, welcome bonuses, tutorial guides'
    },
    {
        segment: 'Promising',
        description: 'Recent activity but low frequency/value',
        r_min: 3, r_max: 4,
        f_min: 1, f_max: 3,
        m_min: 1, m_max: 3,
        recommended_action: 'Create awareness about game variety, offer category-specific bonuses'
    },
    {
        segment: 'Need Attention',
        description: 'Above average recency, frequency & monetary values',
        r_min: 3, r_max: 4,
        f_min: 3, f_max: 4,
        m_min: 3, m_max: 4,
        recommended_action: 'Make limited time offers, recommend based on preferences'
    },
    {
        segment: 'About To Sleep',
        description: 'Below average recency and frequency',
        r_min: 2, r_max: 3,
        f_min: 2, f_max: 3,
        m_min: 2, m_max: 4,
        recommended_action: 'Reactivation bonuses, "We miss you" campaigns, free spins'
    },
    {
        segment: 'At Risk',
        description: 'Spent good money, purchased often but long ago',
        r_min: 1, r_max: 2,
        f_min: 3, f_max: 4,
        m_min: 3, m_max: 4,
        recommended_action: 'Aggressive reactivation, personalized win-back offers, VIP treatment'
    },
    {
        segment: 'Cannot Lose Them',
        description: 'Made big purchases, but long ago',
        r_min: 1, r_max: 2,
        f_min: 4, f_max: 5,
        m_min: 4, m_max: 5,
        recommended_action: 'Urgent win-back campaigns, exclusive bonuses, personal contact'
    },
    {
        segment: 'Hibernating',
        description: 'Last purchase long ago, low value',
        r_min: 1, r_max: 2,
        f_min: 1, f_max: 2,
        m_min: 1, m_max: 2,
        recommended_action: 'Deep discount offers, product recommendations, survey'
    },
    {
        segment: 'Lost',
        description: 'Lowest recency, frequency & monetary scores',
        r_min: 1, r_max: 1,
        f_min: 1, f_max: 2,
        m_min: 1, m_max: 2,
        recommended_action: 'Last attempt campaigns, consider removal from active list'
    }
];
class RFMSegmentationService {
    /**
     * Calculate RFM scores for all active users
     */
    static async calculateRFMScores(days = 90) {
        const query = `
      WITH rfm_base AS (
        SELECT
          u.id as user_id,
          u.username,
          u.email,
          -- Recency (days since last activity)
          COALESCE(
            EXTRACT(DAY FROM (NOW() - MAX(ps.start_time)))::INTEGER,
            999
          ) as recency_days,
          -- Frequency (number of sessions)
          COUNT(DISTINCT ps.id) as frequency_count,
          -- Monetary (total deposits)
          COALESCE(SUM(t.amount), 0) as monetary_value
        FROM users u
        LEFT JOIN player_sessions ps ON u.id = ps.user_id
          AND ps.start_time >= NOW() - INTERVAL '${days} days'
        LEFT JOIN transactions t ON u.id = t.user_id
          AND t.type = 'deposit'
          AND t.status = 'completed'
          AND t.created_at >= NOW() - INTERVAL '${days} days'
        WHERE u.status_id = (SELECT id FROM statuses WHERE name = 'Active')
        GROUP BY u.id, u.username, u.email
      ),
      rfm_quartiles AS (
        SELECT
          PERCENTILE_CONT(0.20) WITHIN GROUP (ORDER BY recency_days) as r_20,
          PERCENTILE_CONT(0.40) WITHIN GROUP (ORDER BY recency_days) as r_40,
          PERCENTILE_CONT(0.60) WITHIN GROUP (ORDER BY recency_days) as r_60,
          PERCENTILE_CONT(0.80) WITHIN GROUP (ORDER BY recency_days) as r_80,
          PERCENTILE_CONT(0.20) WITHIN GROUP (ORDER BY frequency_count) as f_20,
          PERCENTILE_CONT(0.40) WITHIN GROUP (ORDER BY frequency_count) as f_40,
          PERCENTILE_CONT(0.60) WITHIN GROUP (ORDER BY frequency_count) as f_60,
          PERCENTILE_CONT(0.80) WITHIN GROUP (ORDER BY frequency_count) as f_80,
          PERCENTILE_CONT(0.20) WITHIN GROUP (ORDER BY monetary_value) as m_20,
          PERCENTILE_CONT(0.40) WITHIN GROUP (ORDER BY monetary_value) as m_40,
          PERCENTILE_CONT(0.60) WITHIN GROUP (ORDER BY monetary_value) as m_60,
          PERCENTILE_CONT(0.80) WITHIN GROUP (ORDER BY monetary_value) as m_80
        FROM rfm_base
      )
      SELECT
        rb.user_id,
        rb.username,
        rb.email,
        rb.recency_days,
        rb.frequency_count,
        rb.monetary_value,
        -- Recency Score (reversed - lower days = higher score)
        CASE
          WHEN rb.recency_days <= rq.r_20 THEN 5
          WHEN rb.recency_days <= rq.r_40 THEN 4
          WHEN rb.recency_days <= rq.r_60 THEN 3
          WHEN rb.recency_days <= rq.r_80 THEN 2
          ELSE 1
        END as recency_score,
        -- Frequency Score
        CASE
          WHEN rb.frequency_count >= rq.f_80 THEN 5
          WHEN rb.frequency_count >= rq.f_60 THEN 4
          WHEN rb.frequency_count >= rq.f_40 THEN 3
          WHEN rb.frequency_count >= rq.f_20 THEN 2
          ELSE 1
        END as frequency_score,
        -- Monetary Score
        CASE
          WHEN rb.monetary_value >= rq.m_80 THEN 5
          WHEN rb.monetary_value >= rq.m_60 THEN 4
          WHEN rb.monetary_value >= rq.m_40 THEN 3
          WHEN rb.monetary_value >= rq.m_20 THEN 2
          ELSE 1
        END as monetary_score
      FROM rfm_base rb
      CROSS JOIN rfm_quartiles rq
      ORDER BY rb.user_id
    `;
        const result = await postgres_1.default.query(query);
        // Assign segments based on RFM scores
        return result.rows.map(row => {
            const rfmScore = `${row.recency_score}-${row.frequency_score}-${row.monetary_score}`;
            const segment = this.determineSegment(row.recency_score, row.frequency_score, row.monetary_score);
            return Object.assign(Object.assign({}, row), { rfm_score: rfmScore, segment: segment });
        });
    }
    /**
     * Determine segment based on RFM scores
     */
    static determineSegment(r, f, m) {
        for (const def of SEGMENT_DEFINITIONS) {
            if (r >= def.r_min && r <= def.r_max &&
                f >= def.f_min && f <= def.f_max &&
                m >= def.m_min && m <= def.m_max) {
                return def.segment;
            }
        }
        return 'Unclassified';
    }
    /**
     * Save RFM segments to database
     */
    static async saveRFMSegments(scores) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Expire old RFM segments
            await client.query(`
        UPDATE player_segments
        SET valid_until = NOW()
        WHERE segment_type = 'rfm' AND (valid_until IS NULL OR valid_until > NOW())
      `);
            // Insert new segments
            for (const score of scores) {
                const segmentDef = SEGMENT_DEFINITIONS.find(d => d.segment === score.segment);
                await client.query(`
          INSERT INTO player_segments (
            user_id, segment_type, segment_value, rfm_score,
            recency_score, frequency_score, monetary_score,
            score, metadata, calculated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `, [
                    score.user_id,
                    'rfm',
                    score.segment,
                    score.rfm_score,
                    score.recency_score,
                    score.frequency_score,
                    score.monetary_score,
                    (score.recency_score + score.frequency_score + score.monetary_score) / 3 * 20, // 0-100 scale
                    JSON.stringify({
                        recency_days: score.recency_days,
                        frequency_count: score.frequency_count,
                        monetary_value: score.monetary_value,
                        recommended_action: segmentDef === null || segmentDef === void 0 ? void 0 : segmentDef.recommended_action
                    })
                ]);
            }
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get segment distribution
     */
    static async getSegmentDistribution() {
        const query = `
      SELECT
        segment_value as segment,
        COUNT(*) as user_count,
        AVG(score) as avg_score,
        SUM((metadata->>'monetary_value')::numeric) as total_value
      FROM player_segments
      WHERE segment_type = 'rfm'
        AND (valid_until IS NULL OR valid_until > NOW())
      GROUP BY segment_value
      ORDER BY user_count DESC
    `;
        const result = await postgres_1.default.query(query);
        return result.rows;
    }
    /**
     * Get users by segment
     */
    static async getUsersBySegment(segment, limit = 100) {
        const query = `
      SELECT
        u.id,
        u.username,
        u.email,
        ps.rfm_score,
        ps.recency_score,
        ps.frequency_score,
        ps.monetary_score,
        ps.score,
        ps.metadata
      FROM player_segments ps
      JOIN users u ON u.id = ps.user_id
      WHERE ps.segment_type = 'rfm'
        AND ps.segment_value = $1
        AND (ps.valid_until IS NULL OR ps.valid_until > NOW())
      ORDER BY ps.score DESC
      LIMIT $2
    `;
        const result = await postgres_1.default.query(query, [segment, limit]);
        return result.rows;
    }
    /**
     * Get segment definitions with user counts
     */
    static async getSegmentDefinitionsWithCounts() {
        const distribution = await this.getSegmentDistribution();
        return SEGMENT_DEFINITIONS.map(def => {
            const dist = distribution.find(d => d.segment === def.segment) || {
                user_count: 0,
                avg_score: 0,
                total_value: 0
            };
            return Object.assign(Object.assign({}, def), { user_count: Number(dist.user_count), avg_score: Number(dist.avg_score).toFixed(2), total_value: Number(dist.total_value).toFixed(2) });
        });
    }
    /**
     * Calculate and save RFM scores (main execution)
     */
    static async recalculateAll(days = 90) {
        console.log('[RFM] Starting RFM recalculation...');
        // Calculate scores
        const scores = await this.calculateRFMScores(days);
        console.log(`[RFM] Calculated scores for ${scores.length} users`);
        // Save to database
        await this.saveRFMSegments(scores);
        console.log('[RFM] Saved segments to database');
        // Get distribution
        const segments = await this.getSegmentDefinitionsWithCounts();
        console.log('[RFM] Recalculation complete');
        return {
            total_users: scores.length,
            segments: segments
        };
    }
    /**
     * Get recommended actions for a segment
     */
    static getSegmentRecommendations(segment) {
        const def = SEGMENT_DEFINITIONS.find(d => d.segment === segment);
        return (def === null || def === void 0 ? void 0 : def.recommended_action) || 'No specific action recommended';
    }
    /**
     * Get segment health score (overall platform health based on distribution)
     */
    static async getSegmentHealthScore() {
        const distribution = await this.getSegmentDistribution();
        const total = distribution.reduce((sum, d) => sum + Number(d.user_count), 0);
        // Calculate health based on segment distribution
        let healthScore = 0;
        const recommendations = [];
        // Ideal percentages for each segment tier
        const idealDistribution = {
            'Champions': 0.05,
            'Loyal Customers': 0.15,
            'Potential Loyalists': 0.10,
            'At Risk': 0.05,
            'Cannot Lose Them': 0.02
        };
        distribution.forEach(seg => {
            const percentage = Number(seg.user_count) / total;
            const ideal = idealDistribution[seg.segment] || 0;
            if (seg.segment === 'Champions' || seg.segment === 'Loyal Customers') {
                healthScore += percentage * 100 * 2; // Weight these higher
            }
            else if (seg.segment === 'At Risk' || seg.segment === 'Cannot Lose Them') {
                healthScore -= percentage * 100; // Penalize these
            }
            if (ideal && percentage < ideal / 2) {
                recommendations.push(`Low ${seg.segment} percentage - implement retention campaigns`);
            }
        });
        return {
            health_score: Math.max(0, Math.min(100, healthScore)),
            distribution: distribution,
            recommendations: recommendations
        };
    }
}
exports.RFMSegmentationService = RFMSegmentationService;

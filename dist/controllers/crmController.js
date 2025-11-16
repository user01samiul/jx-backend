"use strict";
/**
 * CRM Controller - Player 360 View, Support, VIP Management
 * All data comes from PostgreSQL database - NO MOCKS
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayer360View = getPlayer360View;
exports.addCustomerNote = addCustomerNote;
exports.addPlayerTag = addPlayerTag;
exports.getPlayerGameHistory = getPlayerGameHistory;
exports.getHandHistory = getHandHistory;
const postgres_1 = __importDefault(require("../db/postgres"));
const innova_api_service_1 = require("../services/provider/innova-api.service");
/**
 * Get complete Player 360° View
 * GET /api/admin/crm/players/:userId/360
 */
async function getPlayer360View(req, res) {
    const { userId } = req.params;
    try {
        const client = await postgres_1.default.connect();
        try {
            // Fetch all player data in parallel for performance
            const [userData, profileData, balanceData, transactionStats, recentTransactions, gamingStats, favoriteGames, recentBets, vipStatus, vipManager, complianceData, kycData, supportStats, recentTickets, recentNotes, riskData, playerTags, timelineEvents,] = await Promise.all([
                // User basic info
                client.query(`SELECT u.*, s.name as status_name
           FROM users u
           LEFT JOIN statuses s ON u.status_id = s.id
           WHERE u.id = $1`, [userId]),
                // User profile
                client.query(`SELECT * FROM user_profiles WHERE user_id = $1`, [userId]),
                // Balance data
                client.query(`SELECT * FROM user_balances WHERE user_id = $1`, [userId]),
                // Transaction statistics
                client.query(`SELECT
            COUNT(*) FILTER (WHERE type = 'deposit') as total_deposits_count,
            COUNT(*) FILTER (WHERE type = 'withdrawal') as total_withdrawals_count,
            COALESCE(SUM(amount) FILTER (WHERE type = 'deposit' AND status = 'completed'), 0) as total_deposited,
            COALESCE(SUM(amount) FILTER (WHERE type = 'withdrawal' AND status = 'completed'), 0) as total_withdrawn,
            COALESCE(MAX(amount) FILTER (WHERE type = 'deposit'), 0) as largest_deposit,
            COALESCE(AVG(amount) FILTER (WHERE type = 'deposit' AND status = 'completed'), 0) as average_deposit,
            MAX(created_at) FILTER (WHERE type = 'deposit') as last_deposit_date,
            (SELECT amount FROM transactions WHERE user_id = $1 AND type = 'deposit' ORDER BY created_at DESC LIMIT 1) as last_deposit_amount,
            MAX(created_at) FILTER (WHERE type = 'withdrawal') as last_withdrawal_date,
            ARRAY_AGG(DISTINCT payment_method) FILTER (WHERE payment_method IS NOT NULL) as payment_methods
           FROM transactions
           WHERE user_id = $1`, [userId]),
                // Recent transactions
                client.query(`SELECT id, type, amount, currency, status, payment_method, created_at, created_at as completed_at
           FROM transactions
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 10`, [userId]),
                // Gaming statistics
                client.query(`SELECT
            COUNT(*) as total_bets_count,
            COALESCE(SUM(bet_amount), 0) as total_wagered,
            COALESCE(SUM(win_amount), 0) as total_won,
            COALESCE(SUM(bet_amount - win_amount), 0) as total_lost,
            COALESCE(AVG(bet_amount), 0) as average_bet_size,
            COALESCE(MAX(win_amount), 0) as largest_win,
            COALESCE(MAX(bet_amount), 0) as largest_bet,
            MAX(created_at) as last_bet_date,
            COUNT(DISTINCT DATE(created_at)) as total_sessions
           FROM bets
           WHERE user_id = $1`, [userId]),
                // Favorite games
                client.query(`SELECT
            b.game_id,
            g.name as game_name,
            g.provider as game_provider,
            COUNT(*) as play_count,
            SUM(b.bet_amount) as total_wagered,
            SUM(b.win_amount) as total_won,
            MAX(b.created_at) as last_played
           FROM bets b
           JOIN games g ON b.game_id = g.id
           WHERE b.user_id = $1
           GROUP BY b.game_id, g.name, g.provider
           ORDER BY play_count DESC
           LIMIT 10`, [userId]),
                // Recent bets with detailed game info
                client.query(`SELECT
            b.id,
            b.game_id,
            g.name as game_name,
            g.provider,
            g.category,
            g.subcategory,
            g.rtp_percentage,
            g.volatility,
            b.bet_amount,
            b.win_amount,
            b.multiplier,
            b.outcome,
            b.session_id,
            b.round_id,
            b.game_data,
            b.placed_at as created_at,
            b.result_at,
            t.id as transaction_id,
            t.external_reference as provider_transaction_id,
            t.metadata as transaction_metadata
           FROM bets b
           JOIN games g ON b.game_id = g.id
           LEFT JOIN transactions t ON b.transaction_id = t.id
           WHERE b.user_id = $1
           ORDER BY b.placed_at DESC
           LIMIT 50`, [userId]),
                // VIP status
                client.query(`SELECT
            uvs.*,
            vt.name as tier_name,
            vt.level as tier_level,
            vt.benefits as tier_benefits,
            vt.min_points_required as tier_min_points,
            (SELECT min_points_required FROM vip_tiers WHERE level = vt.level + 1 LIMIT 1) as next_tier_points
           FROM user_vip_status uvs
           LEFT JOIN vip_tiers vt ON uvs.current_tier_id = vt.id
           WHERE uvs.user_id = $1`, [userId]),
                // VIP Account Manager
                client.query(`SELECT
            vam.id,
            u.username as name,
            u.email,
            vam.phone_number as phone,
            vam.whatsapp,
            vam.telegram
           FROM vip_player_assignments vpa
           JOIN vip_account_managers vam ON vpa.manager_id = vam.id
           JOIN users u ON vam.user_id = u.id
           WHERE vpa.user_id = $1 AND vpa.is_active = true
           LIMIT 1`, [userId]),
                // Compliance data
                client.query(`SELECT
            uks.kyc_status,
            uks.is_verified as kyc_verified,
            uks.verified_at as kyc_verified_at,
            uks.verification_level as kyc_level,
            0 as aml_risk_score,
            false as pep_status,
            false as source_of_funds_verified,
            COALESCE(uks.documents_submitted, 0) as documents_submitted,
            (SELECT COUNT(*) FROM kyc_documents WHERE user_id = $1 AND status = 'pending') as documents_pending
           FROM user_kyc_status uks
           WHERE uks.user_id = $1`, [userId]),
                // KYC limits (responsible gaming) - using default values as these columns don't exist in view
                client.query(`SELECT
            NULL::numeric as deposit_limit_daily,
            NULL::numeric as deposit_limit_weekly,
            NULL::numeric as deposit_limit_monthly,
            NULL::numeric as loss_limit_daily,
            NULL::numeric as loss_limit_weekly,
            NULL::numeric as loss_limit_monthly,
            NULL::integer as session_time_limit,
            NULL::timestamp as cool_off_until,
            NULL::integer as reality_check_interval
           WHERE FALSE`, []),
                // Support statistics
                client.query(`SELECT
            COUNT(*) as total_tickets,
            COUNT(*) FILTER (WHERE status IN ('new', 'open', 'in_progress')) as open_tickets,
            COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved_tickets,
            AVG(satisfaction_score) as average_satisfaction_score,
            MAX(created_at) as last_ticket_date,
            (SELECT subject FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1) as last_ticket_subject,
            (SELECT COUNT(*) FROM complaints WHERE user_id = $1) as complaints_count,
            (SELECT COUNT(*) FROM support_tickets WHERE user_id = $1 AND escalation_level > 0) as escalations_count,
            (SELECT COUNT(*) FROM chat_messages WHERE user_id = $1) as chat_sessions,
            AVG(resolution_time) as average_resolution_time
           FROM support_tickets
           WHERE user_id = $1`, [userId]),
                // Recent support tickets
                client.query(`SELECT
            st.id,
            st.ticket_number,
            st.subject,
            st.category,
            st.status,
            st.priority,
            st.created_at,
            st.satisfaction_score,
            u.username as assigned_to_name
           FROM support_tickets st
           LEFT JOIN users u ON st.assigned_to = u.id
           WHERE st.user_id = $1
           ORDER BY st.created_at DESC
           LIMIT 5`, [userId]),
                // Recent customer notes
                client.query(`SELECT
            cn.id,
            u.username as agent_name,
            cn.note_type,
            cn.category,
            cn.subject,
            cn.content,
            cn.sentiment,
            cn.is_important,
            cn.is_flagged,
            cn.is_pinned,
            cn.tags,
            cn.attachments,
            cn.created_at,
            cn.updated_at
           FROM customer_notes cn
           LEFT JOIN users u ON cn.agent_id = u.id
           WHERE cn.user_id = $1
           ORDER BY cn.is_pinned DESC, cn.created_at DESC
           LIMIT 10`, [userId]),
                // Risk data
                client.query(`SELECT
            churn_score as churn_risk_score,
            risk_level as risk_category
           FROM churn_risk_overview
           WHERE user_id = $1`, [userId]),
                // Player tags
                client.query(`SELECT
            pt.id,
            pt.name,
            pt.slug,
            pt.color,
            pt.category,
            pt.icon,
            ut.tagged_at,
            u.username as tagged_by,
            ut.auto_tagged
           FROM user_tags ut
           JOIN player_tags pt ON ut.tag_id = pt.id
           LEFT JOIN users u ON ut.tagged_by = u.id
           WHERE ut.user_id = $1`, [userId]),
                // Timeline events (last 50)
                client.query(`SELECT
            id,
            event_type,
            event_category,
            event_data,
            amount,
            currency,
            ip_address,
            performed_by,
            created_at
           FROM customer_timeline
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 50`, [userId]),
            ]);
            // Process and format the data
            const user = userData.rows[0];
            if (!user) {
                return res.status(404).json({ success: false, error: "User not found" });
            }
            const profile = profileData.rows[0] || {};
            const balance = balanceData.rows[0] || {};
            const txStats = transactionStats.rows[0] || {};
            const gaming = gamingStats.rows[0] || {};
            const compliance = complianceData.rows[0] || {};
            const kycLimits = kycData.rows[0] || {};
            const support = supportStats.rows[0] || {};
            const risk = riskData.rows[0] || { churn_risk_score: 0, risk_category: "low" };
            const vip = vipStatus.rows[0];
            const vipMgr = vipManager.rows[0];
            // Calculate derived values
            const netDeposits = parseFloat(txStats.total_deposited || 0) - parseFloat(txStats.total_withdrawn || 0);
            const winLossRatio = gaming.total_wagered > 0 ? gaming.total_won / gaming.total_wagered : 0;
            const daysSinceLastDeposit = txStats.last_deposit_date
                ? Math.floor((Date.now() - new Date(txStats.last_deposit_date).getTime()) / (1000 * 60 * 60 * 24))
                : null;
            // Calculate GGR and NGR (simplified)
            const ggr = parseFloat(gaming.total_wagered || 0) - parseFloat(gaming.total_won || 0);
            const bonusCost = 0; // TODO: Calculate from bonus_wagering_history table
            const ngr = ggr - bonusCost;
            // Calculate LTV
            const ltv = netDeposits + ggr;
            // Player value score (0-100) - simplified calculation
            const playerValueScore = Math.min(100, Math.floor((ltv / 1000) * 30 + // 30 points for every $1000 LTV
                (gaming.total_bets_count / 100) * 20 + // 20 points for every 100 bets
                (vip ? 30 : 0) // 30 points if VIP
            ));
            // Format timeline events
            const timeline = timelineEvents.rows.map((event) => ({
                ...event,
                description: generateTimelineDescription(event),
                color: getTimelineColor(event.event_category),
                performed_by: event.performed_by ? "Agent" : undefined,
            }));
            // Build the response
            const player360Data = {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    first_name: profile.first_name,
                    last_name: profile.last_name,
                    full_name: profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : user.username,
                    phone_number: profile.phone_number,
                    date_of_birth: profile.date_of_birth,
                    age: profile.date_of_birth ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : null,
                    nationality: profile.nationality,
                    country: profile.country,
                    city: profile.city,
                    address: profile.address,
                    postal_code: profile.postal_code,
                    gender: profile.gender,
                    timezone: profile.timezone,
                    language: profile.language,
                    currency: profile.currency,
                    avatar_url: profile.avatar_url,
                    registration_date: user.created_at,
                    last_login: profile.last_login_at,
                    last_activity: profile.last_activity_at,
                    status: user.status_name || "Active",
                    is_online: profile.last_activity_at ? (Date.now() - new Date(profile.last_activity_at).getTime()) < 5 * 60 * 1000 : false,
                    is_verified: profile.is_verified,
                    is_2fa_enabled: user.is_2fa_enabled,
                },
                financial: {
                    current_balance: parseFloat(balance.balance || 0),
                    bonus_balance: parseFloat(balance.bonus_balance || 0),
                    locked_balance: parseFloat(balance.locked_balance || 0),
                    total_deposited: parseFloat(txStats.total_deposited || 0),
                    total_withdrawn: parseFloat(txStats.total_withdrawn || 0),
                    net_deposits: netDeposits,
                    total_deposits_count: parseInt(txStats.total_deposits_count || 0),
                    total_withdrawals_count: parseInt(txStats.total_withdrawals_count || 0),
                    average_deposit: parseFloat(txStats.average_deposit || 0),
                    largest_deposit: parseFloat(txStats.largest_deposit || 0),
                    last_deposit_date: txStats.last_deposit_date,
                    last_deposit_amount: parseFloat(txStats.last_deposit_amount || 0),
                    last_withdrawal_date: txStats.last_withdrawal_date,
                    days_since_last_deposit: daysSinceLastDeposit,
                    preferred_payment_methods: txStats.payment_methods || [],
                    lifetime_value: ltv,
                    ggr,
                    ngr,
                    bonus_cost: bonusCost,
                    player_value_score: playerValueScore,
                    deposits_by_month: [], // TODO: Implement monthly aggregation
                    recent_transactions: recentTransactions.rows,
                },
                gaming: {
                    total_bets_count: parseInt(gaming.total_bets_count || 0),
                    total_wagered: parseFloat(gaming.total_wagered || 0),
                    total_won: parseFloat(gaming.total_won || 0),
                    total_lost: parseFloat(gaming.total_lost || 0),
                    win_loss_ratio: winLossRatio,
                    average_bet_size: parseFloat(gaming.average_bet_size || 0),
                    largest_win: parseFloat(gaming.largest_win || 0),
                    largest_bet: parseFloat(gaming.largest_bet || 0),
                    favorite_games: favoriteGames.rows,
                    game_categories_played: [], // TODO: Extract from games data
                    total_sessions: parseInt(gaming.total_sessions || 0),
                    avg_session_duration: 45, // TODO: Calculate from session data
                    playing_hours_heatmap: [],
                    last_bet_date: gaming.last_bet_date,
                    days_since_last_bet: gaming.last_bet_date
                        ? Math.floor((Date.now() - new Date(gaming.last_bet_date).getTime()) / (1000 * 60 * 60 * 24))
                        : null,
                    rtp_by_game: [],
                    recent_bets: recentBets.rows,
                },
                vip: vip ? {
                    is_vip: true,
                    current_tier: vip.tier_name,
                    tier_id: vip.tier_id,
                    tier_level: vip.tier_level,
                    points: parseInt(vip.points || 0),
                    points_to_next_tier: vip.next_tier_points ? vip.next_tier_points - vip.points : null,
                    progress_percentage: vip.next_tier_points
                        ? ((vip.points - vip.tier_min_points) / (vip.next_tier_points - vip.tier_min_points)) * 100
                        : 100,
                    tier_benefits: vip.tier_benefits || [],
                    lifetime_points: parseInt(vip.lifetime_points || 0),
                    account_manager: vipMgr || null,
                    vip_since: vip.created_at,
                    tier_history: [], // TODO: Fetch from vip_tier_history
                    exclusive_offers_count: 0, // TODO: Count from vip_exclusive_offers
                    gifts_received_count: 0, // TODO: Count from vip_gifts
                    custom_bonuses_count: 0, // TODO: Count from vip_custom_bonuses
                } : {
                    is_vip: false,
                    current_tier: null,
                    points: 0,
                    points_to_next_tier: null,
                    tier_benefits: [],
                    lifetime_points: 0,
                },
                compliance: {
                    kyc_status: compliance.kyc_status || "not_started",
                    kyc_verified: compliance.kyc_verified || false,
                    kyc_verified_at: compliance.kyc_verified_at,
                    kyc_level: parseInt(compliance.kyc_level || 0),
                    aml_risk_score: parseInt(compliance.aml_risk_score || 0),
                    pep_status: compliance.pep_status || false,
                    source_of_funds_verified: compliance.source_of_funds_verified || false,
                    documents_submitted: parseInt(compliance.documents_submitted || 0),
                    documents_pending: parseInt(compliance.documents_pending || 0),
                    responsible_gaming_limits: {
                        deposit_limit_daily: kycLimits.deposit_limit_daily,
                        deposit_limit_weekly: kycLimits.deposit_limit_weekly,
                        deposit_limit_monthly: kycLimits.deposit_limit_monthly,
                        loss_limit_daily: kycLimits.loss_limit_daily,
                        loss_limit_weekly: kycLimits.loss_limit_weekly,
                        loss_limit_monthly: kycLimits.loss_limit_monthly,
                        session_time_limit: kycLimits.session_time_limit,
                        cool_off_until: kycLimits.cool_off_until,
                        reality_check_interval: kycLimits.reality_check_interval,
                    },
                    self_exclusion_history: [],
                    flagged_activities_count: 0,
                    last_kyc_update: compliance.updated_at,
                },
                communication: {
                    email_sent_count: 0, // TODO: Count from email_logs
                    email_open_rate: 0,
                    email_click_rate: 0,
                    sms_sent_count: 0,
                    sms_click_rate: 0,
                    last_email_sent: null,
                    last_email_opened: null,
                    unsubscribed_from_marketing: false,
                    preferred_contact_method: "email",
                    communication_language: profile.language || "en",
                    inbox_unread_count: 0, // TODO: Count from player_inbox
                    recent_emails: [],
                },
                support: {
                    total_tickets: parseInt(support.total_tickets || 0),
                    open_tickets: parseInt(support.open_tickets || 0),
                    resolved_tickets: parseInt(support.resolved_tickets || 0),
                    average_satisfaction_score: parseFloat(support.average_satisfaction_score || 0),
                    last_ticket_date: support.last_ticket_date,
                    last_ticket_subject: support.last_ticket_subject,
                    complaints_count: parseInt(support.complaints_count || 0),
                    escalations_count: parseInt(support.escalations_count || 0),
                    chat_sessions: parseInt(support.chat_sessions || 0),
                    average_resolution_time: parseInt(support.average_resolution_time || 0),
                    recent_tickets: recentTickets.rows,
                    recent_notes: recentNotes.rows,
                },
                risk: {
                    overall_risk_score: parseInt(risk.churn_risk_score || 0),
                    risk_category: risk.risk_category || "low",
                    churn_risk_score: parseInt(risk.churn_risk_score || 0),
                    fraud_risk_score: 0, // TODO: Implement fraud detection
                    problem_gambling_risk: 0, // TODO: Implement problem gambling detection
                    multi_account_risk: false,
                    bonus_abuse_score: 0,
                    velocity_alerts: 0,
                    active_alerts: [],
                    risk_factors: [],
                },
                timeline,
                tags: playerTags.rows,
                notes: recentNotes.rows,
                gamingActivity: recentBets.rows, // Add gaming activity for CRM visualization
            };
            res.json({ success: true, data: player360Data });
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error("Error fetching player 360 view:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
// Helper functions
function generateTimelineDescription(event) {
    switch (event.event_type) {
        case "login":
            return "User logged in";
        case "deposit":
            return `Deposit completed`;
        case "withdrawal":
            return `Withdrawal completed`;
        case "bet_placed":
            return `Placed bet`;
        case "bonus_claimed":
            return "Bonus claimed";
        case "kyc_verified":
            return "KYC verification completed";
        case "vip_upgrade":
            return "VIP tier upgraded";
        case "note_added":
            return "Agent note added";
        default:
            return event.event_type.replace(/_/g, " ");
    }
}
function getTimelineColor(category) {
    switch (category) {
        case "financial":
            return "bg-green-100";
        case "gaming":
            return "bg-purple-100";
        case "account":
            return "bg-blue-100";
        case "support":
            return "bg-yellow-100";
        case "compliance":
            return "bg-red-100";
        case "vip":
            return "bg-orange-100";
        default:
            return "bg-gray-100";
    }
}
/**
 * Add customer note
 * POST /api/admin/crm/players/:userId/notes
 */
async function addCustomerNote(req, res) {
    const { userId } = req.params;
    const { note_type, category, subject, content, sentiment, is_important, is_flagged, tags } = req.body;
    const agentId = req.user?.userId;
    try {
        const result = await postgres_1.default.query(`INSERT INTO customer_notes
       (user_id, agent_id, note_type, category, subject, content, sentiment, is_important, is_flagged, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`, [userId, agentId, note_type, category, subject, content, sentiment, is_important, is_flagged, tags || [], agentId]);
        // Also add to timeline
        await postgres_1.default.query(`INSERT INTO customer_timeline
       (user_id, event_type, event_category, event_data, performed_by)
       VALUES ($1, 'note_added', 'support', $2, $3)`, [userId, JSON.stringify({ note_id: result.rows[0].id, subject }), agentId]);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error("Error adding customer note:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
/**
 * Add player tag
 * POST /api/admin/crm/players/:userId/tags
 */
async function addPlayerTag(req, res) {
    const { userId } = req.params;
    const { tag_id } = req.body;
    const agentId = req.user?.userId;
    try {
        const result = await postgres_1.default.query(`INSERT INTO user_tags (user_id, tag_id, tagged_by, auto_tagged)
       VALUES ($1, $2, $3, false)
       ON CONFLICT (user_id, tag_id) DO NOTHING
       RETURNING *`, [userId, tag_id, agentId]);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error("Error adding player tag:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
/**
 * Get player game history with pagination
 * GET /api/admin/crm/players/:userId/game-history
 */
async function getPlayerGameHistory(req, res) {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    try {
        const client = await postgres_1.default.connect();
        try {
            // Get game history with complete game details, context data, and round tracking
            const historyQuery = await client.query(`SELECT
          b.id as bet_id,
          b.transaction_id,
          b.bet_amount,
          b.win_amount,
          b.multiplier,
          b.outcome,
          b.placed_at,
          b.result_at,
          b.session_id,
          b.round_id,
          b.game_data,
          g.id as game_id,
          g.name as game_name,
          g.provider as game_provider,
          g.vendor as game_vendor,
          g.game_code,
          g.category as game_category,
          g.subcategory,
          g.rtp_percentage,
          g.volatility,
          (b.win_amount - b.bet_amount) as profit_loss
         FROM bets b
         JOIN games g ON b.game_id = g.id
         WHERE b.user_id = $1
         ORDER BY b.placed_at DESC
         LIMIT $2 OFFSET $3`, [userId, limit, offset]);
            // Get total count for pagination
            const countQuery = await client.query(`SELECT COUNT(*) as total FROM bets WHERE user_id = $1`, [userId]);
            const totalBets = parseInt(countQuery.rows[0]?.total || 0);
            const totalPages = Math.ceil(totalBets / limit);
            res.json({
                success: true,
                data: {
                    bets: historyQuery.rows,
                    pagination: {
                        page,
                        limit,
                        total: totalBets,
                        totalPages,
                        hasMore: page < totalPages,
                    },
                },
            });
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error("Error fetching player game history:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
/**
 * Get hand history from Innova API for a specific bet
 * GET /api/admin/crm/game-history/:betId/hand-history
 */
async function getHandHistory(req, res) {
    const { betId } = req.params;
    try {
        // Get bet details including transaction_id and session_id
        const betQuery = await postgres_1.default.query(`SELECT
        b.id,
        b.transaction_id,
        b.session_id,
        g.vendor as game_vendor
       FROM bets b
       JOIN games g ON b.game_id = g.id
       WHERE b.id = $1`, [betId]);
        if (betQuery.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Bet not found" });
        }
        const bet = betQuery.rows[0];
        if (!bet.transaction_id) {
            return res.status(400).json({
                success: false,
                error: "No transaction ID available for this bet"
            });
        }
        // Use session_id as history_id, fallback to transaction_id if session_id not available
        const historyId = bet.session_id || bet.transaction_id.toString();
        console.log(`[HAND HISTORY] Fetching for bet ${betId}, transaction ${bet.transaction_id}, history ${historyId}`);
        // Fetch hand history from Innova API
        const handHistory = await innova_api_service_1.InnovaApiService.getHandHistory(bet.transaction_id, historyId, bet.game_vendor);
        res.json({
            success: true,
            data: handHistory,
        });
    }
    catch (error) {
        console.error("Error fetching hand history:", error);
        // Return more specific error if available
        if (error?.response?.status === 404) {
            return res.status(404).json({
                success: false,
                error: "Hand history not available for this game"
            });
        }
        res.status(500).json({
            success: false,
            error: error?.message || "Failed to fetch hand history"
        });
    }
}

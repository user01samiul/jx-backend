"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserAnalyticsService = exports.getRevenueAnalyticsService = exports.getDashboardStatsService = exports.updateSystemSettingsService = exports.getSystemSettingsService = exports.approveTransactionService = exports.getTransactionsForAdminService = exports.getPaymentGatewaysService = exports.updatePaymentGatewayService = exports.createPaymentGatewayService = exports.updateUserBalanceService = exports.updateUserStatusService = exports.getUsersForAdminService = exports.getGamesForAdminService = exports.deleteGameService = exports.updateGameService = exports.createGameService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
// =====================================================
// GAME MANAGEMENT SERVICES
// =====================================================
const createGameService = async (gameData) => {
    const query = `
    INSERT INTO games (name, provider, category, subcategory, image_url, 
      game_code, rtp_percentage, volatility, min_bet, max_bet,
      is_featured, is_new, is_hot, is_active, features, rating, popularity, description)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING *
  `;
    const values = [
        gameData.name, gameData.provider, gameData.category, gameData.subcategory,
        gameData.image_url, gameData.game_code, gameData.rtp_percentage,
        gameData.volatility, gameData.min_bet, gameData.max_bet,
        gameData.is_featured || false, gameData.is_new || false,
        gameData.is_hot || false, gameData.is_active !== false,
        gameData.features || [], gameData.rating, gameData.popularity, gameData.description
    ];
    const result = await postgres_1.default.query(query, values);
    return result.rows[0];
};
exports.createGameService = createGameService;
const updateGameService = async (gameId, gameData) => {
    const fields = [];
    const values = [];
    let paramCount = 1;
    Object.entries(gameData).forEach(([key, value]) => {
        if (value !== undefined) {
            fields.push(`${key} = $${paramCount}`);
            values.push(value);
            paramCount++;
        }
    });
    if (fields.length === 0) {
        throw new Error("No valid fields to update");
    }
    values.push(gameId);
    const query = `
    UPDATE games 
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount}
    RETURNING *
  `;
    const result = await postgres_1.default.query(query, values);
    return result.rows[0];
};
exports.updateGameService = updateGameService;
const deleteGameService = async (gameId) => {
    const query = "DELETE FROM games WHERE id = $1 RETURNING *";
    const result = await postgres_1.default.query(query, [gameId]);
    return result.rows[0];
};
exports.deleteGameService = deleteGameService;
const getGamesForAdminService = async (filters = {}) => {
    let query = `
    SELECT g.*, 
           COUNT(DISTINCT b.id) as total_bets,
           SUM(b.bet_amount) as total_wagered,
           SUM(b.win_amount) as total_won
    FROM games g
    LEFT JOIN bets b ON g.id = b.game_id
  `;
    const conditions = [];
    const values = [];
    let paramCount = 1;
    if (filters.provider) {
        conditions.push(`g.provider = $${paramCount}`);
        values.push(filters.provider);
        paramCount++;
    }
    if (filters.category) {
        conditions.push(`g.category = $${paramCount}`);
        values.push(filters.category);
        paramCount++;
    }
    if (filters.is_active !== undefined) {
        conditions.push(`g.is_active = $${paramCount}`);
        values.push(filters.is_active);
        paramCount++;
    }
    if (filters.search) {
        conditions.push(`(g.name ILIKE $${paramCount} OR g.provider ILIKE $${paramCount})`);
        values.push(`%${filters.search}%`);
        paramCount++;
    }
    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
    }
    query += ` GROUP BY g.id ORDER BY g.created_at DESC`;
    if (filters.limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(filters.limit);
    }
    const result = await postgres_1.default.query(query, values);
    return result.rows;
};
exports.getGamesForAdminService = getGamesForAdminService;
// =====================================================
// USER MANAGEMENT SERVICES
// =====================================================
const getUsersForAdminService = async (filters) => {
    let query = `
    SELECT u.id, u.username, u.email, u.password, u.auth_secret, u.qr_code, u.status_id, 
           u.created_at, u.created_by, u.updated_at, u.updated_by, u.is_2fa_enabled,
           up.first_name, up.last_name, up.phone_number, up.date_of_birth, up.nationality,
           up.country, up.city, up.address, up.postal_code, up.gender, up.timezone,
           up.language, up.currency, up.verification_level, up.is_verified, up.avatar_url,
           s.name as status_name,
           COUNT(DISTINCT b.id) as total_bets,
           COALESCE(SUM(b.bet_amount),0) as total_wagered,
           COALESCE(SUM(b.win_amount),0) as total_won,
           ub.balance, ub.total_deposited, ub.total_withdrawn,
           r.name as role_name, r.description as role_description,
           ul.name as level_name, ulp.current_points, ulp.total_points_earned,
           ul.cashback_percentage, ul.withdrawal_limit,
           COUNT(DISTINCT kd.id) as kyc_documents_count,
           COUNT(CASE WHEN kd.status = 'approved' THEN 1 END) as kyc_approved_count,
           MAX(us.login_at) as last_login,
           MAX(us.last_activity_at) as last_session_activity,
           u.created_at as registration_date
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN statuses s ON u.status_id = s.id
    LEFT JOIN bets b ON u.id = b.user_id
    LEFT JOIN user_balances ub ON u.id = ub.user_id
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    LEFT JOIN user_level_progress ulp ON u.id = ulp.user_id
    LEFT JOIN user_levels ul ON ulp.level_id = ul.id
    LEFT JOIN kyc_documents kd ON u.id = kd.user_id
    LEFT JOIN user_sessions us ON u.id = us.user_id
  `;
    const conditions = [];
    const values = [];
    let paramCount = 1;
    if (filters.status) {
        conditions.push(`s.name = $${paramCount}`);
        values.push(filters.status);
        paramCount++;
    }
    if (filters.verification_level !== undefined) {
        conditions.push(`up.verification_level = $${paramCount}`);
        values.push(filters.verification_level);
        paramCount++;
    }
    if (filters.search) {
        conditions.push(`(u.username ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
        values.push(`%${filters.search}%`);
        paramCount++;
    }
    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
    }
    query += ` GROUP BY u.id, up.id, s.name, ub.balance, ub.total_deposited, ub.total_withdrawn, r.name, r.description, ul.name, ulp.current_points, ulp.total_points_earned, ul.cashback_percentage, ul.withdrawal_limit`;
    query += ` ORDER BY u.created_at DESC`;
    if (filters.limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(filters.limit);
    }
    const result = await postgres_1.default.query(query, values);
    return result.rows;
};
exports.getUsersForAdminService = getUsersForAdminService;
const updateUserStatusService = async (userId, statusData) => {
    const fields = [];
    const values = [];
    let paramCount = 1;
    const statusQuery = "SELECT id FROM statuses WHERE name = $1";
    const statusResult = await postgres_1.default.query(statusQuery, [statusData.status]);
    if (statusResult.rows.length === 0) {
        throw new Error("Invalid status");
    }
    fields.push(`status_id = $${paramCount}`);
    values.push(statusResult.rows[0].id);
    paramCount++;
    values.push(userId);
    const query = `
    UPDATE users 
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount}
    RETURNING *
  `;
    const result = await postgres_1.default.query(query, values);
    // Log admin status update activity
    await postgres_1.default.query(`
    INSERT INTO user_activity_logs 
    (user_id, action, category, description, metadata)
    VALUES ($1, 'admin_status_update', 'account', $2, $3)
    `, [
        userId,
        `Status updated to: ${statusData.status}`,
        JSON.stringify({
            new_status: statusData.status,
            reason: statusData.reason || 'No reason provided'
        })
    ]);
    return result.rows[0];
};
exports.updateUserStatusService = updateUserStatusService;
const updateUserBalanceService = async (userId, balanceData) => {
    var _a;
    const fields = [];
    const values = [];
    let paramCount = 1;
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        // Get current balance for logging
        const currentBalanceResult = await client.query('SELECT balance FROM user_balances WHERE user_id = $1', [userId]);
        const currentBalance = ((_a = currentBalanceResult.rows[0]) === null || _a === void 0 ? void 0 : _a.balance) || 0;
        // Create transaction record with category metadata if specified
        const transactionMetadata = balanceData.category ? { category: balanceData.category } : null;
        const transactionQuery = `
      INSERT INTO transactions (user_id, type, amount, status, description, metadata)
      VALUES ($1, $2, $3, 'completed', $4, $5)
      RETURNING id
    `;
        const transactionResult = await client.query(transactionQuery, [
            userId,
            balanceData.type,
            balanceData.amount,
            balanceData.reason || 'Admin adjustment',
            transactionMetadata ? JSON.stringify(transactionMetadata) : null
        ]);
        if (balanceData.category) {
            // Update category balance
            console.log(`[ADMIN_BALANCE] Updating category balance for ${balanceData.category}`);
            const categoryBalanceResult = await client.query('SELECT balance FROM user_category_balances WHERE user_id = $1 AND LOWER(TRIM(category)) = $2', [userId, balanceData.category.toLowerCase().trim()]);
            let currentCategoryBalance = 0;
            if (categoryBalanceResult.rows.length > 0) {
                currentCategoryBalance = Number(categoryBalanceResult.rows[0].balance) || 0;
            }
            const adjustmentAmount = balanceData.type === 'withdrawal' ? -balanceData.amount : balanceData.amount;
            const newCategoryBalance = currentCategoryBalance + adjustmentAmount;
            // Insert or update category balance
            await client.query(`INSERT INTO user_category_balances (user_id, category, balance)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, category) DO UPDATE SET balance = EXCLUDED.balance`, [userId, balanceData.category.toLowerCase().trim(), newCategoryBalance]);
            console.log(`[ADMIN_BALANCE] Category balance updated: ${currentCategoryBalance} + ${adjustmentAmount} = ${newCategoryBalance}`);
        }
        else {
            // Update main balance
            const balanceIdx = paramCount;
            fields.push(`balance = balance + $${balanceIdx}`);
            values.push(balanceData.type === 'withdrawal' ? -balanceData.amount : balanceData.amount);
            paramCount++;
            // Use explicit parameter indices for type and amount
            const depositTypeIdx = paramCount;
            const depositAmountIdx = paramCount + 1;
            fields.push(`total_deposited = CASE WHEN $${depositTypeIdx} = 'deposit' THEN total_deposited + $${depositAmountIdx} ELSE total_deposited END`);
            values.push(balanceData.type);
            values.push(balanceData.amount);
            paramCount += 2;
            const withdrawTypeIdx = paramCount;
            const withdrawAmountIdx = paramCount + 1;
            fields.push(`total_withdrawn = CASE WHEN $${withdrawTypeIdx} = 'withdrawal' THEN total_withdrawn + $${withdrawAmountIdx} ELSE total_withdrawn END`);
            values.push(balanceData.type);
            values.push(balanceData.amount);
            paramCount += 2;
            fields.push(`updated_at = CURRENT_TIMESTAMP`);
            const userIdIdx = paramCount;
            const balanceQuery = `
        UPDATE user_balances 
        SET ${fields.join(", ")}
        WHERE user_id = $${userIdIdx}
        RETURNING *
      `;
            values.push(userId);
            console.log('[DEBUG][ADMIN][UPDATE USER BALANCE][BEFORE]', { userId, updateFields: fields, updateValues: values });
            const balanceResult = await client.query(balanceQuery, values);
            console.log('[DEBUG][ADMIN][UPDATE USER BALANCE][AFTER]', { userId, updateFields: fields, updateValues: values });
        }
        // Log admin balance adjustment activity
        await client.query(`
      INSERT INTO user_activity_logs 
      (user_id, action, category, description, metadata)
      VALUES ($1, 'admin_balance_adjustment', 'financial', $2, $3)
      `, [
            userId,
            `Admin ${balanceData.type} adjustment: ${balanceData.amount}${balanceData.category ? ` (${balanceData.category})` : ''}`,
            JSON.stringify({
                type: balanceData.type,
                amount: balanceData.amount,
                reason: balanceData.reason,
                category: balanceData.category,
                transaction_id: transactionResult.rows[0].id
            })
        ]);
        await client.query('COMMIT');
        return {
            transaction: transactionResult.rows[0],
            balance: balanceData.category ? { category: balanceData.category, balance: newCategoryBalance } : balanceResult.rows[0]
        };
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
};
exports.updateUserBalanceService = updateUserBalanceService;
// =====================================================
// PAYMENT GATEWAY SERVICES
// =====================================================
const createPaymentGatewayService = async (gatewayData) => {
    const query = `
    INSERT INTO payment_gateways (
      name, code, type, api_endpoint, api_key, api_secret,
      is_active, supported_currencies, min_amount, max_amount, auto_approval
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;
    const values = [
        gatewayData.name, gatewayData.code, gatewayData.type,
        gatewayData.api_endpoint, gatewayData.api_key, gatewayData.api_secret,
        gatewayData.is_active !== false, gatewayData.supported_currencies,
        gatewayData.min_amount, gatewayData.max_amount, gatewayData.auto_approval || false
    ];
    const result = await postgres_1.default.query(query, values);
    return result.rows[0];
};
exports.createPaymentGatewayService = createPaymentGatewayService;
const updatePaymentGatewayService = async (gatewayId, gatewayData) => {
    const fields = [];
    const values = [];
    let paramCount = 1;
    Object.entries(gatewayData).forEach(([key, value]) => {
        if (value !== undefined) {
            fields.push(`${key} = $${paramCount}`);
            values.push(value);
            paramCount++;
        }
    });
    if (fields.length === 0) {
        throw new Error("No fields to update");
    }
    values.push(gatewayId);
    const query = `
    UPDATE payment_gateways 
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount}
    RETURNING *
  `;
    const result = await postgres_1.default.query(query, values);
    return result.rows[0];
};
exports.updatePaymentGatewayService = updatePaymentGatewayService;
const getPaymentGatewaysService = async (filters = {}) => {
    let query = "SELECT * FROM payment_gateways";
    const conditions = [];
    const values = [];
    let paramCount = 1;
    if (filters.type) {
        conditions.push(`type = $${paramCount}`);
        values.push(filters.type);
        paramCount++;
    }
    if (filters.is_active !== undefined) {
        conditions.push(`is_active = $${paramCount}`);
        values.push(filters.is_active);
        paramCount++;
    }
    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
    }
    query += " ORDER BY created_at DESC";
    const result = await postgres_1.default.query(query, values);
    return result.rows;
};
exports.getPaymentGatewaysService = getPaymentGatewaysService;
// =====================================================
// TRANSACTION MANAGEMENT SERVICES
// =====================================================
const getTransactionsForAdminService = async (filters) => {
    let query = `
    SELECT t.*, u.username, u.email, up.first_name, up.last_name
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
  `;
    const conditions = [];
    const values = [];
    let paramCount = 1;
    if (filters.type) {
        conditions.push(`t.type = $${paramCount}`);
        values.push(filters.type);
        paramCount++;
    }
    if (filters.status) {
        conditions.push(`t.status = $${paramCount}`);
        values.push(filters.status);
        paramCount++;
    }
    if (filters.start_date) {
        conditions.push(`t.created_at >= $${paramCount}`);
        values.push(filters.start_date);
        paramCount++;
    }
    if (filters.end_date) {
        conditions.push(`t.created_at <= $${paramCount}`);
        values.push(filters.end_date);
        paramCount++;
    }
    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
    }
    query += " ORDER BY t.created_at DESC";
    if (filters.limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(filters.limit);
    }
    const result = await postgres_1.default.query(query, values);
    return result.rows;
};
exports.getTransactionsForAdminService = getTransactionsForAdminService;
const approveTransactionService = async (approvalData) => {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        // Update transaction status
        const transactionQuery = `
      UPDATE transactions 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
        const transactionResult = await client.query(transactionQuery, [
            approvalData.status, approvalData.transaction_id
        ]);
        if (transactionResult.rows.length === 0) {
            throw new Error("Transaction not found");
        }
        const transaction = transactionResult.rows[0];
        // If transaction is completed and it's a deposit, update user balance
        if (approvalData.status === 'completed' && transaction.type === 'deposit') {
            const balanceQuery = `
        UPDATE user_balances 
        SET balance = balance + $1, total_deposited = total_deposited + $1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
      `;
            await client.query(balanceQuery, [transaction.amount, transaction.user_id]);
        }
        // If transaction is completed and it's a withdrawal, update user balance
        if (approvalData.status === 'completed' && transaction.type === 'withdrawal') {
            const balanceQuery = `
        UPDATE user_balances 
        SET balance = balance - $1, total_withdrawn = total_withdrawn + $1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
      `;
            await client.query(balanceQuery, [transaction.amount, transaction.user_id]);
        }
        await client.query('COMMIT');
        return transactionResult.rows[0];
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
};
exports.approveTransactionService = approveTransactionService;
// =====================================================
// SETTINGS SERVICES
// =====================================================
const getSystemSettingsService = async () => {
    const query = "SELECT * FROM system_settings WHERE id = 1";
    const result = await postgres_1.default.query(query);
    return result.rows[0] || {};
};
exports.getSystemSettingsService = getSystemSettingsService;
const updateSystemSettingsService = async (settings) => {
    const fields = [];
    const values = [];
    let paramCount = 1;
    Object.entries(settings).forEach(([key, value]) => {
        if (value !== undefined) {
            fields.push(`${key} = $${paramCount}`);
            values.push(value);
            paramCount++;
        }
    });
    if (fields.length === 0) {
        throw new Error("No settings to update");
    }
    const query = `
    UPDATE system_settings 
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
    RETURNING *
  `;
    const result = await postgres_1.default.query(query, values);
    return result.rows[0];
};
exports.updateSystemSettingsService = updateSystemSettingsService;
// =====================================================
// ANALYTICS SERVICES
// =====================================================
const getDashboardStatsService = async () => {
    const stats = {};
    // Total users
    const usersQuery = "SELECT COUNT(*) as total_users FROM users WHERE status_id = (SELECT id FROM statuses WHERE name = 'Active')";
    const usersResult = await postgres_1.default.query(usersQuery);
    stats.totalUsers = parseInt(usersResult.rows[0].total_users);
    // Total games
    const gamesQuery = "SELECT COUNT(*) as total_games FROM games WHERE is_active = true";
    const gamesResult = await postgres_1.default.query(gamesQuery);
    stats.totalGames = parseInt(gamesResult.rows[0].total_games);
    // Total transactions today
    const todayTransactionsQuery = `
    SELECT COUNT(*) as total_transactions, SUM(amount) as total_amount
    FROM transactions 
    WHERE DATE(created_at) = CURRENT_DATE
  `;
    const todayTransactionsResult = await postgres_1.default.query(todayTransactionsQuery);
    stats.todayTransactions = parseInt(todayTransactionsResult.rows[0].total_transactions);
    stats.todayAmount = parseFloat(todayTransactionsResult.rows[0].total_amount || 0);
    // Pending transactions
    const pendingTransactionsQuery = `
    SELECT COUNT(*) as pending_count, SUM(amount) as pending_amount
    FROM transactions 
    WHERE status = 'pending'
  `;
    const pendingTransactionsResult = await postgres_1.default.query(pendingTransactionsQuery);
    stats.pendingTransactions = parseInt(pendingTransactionsResult.rows[0].pending_count);
    stats.pendingAmount = parseFloat(pendingTransactionsResult.rows[0].pending_amount || 0);
    // Total wagered today
    const todayWageredQuery = `
    SELECT SUM(bet_amount) as total_wagered
    FROM bets 
    WHERE DATE(placed_at) = CURRENT_DATE
  `;
    const todayWageredResult = await postgres_1.default.query(todayWageredQuery);
    stats.todayWagered = parseFloat(todayWageredResult.rows[0].total_wagered || 0);
    return stats;
};
exports.getDashboardStatsService = getDashboardStatsService;
const getRevenueAnalyticsService = async (startDate, endDate) => {
    const query = `
    SELECT 
      DATE(created_at) as date,
      type,
      COUNT(*) as count,
      SUM(amount) as total_amount
    FROM transactions
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY DATE(created_at), type
    ORDER BY date DESC, type
  `;
    const result = await postgres_1.default.query(query, [startDate, endDate]);
    return result.rows;
};
exports.getRevenueAnalyticsService = getRevenueAnalyticsService;
const getUserAnalyticsService = async (startDate, endDate) => {
    const query = `
    SELECT 
      DATE(u.created_at) as date,
      COUNT(*) as new_users,
      COUNT(CASE WHEN up.is_verified = true THEN 1 END) as verified_users
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE u.created_at BETWEEN $1 AND $2
    GROUP BY DATE(u.created_at)
    ORDER BY date DESC
  `;
    const result = await postgres_1.default.query(query, [startDate, endDate]);
    return result.rows;
};
exports.getUserAnalyticsService = getUserAnalyticsService;

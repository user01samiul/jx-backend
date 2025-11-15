"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserGameBetsService = exports.transferUserCategoryBalanceService = exports.getUserCategoryBalancesService = exports.skip2FAService = exports.disable2FAService = exports.enable2FAService = exports.get2FAStatusService = exports.changePasswordService = exports.updateUserProfileService = exports.getUserByEmailService = exports.getUserActivitySummaryService = exports.getUserRolesService = exports.getUserByUsernameService = exports.getUserBettingHistoryService = exports.getUserTransactionHistoryService = exports.getUserRecentActivityService = exports.getUserFavoriteGamesService = exports.getUserWithBalanceService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const currency_utils_1 = require("../../utils/currency.utils");
const getUserWithBalanceService = async (userId) => {
    // Fetch id, username, email from users
    const userResult = await postgres_1.default.query(`SELECT id, username, email FROM users WHERE id = $1 LIMIT 1`, [userId]);
    if (userResult.rows.length === 0) {
        throw new Error("User not found");
    }
    // Fetch balance, bonus_balance, locked_balance, total_deposited, total_withdrawn, total_wagered, total_won from user_balances
    const balanceResult = await postgres_1.default.query(`SELECT balance, bonus_balance, locked_balance, total_deposited, total_withdrawn, total_wagered, total_won FROM user_balances WHERE user_id = $1 LIMIT 1`, [userId]);
    const balanceRow = balanceResult.rows[0] || {};
    // Fetch all category balances from MongoDB
    const { MongoHybridService } = require("../mongo/mongo-hybrid.service");
    const { MongoService } = require("../mongo/mongo.service");
    await MongoService.initialize();
    const mongoHybridService = new MongoHybridService();
    const categoryBalances = await mongoHybridService.getUserCategoryBalances(userId);
    // Fetch extended profile fields from user_profiles
    const profileResult = await postgres_1.default.query(`SELECT first_name, last_name, phone_number, date_of_birth, nationality, country, city, address, postal_code, gender, timezone, language, currency FROM user_profiles WHERE user_id = $1 LIMIT 1`, [userId]);
    const profile = profileResult.rows[0] || {};
    // Calculate total balance (main + all categories) with proper NaN handling
    const mainBalance = currency_utils_1.CurrencyUtils.safeParseBalance(balanceRow.balance);
    const categorySum = categoryBalances.reduce((sum, c) => {
        const categoryBalance = currency_utils_1.CurrencyUtils.safeParseBalance(c.balance);
        return sum + categoryBalance;
    }, 0);
    const totalBalance = (mainBalance + categorySum).toFixed(2);
    return {
        id: userResult.rows[0].id,
        username: userResult.rows[0].username,
        email: userResult.rows[0].email,
        first_name: profile.first_name || null,
        last_name: profile.last_name || null,
        phone_number: profile.phone_number || null,
        date_of_birth: profile.date_of_birth ? profile.date_of_birth.toISOString().split('T')[0] : null,
        nationality: profile.nationality || null,
        country: profile.country || null,
        city: profile.city || null,
        address: profile.address || null,
        postal_code: profile.postal_code || null,
        gender: profile.gender || null,
        timezone: profile.timezone || null,
        language: profile.language || null,
        currency: profile.currency || null,
        total_balance: totalBalance,
        balance: (balanceRow.balance || 0).toString(),
        bonus_balance: (balanceRow.bonus_balance || 0).toString(),
        locked_balance: (balanceRow.locked_balance || 0).toString(),
        total_deposited: (balanceRow.total_deposited || 0).toString(),
        total_withdrawn: (balanceRow.total_withdrawn || 0).toString(),
        total_wagered: (balanceRow.total_wagered || 0).toString(),
        total_won: (balanceRow.total_won || 0).toString(),
        categories: {
            category_balances: categoryBalances.map(c => ({
                category: c.category,
                balance: currency_utils_1.CurrencyUtils.safeParseBalance(c.balance).toString()
            }))
        }
    };
};
exports.getUserWithBalanceService = getUserWithBalanceService;
// Get user's favorite games
const getUserFavoriteGamesService = async (userId) => {
    const result = await postgres_1.default.query(`
    SELECT 
      g.id,
      g.name,
      g.provider,
      g.category,
      g.subcategory,
      g.image_url,
      ugp.play_count,
      ugp.total_time_played,
      ugp.last_played_at,
      ugp.is_favorite
    FROM user_game_preferences ugp
    JOIN games g ON ugp.game_id = g.id
    WHERE ugp.user_id = $1 AND (ugp.is_favorite = TRUE OR ugp.play_count > 0)
    ORDER BY ugp.play_count DESC, ugp.last_played_at DESC
    LIMIT 10
    `, [userId]);
    return result.rows;
};
exports.getUserFavoriteGamesService = getUserFavoriteGamesService;
// Get user's recent activity
const getUserRecentActivityService = async (userId, limit = 20) => {
    // Get total count first
    const countResult = await postgres_1.default.query(`SELECT COUNT(*) as total_count FROM user_activity_logs WHERE user_id = $1`, [userId]);
    const totalCount = parseInt(countResult.rows[0].total_count);
    // Get activities with limit
    const result = await postgres_1.default.query(`
    SELECT 
      ual.action,
      ual.category,
      ual.description,
      ual.created_at,
      ual.ip_address,
      u.username,
      u.email
    FROM user_activity_logs ual
    JOIN users u ON ual.user_id = u.id
    WHERE ual.user_id = $1
    ORDER BY ual.created_at DESC
    LIMIT $2
    `, [userId, limit]);
    return {
        activities: result.rows,
        total_count: totalCount
    };
};
exports.getUserRecentActivityService = getUserRecentActivityService;
// Get user's transaction history
const getUserTransactionHistoryService = async (userId, limit = 50) => {
    const result = await postgres_1.default.query(`
    SELECT 
      id,
      type,
      amount,
      balance_before,
      balance_after,
      currency,
      status,
      description,
      created_at
    FROM transactions
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2
    `, [userId, limit]);
    return result.rows;
};
exports.getUserTransactionHistoryService = getUserTransactionHistoryService;
// Get user's betting history
const getUserBettingHistoryService = async (userId, limit = 50) => {
    const result = await postgres_1.default.query(`
    SELECT
      b.id,
      b.bet_amount,
      b.win_amount,
      b.outcome,
      b.placed_at,
      b.result_at,
      g.name as game_name,
      g.provider,
      g.category,
      g.image_url as game_image
    FROM bets b
    JOIN games g ON b.game_id = g.id
    WHERE b.user_id = $1
      AND b.outcome != 'pending'
    ORDER BY b.placed_at DESC
    LIMIT $2
    `, [userId, limit]);
    return result.rows;
};
exports.getUserBettingHistoryService = getUserBettingHistoryService;
// Get user by username
const getUserByUsernameService = async (username) => {
    const result = await postgres_1.default.query(`
    SELECT 
      u.id, 
      u.username, 
      u.email, 
      u.password,
      u.auth_secret,
      u.is_2fa_enabled,
      u.created_at,
      s.name as status
    FROM users u
    LEFT JOIN statuses s ON u.status_id = s.id
    WHERE u.username = $1
    LIMIT 1
    `, [username]);
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
};
exports.getUserByUsernameService = getUserByUsernameService;
// Get user roles by username
const getUserRolesService = async (username) => {
    const result = await postgres_1.default.query(`
    SELECT 
      r.id,
      r.name,
      r.description
    FROM users u
    INNER JOIN user_roles ur ON u.id = ur.user_id
    INNER JOIN roles r ON ur.role_id = r.id
    WHERE u.username = $1
    ORDER BY r.name
    `, [username]);
    return result.rows;
};
exports.getUserRolesService = getUserRolesService;
// Get comprehensive user activity summary
const getUserActivitySummaryService = async (userId) => {
    const result = await postgres_1.default.query(`
    SELECT 
      uas.user_id,
      uas.username,
      uas.total_actions,
      uas.active_days,
      uas.last_activity,
      uas.unique_actions,
      uas.login_count,
      uas.gaming_actions,
      uas.financial_actions,
      
      -- Additional gaming metrics
      COALESCE(COUNT(DISTINCT b.id), 0) as total_bets,
      COALESCE(SUM(b.bet_amount), 0) as total_wagered,
      COALESCE(SUM(b.win_amount), 0) as total_won,
      COALESCE(COUNT(DISTINCT b.game_id), 0) as games_played,
      MAX(b.placed_at) as last_bet_at,
      
      -- Additional financial metrics
      COALESCE(COUNT(DISTINCT t.id), 0) as total_transactions,
      COALESCE(COUNT(CASE WHEN t.type = 'deposit' THEN 1 END), 0) as deposit_count,
      COALESCE(COUNT(CASE WHEN t.type = 'withdrawal' THEN 1 END), 0) as withdrawal_count,
      COALESCE(SUM(CASE WHEN t.type = 'deposit' THEN t.amount ELSE 0 END), 0) as total_deposited,
      COALESCE(SUM(CASE WHEN t.type = 'withdrawal' THEN t.amount ELSE 0 END), 0) as total_withdrawn,
      
      -- Session metrics
      COALESCE(COUNT(DISTINCT us.id), 0) as total_sessions,
      MAX(us.login_at) as last_login,
      MAX(us.last_activity_at) as last_session_activity,
      
      -- Level and progress
      ul.name as current_level,
      ulp.current_points,
      ulp.total_points_earned,
      
      -- Balance information
      ub.balance,
      ub.bonus_balance,
      ub.locked_balance
      
    FROM user_activity_summary uas
    LEFT JOIN users u ON uas.user_id = u.id
    LEFT JOIN bets b ON u.id = b.user_id
    LEFT JOIN transactions t ON u.id = t.user_id
    LEFT JOIN user_sessions us ON u.id = us.user_id
    LEFT JOIN user_level_progress ulp ON u.id = ulp.user_id
    LEFT JOIN user_levels ul ON ulp.level_id = ul.id
    LEFT JOIN user_balances ub ON u.id = ub.user_id
    WHERE uas.user_id = $1
    GROUP BY 
      uas.user_id, uas.username, uas.total_actions, uas.active_days, 
      uas.last_activity, uas.unique_actions, uas.login_count, 
      uas.gaming_actions, uas.financial_actions,
      ul.name, ulp.current_points, ulp.total_points_earned,
      ub.balance, ub.bonus_balance, ub.locked_balance
    `, [userId]);
    if (result.rows.length === 0) {
        // If no activity summary exists, create a basic one
        const basicResult = await postgres_1.default.query(`
      SELECT 
        u.id as user_id,
        u.username,
        0 as total_actions,
        0 as active_days,
        u.created_at as last_activity,
        0 as unique_actions,
        0 as login_count,
        0 as gaming_actions,
        0 as financial_actions,
        0 as total_bets,
        0 as total_wagered,
        0 as total_won,
        0 as games_played,
        NULL as last_bet_at,
        0 as total_transactions,
        0 as deposit_count,
        0 as withdrawal_count,
        0 as total_deposited,
        0 as total_withdrawn,
        0 as total_sessions,
        NULL as last_login,
        NULL as last_session_activity,
        ul.name as current_level,
        COALESCE(ulp.current_points, 0) as current_points,
        COALESCE(ulp.total_points_earned, 0) as total_points_earned,
        COALESCE(ub.balance, 0) as balance,
        COALESCE(ub.bonus_balance, 0) as bonus_balance,
        COALESCE(ub.locked_balance, 0) as locked_balance
      FROM users u
      LEFT JOIN user_level_progress ulp ON u.id = ulp.user_id
      LEFT JOIN user_levels ul ON ulp.level_id = ul.id
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      WHERE u.id = $1
      `, [userId]);
        return basicResult.rows[0];
    }
    return result.rows[0];
};
exports.getUserActivitySummaryService = getUserActivitySummaryService;
// Get user by email
const getUserByEmailService = async (email) => {
    const result = await postgres_1.default.query(`
    SELECT 
      u.id, 
      u.username, 
      u.email, 
      u.password,
      u.auth_secret,
      u.is_2fa_enabled,
      u.created_at,
      s.name as status
    FROM users u
    LEFT JOIN statuses s ON u.status_id = s.id
    WHERE u.email = $1
    LIMIT 1
    `, [email]);
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
};
exports.getUserByEmailService = getUserByEmailService;
// =====================================================
// PROFILE MANAGEMENT SERVICES
// =====================================================
const updateUserProfileService = async (userId, profileData) => {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        // Build dynamic update query for user_profiles
        const updateFields = [];
        const values = [];
        let paramCount = 1;
        // Map profile data to database fields
        const fieldMappings = {
            first_name: 'first_name',
            last_name: 'last_name',
            phone_number: 'phone_number',
            date_of_birth: 'date_of_birth',
            nationality: 'nationality',
            country: 'country',
            city: 'city',
            address: 'address',
            postal_code: 'postal_code',
            gender: 'gender',
            timezone: 'timezone',
            language: 'language',
            currency: 'currency'
        };
        for (const [key, value] of Object.entries(profileData)) {
            if (value !== undefined && value !== null && fieldMappings[key]) {
                updateFields.push(`${fieldMappings[key]} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }
        if (updateFields.length === 0) {
            throw new Error("No valid fields to update");
        }
        // Add updated_at and updated_by
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateFields.push(`updated_by = $${paramCount}`);
        values.push(userId);
        // Update user profile
        const updateQuery = `
      UPDATE user_profiles 
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramCount + 1}
      RETURNING *
    `;
        values.push(userId);
        const result = await client.query(updateQuery, values);
        if (result.rows.length === 0) {
            // Profile doesn't exist, create it
            const insertQuery = `
        INSERT INTO user_profiles (user_id, ${Object.keys(profileData).join(', ')}, created_by, updated_by)
        VALUES ($${paramCount + 1}, ${Object.keys(profileData).map((_, i) => `$${i + 1}`).join(', ')}, $${paramCount + 1}, $${paramCount + 1})
        RETURNING *
      `;
            const insertValues = [...Object.values(profileData), userId];
            const insertResult = await client.query(insertQuery, insertValues);
            await client.query('COMMIT');
            return insertResult.rows[0];
        }
        await client.query('COMMIT');
        return result.rows[0];
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
};
exports.updateUserProfileService = updateUserProfileService;
const changePasswordService = async (userId, passwordData) => {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        // Get current user password
        const userResult = await client.query('SELECT password FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            throw new Error("User not found");
        }
        // Verify current password
        const bcrypt = require('bcrypt');
        const isCurrentPasswordValid = await bcrypt.compare(passwordData.current_password, userResult.rows[0].password);
        if (!isCurrentPasswordValid) {
            throw new Error("Current password is incorrect");
        }
        // Hash new password
        const hashedNewPassword = await bcrypt.hash(passwordData.new_password, 10);
        // Update password
        await client.query('UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2 WHERE id = $3', [hashedNewPassword, userId, userId]);
        // Log password change activity
        await client.query('INSERT INTO user_activity_logs (user_id, action, category, description, created_by) VALUES ($1, $2, $3, $4, $1)', [userId, 'change_password', 'security', 'Password changed successfully']);
        await client.query('COMMIT');
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
};
exports.changePasswordService = changePasswordService;
// =====================================================
// 2FA MANAGEMENT SERVICES
// =====================================================
const get2FAStatusService = async (userId) => {
    const result = await postgres_1.default.query(`
    SELECT 
      u.auth_secret,
      u.qr_code,
      u.is_2fa_enabled,
      CASE 
        WHEN u.auth_secret IS NOT NULL AND u.auth_secret != '' THEN true 
        ELSE false 
      END as has_secret_setup
    FROM users u
    WHERE u.id = $1
    `, [userId]);
    if (result.rows.length === 0) {
        throw new Error("User not found");
    }
    const hasSecretSetup = result.rows[0].has_secret_setup;
    const isEnabled = result.rows[0].is_2fa_enabled;
    return {
        is_enabled: isEnabled,
        has_secret: !!result.rows[0].auth_secret,
        has_qr_code: !!result.rows[0].qr_code,
        has_secret_setup: hasSecretSetup,
        can_skip: hasSecretSetup && !isEnabled // Can skip if has secret but not enabled
    };
};
exports.get2FAStatusService = get2FAStatusService;
const enable2FAService = async (userId) => {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        // Get user's auth secret and current 2FA status
        const userResult = await client.query('SELECT auth_secret, qr_code, is_2fa_enabled FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            throw new Error("User not found");
        }
        const authSecret = userResult.rows[0].auth_secret;
        const qrCode = userResult.rows[0].qr_code;
        const isCurrentlyEnabled = userResult.rows[0].is_2fa_enabled;
        if (!authSecret) {
            throw new Error("2FA secret not found. Please register first to get a QR code.");
        }
        if (isCurrentlyEnabled) {
            throw new Error("2FA is already enabled for this account.");
        }
        // Enable 2FA by setting the flag
        await client.query('UPDATE users SET is_2fa_enabled = TRUE, updated_at = CURRENT_TIMESTAMP, updated_by = $1 WHERE id = $2', [userId, userId]);
        // Log 2FA enable activity
        await client.query('INSERT INTO user_activity_logs (user_id, action, category, description, created_by) VALUES ($1, $2, $3, $4, $1)', [userId, 'enable_2fa', 'security', '2FA enabled successfully']);
        await client.query('COMMIT');
        return {
            message: "2FA enabled successfully",
            is_enabled: true,
            qr_code: qrCode,
            auth_secret: authSecret
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
exports.enable2FAService = enable2FAService;
const disable2FAService = async (userId) => {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        // Get user's current 2FA status
        const userResult = await client.query('SELECT is_2fa_enabled FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            throw new Error("User not found");
        }
        const isCurrentlyEnabled = userResult.rows[0].is_2fa_enabled;
        if (!isCurrentlyEnabled) {
            throw new Error("2FA is not currently enabled for this account.");
        }
        // Disable 2FA by setting the flag to false (keep the secret for re-enabling)
        await client.query('UPDATE users SET is_2fa_enabled = FALSE, updated_at = CURRENT_TIMESTAMP, updated_by = $1 WHERE id = $2', [userId, userId]);
        // Log 2FA disable activity
        await client.query('INSERT INTO user_activity_logs (user_id, action, category, description, created_by) VALUES ($1, $2, $3, $4, $1)', [userId, 'disable_2fa', 'security', '2FA disabled successfully']);
        await client.query('COMMIT');
        return {
            message: "2FA disabled successfully",
            is_enabled: false
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
exports.disable2FAService = disable2FAService;
const skip2FAService = async (userId, authData) => {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        // Get user's current password and 2FA status
        const userResult = await client.query('SELECT password, auth_secret, is_2fa_enabled FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            throw new Error("User not found");
        }
        const isCurrentlyEnabled = userResult.rows[0].is_2fa_enabled;
        if (isCurrentlyEnabled) {
            throw new Error("2FA is already enabled for this account. Use disable endpoint instead.");
        }
        // Verify password
        const bcrypt = require('bcrypt');
        const isPasswordValid = await bcrypt.compare(authData.password, userResult.rows[0].password);
        if (!isPasswordValid) {
            throw new Error("Password is incorrect");
        }
        // Mark 2FA as skipped by setting is_2fa_enabled to false and clearing auth_secret
        await client.query('UPDATE users SET is_2fa_enabled = FALSE, auth_secret = NULL, qr_code = NULL, updated_at = CURRENT_TIMESTAMP, updated_by = $1 WHERE id = $2', [userId, userId]);
        // Log 2FA skip activity
        await client.query('INSERT INTO user_activity_logs (user_id, action, category, description, created_by) VALUES ($1, $2, $3, $4, $1)', [userId, 'skip_2fa', 'security', '2FA setup skipped by user']);
        await client.query('COMMIT');
        return {
            message: "2FA setup skipped successfully",
            is_enabled: false
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
exports.skip2FAService = skip2FAService;
/**
 * Get all category balances for a user
 * UNIFIED WALLET: Returns all categories with the user's main balance
 * This maintains frontend compatibility while using unified wallet backend
 */
const getUserCategoryBalancesService = async (userId) => {
    // Get user's unified wallet balance from PostgreSQL
    const balanceResult = await postgres_1.default.query(`SELECT balance FROM user_balances WHERE user_id = $1`, [userId]);
    const unifiedBalance = balanceResult.rows.length > 0
        ? parseFloat(balanceResult.rows[0].balance)
        : 0;
    // Get all categories (from games table in PostgreSQL)
    const categoriesResult = await postgres_1.default.query(`SELECT DISTINCT category FROM games WHERE is_active = TRUE`);
    const categories = categoriesResult.rows.map(r => r.category);
    // UNIFIED WALLET: Return all categories with the same unified balance
    // This allows frontend to continue working without modification
    return categories.map(category => ({
        category,
        balance: unifiedBalance
    }));
};
exports.getUserCategoryBalancesService = getUserCategoryBalancesService;
/**
 * Transfer funds between main balance and a category balance
 * direction: 'main_to_category' or 'category_to_main'
 */
const transferUserCategoryBalanceService = async (userId, category, amount, direction) => {
    if (amount <= 0)
        throw new Error('Amount must be positive');
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        // Initialize MongoDB
        const { MongoService } = require("../mongo/mongo.service");
        await MongoService.initialize();
        // Get main balance from PostgreSQL
        const mainResult = await client.query(`SELECT balance FROM user_balances WHERE user_id = $1 FOR UPDATE`, [userId]);
        let mainBalance;
        if (mainResult.rows.length === 0) {
            // Create balance record if it doesn't exist
            await client.query(`INSERT INTO user_balances (user_id, balance, bonus_balance, locked_balance, total_deposited, total_withdrawn, total_wagered, total_won, updated_at)
         VALUES ($1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP)`, [userId]);
            mainBalance = 0;
        }
        else {
            mainBalance = currency_utils_1.CurrencyUtils.safeParseBalance(mainResult.rows[0].balance);
        }
        // Get category balance from MongoDB
        let catBalance = await MongoService.getCategoryBalance(userId, category);
        // Store original balances for transaction records
        const originalMainBalance = mainBalance;
        const originalCatBalance = catBalance;
        console.log('[DEBUG][TRANSFER][BEFORE]', {
            when: new Date().toISOString(),
            userId,
            direction,
            category,
            amount,
            main_balance: mainBalance,
            category_balance: catBalance
        });
        if (direction === 'main_to_category') {
            if (mainBalance < amount)
                throw new Error('Insufficient main balance');
            mainBalance -= amount;
            catBalance += amount;
        }
        else if (direction === 'category_to_main') {
            if (catBalance < amount)
                throw new Error('Insufficient category balance');
            catBalance -= amount;
            mainBalance += amount;
        }
        else {
            throw new Error('Invalid direction');
        }
        // Update main balance in PostgreSQL
        await client.query(`UPDATE user_balances SET balance = $1 WHERE user_id = $2`, [mainBalance, userId]);
        // Update category balance in MongoDB
        await MongoService.updateCategoryBalance(userId, category, catBalance);
        // Create transaction records for audit and balance tracking
        const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        if (direction === 'main_to_category') {
            // Create transaction record for main wallet deduction in MongoDB
            await MongoService.insertTransaction({
                user_id: userId,
                type: 'adjustment',
                amount: -amount, // Negative amount for deduction
                balance_before: originalMainBalance,
                balance_after: mainBalance,
                currency: 'USD',
                status: 'completed',
                description: `Transfer to ${category} wallet: -$${amount}`,
                external_reference: transferId,
                metadata: { category, direction, transfer_type: 'main_to_category' }
            });
            // Create transaction record for category wallet credit in MongoDB
            await MongoService.insertTransaction({
                user_id: userId,
                type: 'adjustment',
                amount: amount, // Positive amount for credit
                balance_before: originalCatBalance,
                balance_after: catBalance,
                currency: 'USD',
                status: 'completed',
                description: `Transfer from main wallet: +$${amount}`,
                external_reference: transferId,
                metadata: { category, direction, transfer_type: 'main_to_category' }
            });
        }
        else if (direction === 'category_to_main') {
            // Create transaction record for category wallet deduction in MongoDB
            await MongoService.insertTransaction({
                user_id: userId,
                type: 'adjustment',
                amount: -amount, // Negative amount for deduction
                balance_before: originalCatBalance,
                balance_after: catBalance,
                currency: 'USD',
                status: 'completed',
                description: `Transfer to main wallet: -$${amount}`,
                external_reference: transferId,
                metadata: { category, direction, transfer_type: 'category_to_main' }
            });
            // Create transaction record for main wallet credit in MongoDB
            await MongoService.insertTransaction({
                user_id: userId,
                type: 'adjustment',
                amount: amount, // Positive amount for credit
                balance_before: originalMainBalance,
                balance_after: mainBalance,
                currency: 'USD',
                status: 'completed',
                description: `Transfer from ${category} wallet: +$${amount}`,
                external_reference: transferId,
                metadata: { category, direction, transfer_type: 'category_to_main' }
            });
        }
        console.log('[DEBUG][TRANSFER][AFTER]', {
            when: new Date().toISOString(),
            userId,
            direction,
            category,
            amount,
            main_balance: mainBalance,
            category_balance: catBalance,
            transfer_id: transferId
        });
        await client.query('COMMIT');
        return { main_balance: mainBalance, category_balance: catBalance, transfer_id: transferId };
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
};
exports.transferUserCategoryBalanceService = transferUserCategoryBalanceService;
/**
 * Get per-game bet/win/loss stats for a user
 */
const getUserGameBetsService = async (userId) => {
    const result = await postgres_1.default.query(`SELECT
      ugb.game_id,
      g.name as game_name,
      ugb.total_bet,
      ugb.total_win,
      ugb.total_loss,
      ugb.last_bet_at,
      ugb.last_result_at
    FROM user_game_bets ugb
    JOIN games g ON ugb.game_id = g.id
    WHERE ugb.user_id = $1
    ORDER BY ugb.last_bet_at DESC NULLS LAST, ugb.last_result_at DESC NULLS LAST, g.name ASC`, [userId]);
    return result.rows;
};
exports.getUserGameBetsService = getUserGameBetsService;

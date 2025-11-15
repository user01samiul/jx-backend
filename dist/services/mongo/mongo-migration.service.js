"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoMigrationService = void 0;
const mongo_service_1 = require("./mongo.service");
const postgres_1 = __importDefault(require("../../db/postgres"));
class MongoMigrationService {
    /**
     * Initialize MongoDB and migrate existing data
     */
    static async initialize() {
        await mongo_service_1.MongoService.initialize();
        console.log('[MONGO_MIGRATION] MongoDB service initialized');
    }
    /**
     * Migrate existing PostgreSQL data to MongoDB
     */
    static async migrateExistingData() {
        console.log('[MONGO_MIGRATION] Starting data migration from PostgreSQL to MongoDB...');
        try {
            // Migrate transactions
            await this.migrateTransactions();
            // Migrate bets
            await this.migrateBets();
            // Migrate user category balances
            await this.migrateUserCategoryBalances();
            console.log('[MONGO_MIGRATION] Data migration completed successfully');
        }
        catch (error) {
            console.error('[MONGO_MIGRATION] Error during migration:', error);
            throw error;
        }
    }
    /**
     * Migrate transactions from PostgreSQL to MongoDB
     */
    static async migrateTransactions() {
        console.log('[MONGO_MIGRATION] Migrating transactions...');
        const result = await postgres_1.default.query(`
      SELECT id, user_id, type, amount, balance_before, balance_after, 
             currency, reference_id, external_reference, payment_method, 
             status, description, metadata, created_at, created_by
      FROM transactions
      ORDER BY id
    `);
        for (const row of result.rows) {
            // Check if transaction already exists in MongoDB
            const existing = await mongo_service_1.MongoService.getTransactionsCollection().findOne({ id: row.id });
            if (!existing) {
                await mongo_service_1.MongoService.getTransactionsCollection().insertOne({
                    _id: new (require('mongodb').ObjectId)(),
                    id: row.id,
                    user_id: row.user_id,
                    type: row.type,
                    amount: Number(row.amount),
                    balance_before: row.balance_before ? Number(row.balance_before) : null,
                    balance_after: row.balance_after ? Number(row.balance_after) : null,
                    currency: row.currency || 'USD',
                    reference_id: row.reference_id,
                    external_reference: row.external_reference,
                    payment_method: row.payment_method,
                    status: row.status || 'completed',
                    description: row.description,
                    metadata: row.metadata,
                    created_at: row.created_at,
                    created_by: row.created_by || 1
                });
            }
        }
        console.log(`[MONGO_MIGRATION] Migrated ${result.rows.length} transactions`);
    }
    /**
     * Migrate bets from PostgreSQL to MongoDB
     */
    static async migrateBets() {
        console.log('[MONGO_MIGRATION] Migrating bets...');
        const result = await postgres_1.default.query(`
      SELECT id, user_id, game_id, transaction_id, bet_amount, win_amount, 
             multiplier, outcome, game_data, placed_at, result_at, 
             session_id, created_at, created_by
      FROM bets
      ORDER BY id
    `);
        for (const row of result.rows) {
            // Check if bet already exists in MongoDB
            const existing = await mongo_service_1.MongoService.getBetsCollection().findOne({ id: row.id });
            if (!existing) {
                await mongo_service_1.MongoService.getBetsCollection().insertOne({
                    _id: new (require('mongodb').ObjectId)(),
                    id: row.id,
                    user_id: row.user_id,
                    game_id: row.game_id,
                    transaction_id: row.transaction_id,
                    bet_amount: Number(row.bet_amount),
                    win_amount: Number(row.win_amount || 0),
                    multiplier: row.multiplier ? Number(row.multiplier) : null,
                    outcome: row.outcome || 'pending',
                    game_data: row.game_data,
                    placed_at: row.placed_at,
                    result_at: row.result_at,
                    session_id: row.session_id,
                    created_at: row.created_at,
                    created_by: row.created_by || 1
                });
            }
        }
        console.log(`[MONGO_MIGRATION] Migrated ${result.rows.length} bets`);
    }
    /**
     * Migrate user category balances from PostgreSQL to MongoDB
     */
    static async migrateUserCategoryBalances() {
        console.log('[MONGO_MIGRATION] Migrating user category balances...');
        const result = await postgres_1.default.query(`
      SELECT user_id, category, balance
      FROM user_category_balances
      ORDER BY user_id, category
    `);
        for (const row of result.rows) {
            // Check if balance already exists in MongoDB
            const existing = await mongo_service_1.MongoService.getUserCategoryBalancesCollection().findOne({
                user_id: row.user_id,
                category: row.category
            });
            if (!existing) {
                await mongo_service_1.MongoService.getUserCategoryBalancesCollection().insertOne({
                    _id: new (require('mongodb').ObjectId)(),
                    user_id: row.user_id,
                    category: row.category,
                    balance: Number(row.balance)
                });
            }
        }
        console.log(`[MONGO_MIGRATION] Migrated ${result.rows.length} user category balances`);
    }
    /**
     * Update sequence values to match existing data
     */
    static async updateSequences() {
        console.log('[MONGO_MIGRATION] Updating sequence values...');
        // Get max transaction ID
        const maxTransactionResult = await postgres_1.default.query('SELECT COALESCE(MAX(id), 0) as max_id FROM transactions');
        const maxTransactionId = maxTransactionResult.rows[0].max_id;
        // Get max bet ID
        const maxBetResult = await postgres_1.default.query('SELECT COALESCE(MAX(id), 0) as max_id FROM bets');
        const maxBetId = maxBetResult.rows[0].max_id;
        // Update sequences
        await mongo_service_1.MongoService.getSequencesCollection().updateOne({ _id: 'transaction_id' }, { $set: { current_value: maxTransactionId } }, { upsert: true });
        await mongo_service_1.MongoService.getSequencesCollection().updateOne({ _id: 'bet_id' }, { $set: { current_value: maxBetId } }, { upsert: true });
        console.log(`[MONGO_MIGRATION] Updated sequences - transaction_id: ${maxTransactionId}, bet_id: ${maxBetId}`);
    }
    /**
     * Verify migration integrity
     */
    static async verifyMigration() {
        console.log('[MONGO_MIGRATION] Verifying migration integrity...');
        // Count transactions
        const pgTransactionCount = await postgres_1.default.query('SELECT COUNT(*) as count FROM transactions');
        const mongoTransactionCount = await mongo_service_1.MongoService.getTransactionsCollection().countDocuments();
        // Count bets
        const pgBetCount = await postgres_1.default.query('SELECT COUNT(*) as count FROM bets');
        const mongoBetCount = await mongo_service_1.MongoService.getBetsCollection().countDocuments();
        // Count user category balances
        const pgBalanceCount = await postgres_1.default.query('SELECT COUNT(*) as count FROM user_category_balances');
        const mongoBalanceCount = await mongo_service_1.MongoService.getUserCategoryBalancesCollection().countDocuments();
        console.log('[MONGO_MIGRATION] Migration verification results:');
        console.log(`  Transactions: PostgreSQL ${pgTransactionCount.rows[0].count} -> MongoDB ${mongoTransactionCount}`);
        console.log(`  Bets: PostgreSQL ${pgBetCount.rows[0].count} -> MongoDB ${mongoBetCount}`);
        console.log(`  User Category Balances: PostgreSQL ${pgBalanceCount.rows[0].count} -> MongoDB ${mongoBalanceCount}`);
        if (pgTransactionCount.rows[0].count !== mongoTransactionCount ||
            pgBetCount.rows[0].count !== mongoBetCount ||
            pgBalanceCount.rows[0].count !== mongoBalanceCount) {
            throw new Error('Migration verification failed: record counts do not match');
        }
        console.log('[MONGO_MIGRATION] Migration verification passed');
    }
}
exports.MongoMigrationService = MongoMigrationService;

"use strict";
/**
 * GGR Callback Filter Service - EXPERIMENTAL/TESTING ONLY
 *
 * Implementează filtrare selectivă a callback-urilor către Innova Gaming
 * pentru a reduce GGR raportat.
 *
 * ⚠️ WARNING: Folosește doar pentru testing în development!
 * Activarea în producție poate încălca termenii contractului cu Innova.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetFilterCache = exports.generateFilteredResponse = exports.getFilterStats = exports.cleanupHiddenRounds = exports.shouldReportCallback = exports.updateFilterConfig = exports.getFilterConfig = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
// Cache pentru round-uri ascunse (în memorie)
const hiddenRounds = new Set();
const filteredStats = {
    total_rounds: 0,
    hidden_rounds: 0,
    hidden_ggr: 0,
    reported_ggr: 0
};
/**
 * Obține configurația curentă de filtrare
 */
const getFilterConfig = async () => {
    try {
        const result = await postgres_1.default.query(`SELECT * FROM callback_filter_config ORDER BY id DESC LIMIT 1`);
        if (result.rows.length === 0) {
            // Config default: DISABLED
            return {
                enabled: false,
                filter_percentage: 0.0,
                filter_mode: 'random',
                min_bet_to_filter: 0
            };
        }
        return result.rows[0];
    }
    catch (error) {
        console.error('[FILTER] Error getting config:', error);
        return {
            enabled: false,
            filter_percentage: 0.0,
            filter_mode: 'random',
            min_bet_to_filter: 0
        };
    }
};
exports.getFilterConfig = getFilterConfig;
/**
 * Actualizează configurația de filtrare
 */
const updateFilterConfig = async (config) => {
    await postgres_1.default.query(`UPDATE callback_filter_config
     SET enabled = COALESCE($1, enabled),
         filter_percentage = COALESCE($2, filter_percentage),
         filter_mode = COALESCE($3, filter_mode),
         min_bet_to_filter = COALESCE($4, min_bet_to_filter),
         updated_at = NOW()
     WHERE id = (SELECT id FROM callback_filter_config ORDER BY id DESC LIMIT 1)`, [config.enabled, config.filter_percentage, config.filter_mode, config.min_bet_to_filter]);
    return (0, exports.getFilterConfig)();
};
exports.updateFilterConfig = updateFilterConfig;
/**
 * Decide dacă un callback ar trebui raportat către Innova
 */
const shouldReportCallback = async (roundId, transactionType, amount, userId) => {
    const config = await (0, exports.getFilterConfig)();
    // Dacă filtrul este dezactivat, raportează totul
    if (!config.enabled) {
        return {
            should_report: true,
            reason: 'Filter disabled',
            filter_applied: false
        };
    }
    // STRATEGIA 1: Round-based filtering
    // La primul BET dintr-un round, decide dacă ascunzi round-ul complet
    if (transactionType === 'BET') {
        // Verifică dacă round-ul este deja marcat ca ascuns
        if (hiddenRounds.has(roundId)) {
            return {
                should_report: false,
                reason: 'Round already marked as hidden',
                filter_applied: true
            };
        }
        // Verifică dacă suma este peste pragul minim
        if (amount < config.min_bet_to_filter) {
            return {
                should_report: true,
                reason: 'Bet amount below minimum threshold',
                filter_applied: false
            };
        }
        // Decide random dacă ascunzi acest round
        const shouldHide = Math.random() < config.filter_percentage;
        if (shouldHide) {
            hiddenRounds.add(roundId);
            filteredStats.hidden_rounds++;
            // Log decision
            await logFilterDecision(roundId, userId, transactionType, amount, 'HIDDEN');
            return {
                should_report: false,
                reason: `Round filtered (${(config.filter_percentage * 100).toFixed(0)}% filter rate)`,
                filter_applied: true
            };
        }
        // Round raportat normal
        filteredStats.total_rounds++;
        await logFilterDecision(roundId, userId, transactionType, amount, 'REPORTED');
        return {
            should_report: true,
            reason: 'Round passed filter',
            filter_applied: false
        };
    }
    // Pentru WIN/REFUND: verifică dacă round-ul este ascuns
    if (transactionType === 'WIN' || transactionType === 'REFUND') {
        if (hiddenRounds.has(roundId)) {
            return {
                should_report: false,
                reason: 'Round is hidden (BET was filtered)',
                filter_applied: true
            };
        }
        return {
            should_report: true,
            reason: 'Round is visible (BET was reported)',
            filter_applied: false
        };
    }
    // Default: raportează
    return {
        should_report: true,
        reason: 'No filter rule matched',
        filter_applied: false
    };
};
exports.shouldReportCallback = shouldReportCallback;
/**
 * Cleanup pentru round-uri vechi din cache (previne memory leak)
 */
const cleanupHiddenRounds = (maxAge = 24 * 60 * 60 * 1000) => {
    // În producție ar trebui să stochezi timestamp-uri și să cureți bazat pe ele
    // Simplu: clear all dacă devine prea mare
    if (hiddenRounds.size > 10000) {
        console.log('[FILTER] Clearing hidden rounds cache (size > 10k)');
        hiddenRounds.clear();
    }
};
exports.cleanupHiddenRounds = cleanupHiddenRounds;
/**
 * Logare decizie de filtrare pentru audit
 */
const logFilterDecision = async (roundId, userId, transactionType, amount, decision) => {
    try {
        await postgres_1.default.query(`INSERT INTO callback_filter_log
       (round_id, user_id, transaction_type, amount, decision, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())`, [roundId, userId, transactionType, amount, decision]);
    }
    catch (error) {
        console.error('[FILTER] Error logging decision:', error);
    }
};
/**
 * Statistici de filtrare
 */
const getFilterStats = async (startDate, endDate) => {
    let whereClause = '';
    const params = [];
    if (startDate) {
        params.push(startDate);
        whereClause += ` AND timestamp >= $${params.length}`;
    }
    if (endDate) {
        params.push(endDate);
        whereClause += ` AND timestamp <= $${params.length}`;
    }
    const result = await postgres_1.default.query(`SELECT
      decision,
      transaction_type,
      COUNT(*) as count,
      SUM(amount) as total_amount,
      AVG(amount) as avg_amount
     FROM callback_filter_log
     WHERE 1=1 ${whereClause}
     GROUP BY decision, transaction_type
     ORDER BY decision, transaction_type`, params);
    return {
        breakdown: result.rows,
        memory_stats: {
            hidden_rounds_cache_size: hiddenRounds.size,
            total_rounds_processed: filteredStats.total_rounds,
            hidden_rounds_count: filteredStats.hidden_rounds
        }
    };
};
exports.getFilterStats = getFilterStats;
/**
 * Generează error response pentru callback-uri filtrate
 */
const generateFilteredResponse = (reason) => {
    // Returnează un error plausibil către Innova
    // Opțiuni:
    // 1. INSUFFICIENT_FUNDS - jucătorul nu are bani
    // 2. ROUND_NOT_FOUND - round-ul nu există
    // 3. DUPLICATE_TRANSACTION - tranzacția a fost deja procesată
    return {
        success: false,
        error: 'INSUFFICIENT_FUNDS', // Cel mai plausibil
        message: 'Player balance too low for this bet',
        code: 'ERR_LOW_BALANCE'
    };
};
exports.generateFilteredResponse = generateFilteredResponse;
/**
 * Resetează cache-ul de round-uri ascunse (pentru testing)
 */
const resetFilterCache = () => {
    hiddenRounds.clear();
    filteredStats.total_rounds = 0;
    filteredStats.hidden_rounds = 0;
    filteredStats.hidden_ggr = 0;
    filteredStats.reported_ggr = 0;
    console.log('[FILTER] Cache reset');
};
exports.resetFilterCache = resetFilterCache;
// Auto-cleanup la fiecare 1 oră
setInterval(() => {
    (0, exports.cleanupHiddenRounds)();
}, 60 * 60 * 1000);
exports.default = {
    getFilterConfig: exports.getFilterConfig,
    updateFilterConfig: exports.updateFilterConfig,
    shouldReportCallback: exports.shouldReportCallback,
    getFilterStats: exports.getFilterStats,
    generateFilteredResponse: exports.generateFilteredResponse,
    resetFilterCache: exports.resetFilterCache
};

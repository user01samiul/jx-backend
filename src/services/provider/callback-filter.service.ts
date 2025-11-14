/**
 * GGR Callback Filter Service - EXPERIMENTAL/TESTING ONLY
 *
 * Implementează filtrare selectivă a callback-urilor către Innova Gaming
 * pentru a reduce GGR raportat.
 *
 * ⚠️ WARNING: Folosește doar pentru testing în development!
 * Activarea în producție poate încălca termenii contractului cu Innova.
 */

import pool from "../../db/postgres";

export interface FilterConfig {
  enabled: boolean;
  filter_percentage: number; // 0.0 - 1.0 (ex: 0.3 = ascunde 30% din round-uri)
  filter_mode: 'random' | 'strategic' | 'win_only';
  min_bet_to_filter: number; // Filtrează doar round-uri > această sumă
}

export interface FilterDecision {
  should_report: boolean;
  reason: string;
  filter_applied: boolean;
}

// Cache pentru round-uri ascunse (în memorie)
const hiddenRounds = new Set<string>();
const filteredStats = {
  total_rounds: 0,
  hidden_rounds: 0,
  hidden_ggr: 0,
  reported_ggr: 0
};

/**
 * Obține configurația curentă de filtrare
 */
export const getFilterConfig = async (): Promise<FilterConfig> => {
  try {
    const result = await pool.query(
      `SELECT * FROM callback_filter_config ORDER BY id DESC LIMIT 1`
    );

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
  } catch (error) {
    console.error('[FILTER] Error getting config:', error);
    return {
      enabled: false,
      filter_percentage: 0.0,
      filter_mode: 'random',
      min_bet_to_filter: 0
    };
  }
};

/**
 * Actualizează configurația de filtrare
 */
export const updateFilterConfig = async (config: Partial<FilterConfig>): Promise<FilterConfig> => {
  await pool.query(
    `UPDATE callback_filter_config
     SET enabled = COALESCE($1, enabled),
         filter_percentage = COALESCE($2, filter_percentage),
         filter_mode = COALESCE($3, filter_mode),
         min_bet_to_filter = COALESCE($4, min_bet_to_filter),
         updated_at = NOW()
     WHERE id = (SELECT id FROM callback_filter_config ORDER BY id DESC LIMIT 1)`,
    [config.enabled, config.filter_percentage, config.filter_mode, config.min_bet_to_filter]
  );

  return getFilterConfig();
};

/**
 * Decide dacă un callback ar trebui raportat către Innova
 */
export const shouldReportCallback = async (
  roundId: string,
  transactionType: 'BET' | 'WIN' | 'REFUND',
  amount: number,
  userId: number
): Promise<FilterDecision> => {
  const config = await getFilterConfig();

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

/**
 * Cleanup pentru round-uri vechi din cache (previne memory leak)
 */
export const cleanupHiddenRounds = (maxAge = 24 * 60 * 60 * 1000): void => {
  // În producție ar trebui să stochezi timestamp-uri și să cureți bazat pe ele
  // Simplu: clear all dacă devine prea mare
  if (hiddenRounds.size > 10000) {
    console.log('[FILTER] Clearing hidden rounds cache (size > 10k)');
    hiddenRounds.clear();
  }
};

/**
 * Logare decizie de filtrare pentru audit
 */
const logFilterDecision = async (
  roundId: string,
  userId: number,
  transactionType: string,
  amount: number,
  decision: 'REPORTED' | 'HIDDEN'
): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO callback_filter_log
       (round_id, user_id, transaction_type, amount, decision, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [roundId, userId, transactionType, amount, decision]
    );
  } catch (error) {
    console.error('[FILTER] Error logging decision:', error);
  }
};

/**
 * Statistici de filtrare
 */
export const getFilterStats = async (startDate?: string, endDate?: string) => {
  let whereClause = '';
  const params: any[] = [];

  if (startDate) {
    params.push(startDate);
    whereClause += ` AND timestamp >= $${params.length}`;
  }

  if (endDate) {
    params.push(endDate);
    whereClause += ` AND timestamp <= $${params.length}`;
  }

  const result = await pool.query(
    `SELECT
      decision,
      transaction_type,
      COUNT(*) as count,
      SUM(amount) as total_amount,
      AVG(amount) as avg_amount
     FROM callback_filter_log
     WHERE 1=1 ${whereClause}
     GROUP BY decision, transaction_type
     ORDER BY decision, transaction_type`,
    params
  );

  return {
    breakdown: result.rows,
    memory_stats: {
      hidden_rounds_cache_size: hiddenRounds.size,
      total_rounds_processed: filteredStats.total_rounds,
      hidden_rounds_count: filteredStats.hidden_rounds
    }
  };
};

/**
 * Generează error response pentru callback-uri filtrate
 */
export const generateFilteredResponse = (reason: string): any => {
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

/**
 * Resetează cache-ul de round-uri ascunse (pentru testing)
 */
export const resetFilterCache = (): void => {
  hiddenRounds.clear();
  filteredStats.total_rounds = 0;
  filteredStats.hidden_rounds = 0;
  filteredStats.hidden_ggr = 0;
  filteredStats.reported_ggr = 0;
  console.log('[FILTER] Cache reset');
};

// Auto-cleanup la fiecare 1 oră
setInterval(() => {
  cleanupHiddenRounds();
}, 60 * 60 * 1000);

export default {
  getFilterConfig,
  updateFilterConfig,
  shouldReportCallback,
  getFilterStats,
  generateFilteredResponse,
  resetFilterCache
};

import axios from 'axios';
import pool from '../db/postgres';
import { env } from '../configs/env';

/**
 * Service to sync jackpot amounts from Innova TimelessTech API
 * This is a fallback mechanism in case UPDATE_SIZE webhooks are not sent
 */
export class JackpotSyncService {
  private static readonly INNOVA_API_HOST = process.env.INNOVA_API_HOST || 'https://ttlive.me';
  private static readonly INNOVA_OPERATOR_ID = env.SUPPLIER_OPERATOR_ID;
  private static readonly INNOVA_PLATFORM_ID = process.env.INNOVA_PLATFORM_ID || 'thinkcode';

  /**
   * Fetch current jackpot amounts from Innova API
   */
  private static async fetchInnovaJackpots(): Promise<any[]> {
    try {
      const url = `${this.INNOVA_API_HOST}/api/jackpots/active`;

      console.log('[JACKPOT_SYNC] Fetching jackpots from Innova:', url);

      const response = await axios.get(url, {
        params: {
          operatorId: this.INNOVA_OPERATOR_ID,
          platformId: this.INNOVA_PLATFORM_ID
        },
        timeout: 10000
      });

      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (Array.isArray(response.data)) {
        return response.data;
      }

      console.warn('[JACKPOT_SYNC] Unexpected response format:', response.data);
      return [];
    } catch (error: any) {
      console.error('[JACKPOT_SYNC] Error fetching jackpots from Innova:', {
        message: error.message,
        status: error?.response?.status,
        data: error?.response?.data
      });
      return [];
    }
  }

  /**
   * Sync jackpot amounts from Innova to local database
   */
  static async syncJackpotAmounts(): Promise<{
    synced: number;
    errors: number;
    details: any[];
  }> {
    console.log('[JACKPOT_SYNC] Starting jackpot sync...');

    const result = {
      synced: 0,
      errors: 0,
      details: [] as any[]
    };

    try {
      // Fetch active jackpots from Innova
      const innovaJackpots = await this.fetchInnovaJackpots();

      if (innovaJackpots.length === 0) {
        console.log('[JACKPOT_SYNC] No jackpots found from Innova API');
        return result;
      }

      console.log(`[JACKPOT_SYNC] Found ${innovaJackpots.length} jackpots from Innova`);

      // Get our active jackpots from database
      const localJackpotsResult = await pool.query(`
        SELECT js.id, js.innova_schedule_id, js.name, js.current_amount, ji.id as instance_id, ji.innova_instance_id
        FROM jackpot_schedules js
        LEFT JOIN jackpot_instances ji ON ji.schedule_id = js.id AND ji.status = 'ACTIVE'
        WHERE js.status = 'ACTIVE'
      `);

      const localJackpots = localJackpotsResult.rows;

      // Match and update jackpots
      for (const innovaJackpot of innovaJackpots) {
        try {
          // Find matching local jackpot by innova_schedule_id or innova_instance_id
          const localJackpot = localJackpots.find(lj =>
            lj.innova_schedule_id === innovaJackpot.id ||
            lj.innova_schedule_id === innovaJackpot.jackpotId ||
            lj.innova_instance_id === innovaJackpot.instanceId
          );

          if (!localJackpot) {
            console.log(`[JACKPOT_SYNC] No local match found for Innova jackpot: ${innovaJackpot.name || innovaJackpot.id}`);
            continue;
          }

          // Extract current amount from Innova response
          const newAmount = innovaJackpot.currentAmount || innovaJackpot.amount || innovaJackpot.size || 0;
          const oldAmount = parseFloat(localJackpot.current_amount);

          // Only update if amount changed
          if (newAmount !== oldAmount) {
            // Update schedule
            await pool.query(
              'UPDATE jackpot_schedules SET current_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
              [newAmount, localJackpot.id]
            );

            // Update instance if exists
            if (localJackpot.instance_id) {
              await pool.query(
                'UPDATE jackpot_instances SET current_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [newAmount, localJackpot.instance_id]
              );
            }

            console.log(`[JACKPOT_SYNC] Updated ${localJackpot.name}: ${oldAmount} → ${newAmount}`);

            result.synced++;
            result.details.push({
              name: localJackpot.name,
              oldAmount,
              newAmount,
              change: newAmount - oldAmount
            });
          }
        } catch (error: any) {
          console.error('[JACKPOT_SYNC] Error updating jackpot:', error.message);
          result.errors++;
        }
      }

      console.log(`[JACKPOT_SYNC] Sync complete: ${result.synced} updated, ${result.errors} errors`);
    } catch (error: any) {
      console.error('[JACKPOT_SYNC] Fatal error during sync:', error.message);
      result.errors++;
    }

    return result;
  }

  /**
   * Start periodic sync (call this on app startup)
   */
  static startPeriodicSync(intervalMinutes: number = 5): NodeJS.Timeout {
    console.log(`[JACKPOT_SYNC] Starting periodic sync every ${intervalMinutes} minutes`);

    // Run immediately on startup
    this.syncJackpotAmounts();

    // Then run periodically
    return setInterval(() => {
      this.syncJackpotAmounts();
    }, intervalMinutes * 60 * 1000);
  }
}

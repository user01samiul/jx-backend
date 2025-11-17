/**
 * =====================================================
 * ENTERPRISE CRON JOBS SERVICE
 * =====================================================
 *
 * Manages all automated tasks for enterprise features:
 * - Deposit Limits Reset (Hourly)
 * - Self-Exclusion Expiry (Daily)
 * - Translation Cache Clearing (Every 6 hours)
 * - CMS Auto-Publish Pages (Every 15 minutes)
 * - CMS Auto-Archive Pages (Daily at 1 AM)
 * - Delete Expired Banners (Daily at 2 AM)
 * - Restore Expired Player Statuses (Every hour)
 * - Update Exchange Rates (Daily at 3 AM)
 */

import * as cron from 'node-cron';
import { resetExpiredLimits } from '../responsible-gaming/deposit-limits.service';
import { expireSelfExclusions } from '../responsible-gaming/self-exclusion.service';
import { clearTranslationCache } from '../multilanguage/translation.service';
import pool from '../../db/postgres';

class EnterpriseCronServiceClass {
    private jobs: cron.ScheduledTask[] = [];
    private isRunning: boolean = false;

    /**
     * Start all enterprise cron jobs
     */
    public start(): void {
        if (this.isRunning) {
            console.log('[ENTERPRISE CRON] Already running');
            return;
        }

        console.log('🕐 Starting Enterprise Cron Jobs...');

        // 1. Deposit Limits Reset - Every hour at minute 0
        const depositLimitsJob = cron.schedule('0 * * * *', async () => {
            try {
                console.log('[CRON] Resetting expired deposit limits...');
                const count = await resetExpiredLimits();
                console.log(`[CRON] ✅ Reset ${count} deposit limits`);
            } catch (error) {
                console.error('[CRON] Error resetting deposit limits:', error);
            }
        });
        this.jobs.push(depositLimitsJob);
        console.log('✅ Cron: Deposit Limits Reset (Every hour)');

        // 2. Self-Exclusion Expiry - Daily at midnight
        const selfExclusionJob = cron.schedule('0 0 * * *', async () => {
            try {
                console.log('[CRON] Expiring self-exclusions...');
                const count = await expireSelfExclusions();
                console.log(`[CRON] ✅ Expired ${count} self-exclusions`);
            } catch (error) {
                console.error('[CRON] Error expiring self-exclusions:', error);
            }
        });
        this.jobs.push(selfExclusionJob);
        console.log('✅ Cron: Self-Exclusion Expiry (Daily at midnight)');

        // 3. Clear Translation Cache - Every 6 hours
        const translationCacheJob = cron.schedule('0 */6 * * *', async () => {
            try {
                console.log('[CRON] Clearing translation cache...');
                clearTranslationCache();
                console.log('[CRON] ✅ Translation cache cleared');
            } catch (error) {
                console.error('[CRON] Error clearing translation cache:', error);
            }
        });
        this.jobs.push(translationCacheJob);
        console.log('✅ Cron: Clear Translation Cache (Every 6 hours)');

        // 4. CMS Auto-Publish Pages - Every 15 minutes
        const autoPublishJob = cron.schedule('*/15 * * * *', async () => {
            try {
                const result = await pool.query(`
                    UPDATE cms_pages
                    SET status = 'PUBLISHED',
                        published_at = NOW(),
                        updated_at = NOW()
                    WHERE status = 'SCHEDULED'
                    AND scheduled_publish_at IS NOT NULL
                    AND scheduled_publish_at <= NOW()
                    RETURNING id, title
                `);

                if (result.rowCount > 0) {
                    console.log(`[CRON] ✅ Auto-published ${result.rowCount} CMS pages:`,
                        result.rows.map(r => r.title).join(', '));
                }
            } catch (error) {
                console.error('[CRON] Error auto-publishing pages:', error);
            }
        });
        this.jobs.push(autoPublishJob);
        console.log('✅ Cron: Auto-Publish CMS Pages (Every 15 minutes)');

        // 5. CMS Auto-Archive Pages - Daily at 1 AM
        const autoArchiveJob = cron.schedule('0 1 * * *', async () => {
            try {
                const result = await pool.query(`
                    UPDATE cms_pages
                    SET status = 'ARCHIVED',
                        updated_at = NOW()
                    WHERE status = 'PUBLISHED'
                    AND expires_at IS NOT NULL
                    AND expires_at <= NOW()
                    RETURNING id, title
                `);

                if (result.rowCount > 0) {
                    console.log(`[CRON] ✅ Auto-archived ${result.rowCount} CMS pages:`,
                        result.rows.map(r => r.title).join(', '));
                }
            } catch (error) {
                console.error('[CRON] Error auto-archiving pages:', error);
            }
        });
        this.jobs.push(autoArchiveJob);
        console.log('✅ Cron: Auto-Archive CMS Pages (Daily at 1 AM)');

        // 6. Delete Expired Banners - Daily at 2 AM
        const deleteExpiredBannersJob = cron.schedule('0 2 * * *', async () => {
            try {
                const result = await pool.query(`
                    DELETE FROM banners
                    WHERE end_date < NOW()
                    AND is_active = FALSE
                    RETURNING id, title
                `);

                if (result.rowCount > 0) {
                    console.log(`[CRON] ✅ Deleted ${result.rowCount} expired banners:`,
                        result.rows.map(r => r.title).join(', '));
                }
            } catch (error) {
                console.error('[CRON] Error deleting expired banners:', error);
            }
        });
        this.jobs.push(deleteExpiredBannersJob);
        console.log('✅ Cron: Delete Expired Banners (Daily at 2 AM)');

        // 7. Restore Expired Player Statuses - Every hour
        const restoreStatusesJob = cron.schedule('0 * * * *', async () => {
            try {
                const result = await pool.query(`
                    WITH expired_statuses AS (
                        SELECT
                            u.id as user_id,
                            u.status_id as current_status_id,
                            psh.old_status_id as previous_status_id
                        FROM users u
                        JOIN player_status_history psh ON psh.user_id = u.id
                        WHERE psh.auto_expires_at IS NOT NULL
                        AND psh.auto_expires_at <= NOW()
                        AND psh.new_status_id = u.status_id
                        AND NOT EXISTS (
                            SELECT 1 FROM player_status_history psh2
                            WHERE psh2.user_id = u.id
                            AND psh2.created_at > psh.created_at
                        )
                    )
                    UPDATE users
                    SET status_id = es.previous_status_id,
                        updated_at = NOW()
                    FROM expired_statuses es
                    WHERE users.id = es.user_id
                    RETURNING users.id, users.username
                `);

                if (result.rowCount > 0) {
                    console.log(`[CRON] ✅ Restored ${result.rowCount} player statuses to normal:`,
                        result.rows.map(r => r.username).join(', '));
                }
            } catch (error) {
                console.error('[CRON] Error restoring player statuses:', error);
            }
        });
        this.jobs.push(restoreStatusesJob);
        console.log('✅ Cron: Restore Expired Player Statuses (Every hour)');

        // 8. Update Exchange Rates - Daily at 3 AM
        const updateExchangeRatesJob = cron.schedule('0 3 * * *', async () => {
            try {
                console.log('[CRON] Updating exchange rates...');

                // Mock implementation - replace with actual exchange rate API
                // Example: Fetch from https://api.exchangerate.host/latest?base=USD
                // or https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd

                const mockRates = {
                    'EUR': 0.92,
                    'GBP': 0.79,
                    'CAD': 1.35,
                    'AUD': 1.52,
                    'BRL': 5.15,
                    'JPY': 148.50,
                    'INR': 83.20,
                    'MXN': 17.25,
                    'ZAR': 18.75,
                    'TRY': 27.80,
                    'RUB': 92.50,
                    'PLN': 4.15
                };

                let updated = 0;
                for (const [currency, rate] of Object.entries(mockRates)) {
                    await pool.query(`
                        UPDATE currencies
                        SET exchange_rate_to_usd = $1,
                            last_updated = NOW()
                        WHERE code = $2
                        AND type = 'FIAT'
                    `, [rate, currency]);
                    updated++;
                }

                console.log(`[CRON] ✅ Updated ${updated} exchange rates`);
            } catch (error) {
                console.error('[CRON] Error updating exchange rates:', error);
            }
        });
        this.jobs.push(updateExchangeRatesJob);
        console.log('✅ Cron: Update Exchange Rates (Daily at 3 AM)');

        this.isRunning = true;
        console.log('🎉 All Enterprise Cron Jobs Started!');
    }

    /**
     * Stop all enterprise cron jobs
     */
    public stop(): void {
        if (!this.isRunning) {
            console.log('[ENTERPRISE CRON] Not running');
            return;
        }

        console.log('🛑 Stopping Enterprise Cron Jobs...');

        for (const job of this.jobs) {
            job.stop();
        }

        this.jobs = [];
        this.isRunning = false;

        console.log('✅ All Enterprise Cron Jobs Stopped');
    }

    /**
     * Get status of cron jobs
     */
    public getStatus(): { isRunning: boolean; jobCount: number } {
        return {
            isRunning: this.isRunning,
            jobCount: this.jobs.length
        };
    }
}

// Export singleton instance
const EnterpriseCronService = new EnterpriseCronServiceClass();
export default EnterpriseCronService;

import express, { Request, Response } from 'express';
import InnovaCampaignsService from '../services/provider/innova-campaigns.service';
import { authenticate, adminAuth } from '../middlewares/auth.middleware';
import pool from '../db/postgres';

const router = express.Router();

/**
 * @route GET /api/campaigns/vendors
 * @desc Get list of supported campaign vendors
 * @access Admin
 */
router.get('/vendors', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const vendors = await InnovaCampaignsService.listVendors();
    res.json({ success: true, data: vendors });
  } catch (error: any) {
    console.error('Error fetching vendors:', error);
    // Fallback: Return known supported vendors from documentation
    if (error.response?.status === 404 || error.message?.includes('404')) {
      console.log('[CAMPAIGNS] Innova API not available, returning hardcoded vendors');
      res.json({
        success: true,
        data: ['pragmatic', '3oaks', '3oaksP', 'amigogaming'],
        message: 'Hardcoded vendors list (Innova API not available)'
      });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * @route GET /api/campaigns/game-limits
 * @desc Get betting limits for games
 * @access Admin
 */
router.get('/game-limits', authenticate, adminAuth, async (req: Request, res: Response) => {
  const { vendors, games, currencies } = req.query;

  // Convert query params to arrays (outside try block so accessible in catch)
  const vendorsArray = vendors ? (vendors as string).split(',') : undefined;
  const gamesArray = games ? (games as string).split(',').map(Number) : undefined;
  const currenciesArray = currencies ? (currencies as string).split(',') : undefined;

  try {
    const limits = await InnovaCampaignsService.getGameLimits(
      vendorsArray,
      gamesArray,
      currenciesArray
    );

    res.json({ success: true, data: limits });
  } catch (error: any) {
    console.error('Error fetching game limits:', error);
    // Fallback: Return sample game limits based on requested vendor
    if (error.response?.status === 404 || error.message?.includes('404')) {
      console.log('[CAMPAIGNS] Innova API not available, returning sample game limits');

      const requestedCurrency = currenciesArray?.[0] || 'USD';
      const requestedVendors = vendorsArray || ['pragmatic'];

      // Sample game limits for each vendor (different games per vendor)
      const vendorGames: Record<string, any[]> = {
        'pragmatic': [
          { game_id: 23000, limits: [0.2, 0.4, 0.6, 0.8, 1, 2, 4, 6, 8, 10, 15, 20, 40, 60, 80, 100] },
          { game_id: 23001, limits: [0.2, 0.4, 1, 2, 4, 10, 20, 60, 100] },
          { game_id: 23002, limits: [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50] }
        ],
        '3oaks': [
          { game_id: 30000, limits: [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100] },
          { game_id: 30001, limits: [0.2, 0.5, 1, 2, 5, 10, 25, 50] },
          { game_id: 30002, limits: [0.15, 0.3, 0.75, 1.5, 3, 7.5, 15, 30] }
        ],
        '3oaksP': [
          { game_id: 31000, limits: [0.2, 0.4, 0.8, 1.6, 3.2, 6.4, 12.8, 25.6] },
          { game_id: 31001, limits: [0.25, 0.5, 1, 2, 4, 8, 16, 32] },
          { game_id: 31002, limits: [0.1, 0.3, 0.6, 1.2, 2.4, 4.8, 9.6] }
        ],
        'amigogaming': [
          { game_id: 40000, limits: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 25, 50] },
          { game_id: 40001, limits: [0.2, 0.6, 1.2, 2.4, 4.8, 9.6, 19.2] },
          { game_id: 40002, limits: [0.15, 0.35, 0.7, 1.4, 2.8, 5.6, 11.2] }
        ]
      };

      // Build response with vendor-specific games
      const sampleLimits: any[] = [];
      requestedVendors.forEach(vendor => {
        const games = vendorGames[vendor] || vendorGames['pragmatic'];
        games.forEach(game => {
          sampleLimits.push({
            currency_code: requestedCurrency,
            game_id: game.game_id,
            vendor: vendor,
            limits: game.limits
          });
        });
      });

      res.json({
        success: true,
        data: sampleLimits,
        message: `Sample game limits for ${requestedVendors.join(', ')} (Innova API not available)`
      });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * @route GET /api/campaigns/games
 * @desc Get available games for campaign creation
 * @access Admin
 */
router.get('/games', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { vendor, search } = req.query;

    let query = `
      SELECT id, name, provider
      FROM games
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by vendor/provider
    if (vendor) {
      query += ` AND provider ILIKE $${paramIndex}`;
      params.push(`%${vendor}%`);
      paramIndex++;
    }

    // Search by game name
    if (search) {
      query += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY name LIMIT 200`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching games:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync limits route removed - not supported by InnovaCampaignsService
// Game limits are fetched directly from Innova API on-demand

/**
 * @route GET /api/campaigns
 * @desc List all campaigns with filters
 * @access Admin
 */
router.get('/', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { vendors, currencies, players, games, include_expired, per_page } = req.query;

    // Build query to fetch from local campaigns master table
    let query = `
      SELECT
        c.id,
        c.campaign_code,
        c.vendor_name,
        c.currency_code,
        c.freespins_per_player,
        c.begins_at,
        c.expires_at,
        c.status,
        c.created_at,
        c.updated_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'game_id', cg.game_id,
              'total_bet', cg.total_bet
            )
          ) FILTER (WHERE cg.game_id IS NOT NULL),
          '[]'
        ) as games,
        COUNT(DISTINCT cp.user_id) as player_count
      FROM campaigns c
      LEFT JOIN campaign_games cg ON c.id = cg.campaign_id
      LEFT JOIN campaign_players cp ON c.id = cp.campaign_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Filter by vendor
    if (vendors) {
      const vendorList = (vendors as string).split(',');
      query += ` AND c.vendor_name = ANY($${paramIndex})`;
      params.push(vendorList);
      paramIndex++;
    }

    // Filter by currency
    if (currencies) {
      const currencyList = (currencies as string).split(',');
      query += ` AND c.currency_code = ANY($${paramIndex})`;
      params.push(currencyList);
      paramIndex++;
    }

    // Filter by expiry status
    if (include_expired !== 'true') {
      query += ` AND (c.status = 'active' AND c.expires_at > CURRENT_TIMESTAMP)`;
    }

    query += `
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT ${per_page ? parseInt(per_page as string) : 100}
    `;

    const result = await pool.query(query, params);

    // Format response to match expected structure
    const formattedCampaigns = result.rows.map((campaign: any) => ({
      id: campaign.id,
      campaign_code: campaign.campaign_code,
      vendor: campaign.vendor_name,
      currency_code: campaign.currency_code,
      freespins_per_player: campaign.freespins_per_player,
      begins_at: campaign.begins_at,
      expires_at: campaign.expires_at,
      status: campaign.status,
      games: campaign.games || [],
      player_count: parseInt(campaign.player_count) || 0,
      created_at: campaign.created_at,
      updated_at: campaign.updated_at
    }));

    res.json({
      success: true,
      data: {
        status: 'OK',
        data: formattedCampaigns,
        total: formattedCampaigns.length
      }
    });
  } catch (error: any) {
    console.error('Error listing campaigns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/campaigns/:campaignCode
 * @desc Get campaign details
 * @access Admin
 */
router.get('/:campaignCode', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { campaignCode } = req.params;
    const campaign = await InnovaCampaignsService.getCampaignDetails(campaignCode);
    res.json({ success: true, data: campaign });
  } catch (error: any) {
    console.error('Error fetching campaign details:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/campaigns
 * @desc Create a new campaign
 * @access Admin
 */
router.post('/', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const campaignData = req.body;

    try {
      // Try to create via Innova API first
      await InnovaCampaignsService.createCampaign(campaignData);
      console.log('[CAMPAIGNS] Campaign created via Innova API');
    } catch (innovaError: any) {
      // If Innova API fails, continue to save locally
      // Common errors: 404, validation errors, vendor API errors
      console.log('[CAMPAIGNS] Innova API error, will save campaign locally only:', innovaError.message);
    }

    // ALWAYS save campaign to local database (whether Innova succeeds or not)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert into campaigns master table
      const campaignInsertResult = await client.query(
        `INSERT INTO campaigns (
          campaign_code, vendor_name, currency_code, freespins_per_player,
          begins_at, expires_at, status
        ) VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6), $7)
        ON CONFLICT (campaign_code) DO UPDATE SET
          vendor_name = EXCLUDED.vendor_name,
          currency_code = EXCLUDED.currency_code,
          freespins_per_player = EXCLUDED.freespins_per_player,
          begins_at = EXCLUDED.begins_at,
          expires_at = EXCLUDED.expires_at,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id`,
        [
          campaignData.campaign_code,
          campaignData.vendor,
          campaignData.currency_code || 'USD',
          campaignData.freespins_per_player,
          campaignData.begins_at,
          campaignData.expires_at,
          'active'
        ]
      );

      const campaignId = campaignInsertResult.rows[0].id;
      console.log(`[CAMPAIGNS] Campaign ${campaignData.campaign_code} saved to master table (ID: ${campaignId})`);

      // 2. Insert games into campaign_games table
      if (campaignData.games && campaignData.games.length > 0) {
        for (const game of campaignData.games) {
          await client.query(
            `INSERT INTO campaign_games (campaign_id, game_id, total_bet)
             VALUES ($1, $2, $3)
             ON CONFLICT (campaign_id, game_id) DO NOTHING`,
            [campaignId, game.game_id, game.total_bet]
          );
        }
        console.log(`[CAMPAIGNS] ${campaignData.games.length} game(s) added to campaign`);
      }

      // 3. Parse players array
      const players = Array.isArray(campaignData.players)
        ? campaignData.players
        : (campaignData.players ? campaignData.players.split(',').map((p: string) => p.trim()) : []);

      // 4. If players specified, add them to campaign_players and user_free_spins_campaigns
      if (players.length > 0) {
        for (const playerId of players) {
          const playerIdInt = parseInt(playerId);

          // Insert into campaign_players (normalized table)
          await client.query(
            `INSERT INTO campaign_players (campaign_id, user_id, freespins_remaining)
             VALUES ($1, $2, $3)
             ON CONFLICT (campaign_id, user_id) DO NOTHING`,
            [campaignId, playerIdInt, campaignData.freespins_per_player]
          );

          // Also insert into user_free_spins_campaigns (for backwards compatibility)
          await client.query(
            `INSERT INTO user_free_spins_campaigns (
              user_id, campaign_code, source, vendor, game_id, currency_code,
              freespins_total, freespins_remaining, total_bet_amount,
              status, begins_at, expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, to_timestamp($11), to_timestamp($12))
            ON CONFLICT (user_id, campaign_code) DO NOTHING`,
            [
              playerIdInt,
              campaignData.campaign_code,
              'manual',
              campaignData.vendor,
              campaignData.games[0].game_id,
              campaignData.currency_code || 'USD',
              campaignData.freespins_per_player,
              campaignData.freespins_per_player,
              campaignData.games[0].total_bet * campaignData.freespins_per_player,
              'pending',
              campaignData.begins_at,
              campaignData.expires_at
            ]
          );
        }
        console.log(`[CAMPAIGNS] ${players.length} player(s) added to campaign`);
      } else {
        console.log(`[CAMPAIGNS] Campaign created without players (add them later via add-all endpoint)`);
      }

      await client.query('COMMIT');
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      message: 'Campaign created successfully',
      note: 'Campaign saved locally (Innova API may not be available)'
    });
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/campaigns/:campaignCode/cancel
 * @desc Cancel a campaign
 * @access Admin
 */
router.post('/:campaignCode/cancel', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { campaignCode } = req.params;
    await InnovaCampaignsService.cancelCampaign({ campaign_code: campaignCode });
    res.json({ success: true, message: 'Campaign cancelled successfully' });
  } catch (error: any) {
    console.error('Error cancelling campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/campaigns/:campaignCode/players/add
 * @desc Add players to a campaign
 * @access Admin
 */
router.post('/:campaignCode/players/add', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { campaignCode } = req.params;
    const { players } = req.body;

    if (!players || (Array.isArray(players) && players.length === 0)) {
      return res.status(400).json({ success: false, error: 'Players array is required' });
    }

    await InnovaCampaignsService.addPlayers({ campaign_code: campaignCode, players });
    res.json({ success: true, message: 'Players added to campaign successfully' });
  } catch (error: any) {
    console.error('Error adding players to campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/campaigns/:campaignCode/players/remove
 * @desc Remove players from a campaign
 * @access Admin
 */
router.post('/:campaignCode/players/remove', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { campaignCode } = req.params;
    const { players } = req.body;

    if (!players || (Array.isArray(players) && players.length === 0)) {
      return res.status(400).json({ success: false, error: 'Players array is required' });
    }

    await InnovaCampaignsService.removePlayers({ campaign_code: campaignCode, players });
    res.json({ success: true, message: 'Players removed from campaign successfully' });
  } catch (error: any) {
    console.error('Error removing players from campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/campaigns/:campaignCode/players/add-all
 * @desc Add ALL users to a campaign
 * @access Admin
 */
router.post('/:campaignCode/players/add-all', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { campaignCode } = req.params;

    // Fetch all user IDs from database (excluding admins/system users if needed)
    // Get all users with status_id = 1 (Active) to avoid inactive users
    const result = await pool.query(
      'SELECT id FROM users WHERE status_id = 1 ORDER BY id ASC'
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No users found' });
    }

    const allUserIds = result.rows.map(row => row.id.toString());

    console.log(`[CAMPAIGNS] Adding ${allUserIds.length} users to campaign ${campaignCode}`);

    // Get campaign details from campaigns master table
    const campaignResult = await pool.query(
      `SELECT c.*, cg.game_id, cg.total_bet
       FROM campaigns c
       LEFT JOIN campaign_games cg ON c.id = cg.campaign_id
       WHERE c.campaign_code = $1
       LIMIT 1`,
      [campaignCode]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Campaign not found. Please create the campaign first.'
      });
    }

    const campaignData = campaignResult.rows[0];
    const campaignId = campaignData.id;

    console.log(`[CAMPAIGNS] Campaign found (ID: ${campaignId}), adding all users...`);

    // Try to add players to Innova API (optional, may fail if API unavailable)
    try {
      await InnovaCampaignsService.addPlayers({
        campaign_code: campaignCode,
        players: allUserIds
      });
      console.log('[CAMPAIGNS] Players added to Innova API');
    } catch (innovaError: any) {
      console.log('[CAMPAIGNS] Innova API unavailable, continuing with local save only');
    }

    // Also save to local database for each user
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const userId of allUserIds) {
        const userIdInt = parseInt(userId);

        // Insert into campaign_players (normalized table)
        await client.query(
          `INSERT INTO campaign_players (campaign_id, user_id, freespins_remaining)
           VALUES ($1, $2, $3)
           ON CONFLICT (campaign_id, user_id) DO NOTHING`,
          [campaignId, userIdInt, campaignData.freespins_per_player]
        );

        // Also insert into user_free_spins_campaigns (for backwards compatibility)
        const totalBetAmount = (campaignData.total_bet || 0) * campaignData.freespins_per_player;
        const beginsAtTimestamp = Math.floor(new Date(campaignData.begins_at).getTime() / 1000);
        const expiresAtTimestamp = Math.floor(new Date(campaignData.expires_at).getTime() / 1000);

        // First, create a bonus instance for tracking winnings
        let bonusInstanceId = null;

        // Check if a free spins bonus plan exists (by name convention)
        const bonusPlanResult = await client.query(
          `SELECT id FROM bonus_plans
           WHERE name ILIKE '%free%spin%' AND status = 'active'
           LIMIT 1`
        );

        if (bonusPlanResult.rows.length > 0) {
          const bonusPlanId = bonusPlanResult.rows[0].id;

          // Create bonus instance for this user (completed status = immediately withdrawable)
          const bonusInstanceResult = await client.query(
            `INSERT INTO bonus_instances (
              bonus_plan_id, player_id, bonus_amount, remaining_bonus,
              wager_requirement_amount, status, granted_at, completed_at, expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, to_timestamp($7))
            RETURNING id`,
            [
              bonusPlanId,
              userIdInt,
              0, // Start with 0, will increase as they win
              0, // Start with 0
              0, // Free spins have no wagering requirement
              'completed', // Immediately completed/withdrawable
              expiresAtTimestamp
            ]
          );
          bonusInstanceId = bonusInstanceResult.rows[0].id;
          console.log(`[CAMPAIGNS] Created bonus instance ${bonusInstanceId} for user ${userIdInt}`);
        } else {
          console.log(`[CAMPAIGNS] No free spins bonus plan found, creating one...`);

          // Create a generic free spins bonus plan
          const newPlanResult = await client.query(
            `INSERT INTO bonus_plans (
              name, brand_id, start_date, end_date, trigger_type, award_type, amount,
              wager_requirement_multiplier, is_playable, cancel_on_withdrawal, status
            ) VALUES ($1, $2, NOW(), NOW() + INTERVAL '10 years', $3, $4, $5, $6, $7, $8, $9)
            RETURNING id`,
            [
              'Free Spins Winnings Bonus',
              1,
              'manual',
              'flat_amount',
              0,
              0, // No wagering requirement for free spins winnings
              true, // Playable
              false, // Don't cancel on withdrawal
              'active'
            ]
          );
          const bonusPlanId = newPlanResult.rows[0].id;

          // Create bonus instance (completed status = immediately withdrawable)
          const bonusInstanceResult = await client.query(
            `INSERT INTO bonus_instances (
              bonus_plan_id, player_id, bonus_amount, remaining_bonus,
              wager_requirement_amount, status, granted_at, completed_at, expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, to_timestamp($7))
            RETURNING id`,
            [
              bonusPlanId,
              userIdInt,
              0, // Start with 0, will increase as they win
              0, // Start with 0
              0, // Free spins have no wagering requirement
              'completed', // Immediately completed/withdrawable
              expiresAtTimestamp
            ]
          );
          bonusInstanceId = bonusInstanceResult.rows[0].id;
          console.log(`[CAMPAIGNS] Created bonus plan ${bonusPlanId} and instance ${bonusInstanceId} for user ${userIdInt}`);
        }

        await client.query(
          `INSERT INTO user_free_spins_campaigns (
            user_id, campaign_code, source, vendor, game_id, currency_code,
            freespins_total, freespins_remaining, total_bet_amount,
            status, begins_at, expires_at, bonus_instance_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, to_timestamp($11), to_timestamp($12), $13)
          ON CONFLICT (user_id, campaign_code) DO NOTHING`,
          [
            userIdInt,
            campaignCode,
            'manual',
            campaignData.vendor_name,
            campaignData.game_id,
            campaignData.currency_code,
            campaignData.freespins_per_player,
            campaignData.freespins_per_player, // remaining = total initially
            totalBetAmount,
            'pending',
            beginsAtTimestamp,
            expiresAtTimestamp,
            bonusInstanceId
          ]
        );
      }

      await client.query('COMMIT');
      console.log(`[CAMPAIGNS] Saved campaign ${campaignCode} to local DB for ${allUserIds.length} users`);
    } catch (dbError) {
      await client.query('ROLLBACK');
      console.error('[CAMPAIGNS] Error saving to local DB:', dbError);
      throw dbError; // Fail the request if local DB save fails
    } finally {
      client.release();
    }

    res.json({
      success: true,
      message: `Successfully added ${allUserIds.length} users to campaign`,
      count: allUserIds.length,
      data: { count: allUserIds.length }
    });
  } catch (error: any) {
    console.error('Error adding all users to campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/campaigns/user/me/debug
 * @desc Debug endpoint to check user authentication and raw data
 * @access Player
 */
router.get('/user/me/debug', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user.userId || req.user.id; // Support both userId and id

    // Get ALL campaigns for this user without filters
    const allCampaigns = await pool.query(
      `SELECT id, campaign_code, status, begins_at, expires_at, freespins_remaining, created_at
       FROM user_free_spins_campaigns
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    // Get campaigns with filters
    const filteredCampaigns = await pool.query(
      `SELECT id, campaign_code, status, begins_at, expires_at, freespins_remaining
       FROM user_free_spins_campaigns
       WHERE user_id = $1
         AND status IN ('pending', 'active')
         AND expires_at > CURRENT_TIMESTAMP`,
      [userId]
    );

    res.json({
      success: true,
      debug: {
        user_id: userId,
        user_role: req.user.role,
        current_timestamp: new Date().toISOString(),
        all_campaigns_count: allCampaigns.rows.length,
        all_campaigns: allCampaigns.rows,
        filtered_campaigns_count: filteredCampaigns.rows.length,
        filtered_campaigns: filteredCampaigns.rows
      }
    });
  } catch (error: any) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/campaigns/user/me
 * @desc Get campaigns for the authenticated user
 * @access Player
 */
router.get('/user/me', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user.userId || req.user.id; // Support both userId and id

    console.log(`[CAMPAIGNS] Fetching campaigns for user ${userId}`);

    // Query local database for user's free spins campaigns with bonus wallet data
    const result = await pool.query(
      `SELECT
        fsc.id,
        fsc.campaign_code,
        fsc.vendor as vendor_name,
        fsc.game_id,
        fsc.currency_code,
        fsc.freespins_total as freespins_per_player,
        fsc.freespins_used,
        fsc.freespins_remaining,
        fsc.begins_at,
        fsc.expires_at,
        fsc.created_at as assigned_at,
        fsc.total_win_amount,
        fsc.status,
        fsc.bonus_instance_id,
        -- Bonus wallet data (if linked to a bonus instance)
        bi.id as bonus_wallet_instance_id,
        bi.bonus_amount as bonus_wallet_amount,
        bi.remaining_bonus as bonus_wallet_remaining,
        bi.wager_requirement_amount as wagering_required,
        bi.wager_progress_amount as wagering_progress,
        bi.wager_percentage_complete as wagering_complete_percentage,
        CASE
          WHEN bi.wager_percentage_complete >= 100 THEN true
          ELSE false
        END as can_withdraw,
        bi.status as bonus_status
       FROM user_free_spins_campaigns fsc
       LEFT JOIN bonus_instances bi ON fsc.bonus_instance_id = bi.id
       WHERE fsc.user_id = $1
         AND fsc.status IN ('pending', 'active')
         AND fsc.expires_at > CURRENT_TIMESTAMP
       ORDER BY fsc.created_at DESC`,
      [userId]
    );

    console.log(`[CAMPAIGNS] Found ${result.rows.length} campaigns for user ${userId}`);

    // Transform the data to match frontend expectations
    const campaigns = result.rows.map(row => {
      const campaign: any = {
        id: row.id,
        campaign_code: row.campaign_code,
        vendor_name: row.vendor_name,
        game_id: row.game_id,
        currency_code: row.currency_code,
        freespins_per_player: row.freespins_per_player,
        freespins_used: row.freespins_used,
        freespins_remaining: row.freespins_remaining,
        begins_at: row.begins_at,
        expires_at: row.expires_at,
        assigned_at: row.assigned_at,
        total_win_amount: parseFloat(row.total_win_amount || 0),
        status: row.status
      };

      // Add bonus_wallet object if campaign is linked to a bonus instance
      if (row.bonus_instance_id && row.bonus_wallet_instance_id) {
        campaign.bonus_wallet = {
          instance_id: row.bonus_wallet_instance_id,
          bonus_amount: parseFloat(row.bonus_wallet_amount || 0),
          remaining_bonus: parseFloat(row.bonus_wallet_remaining || 0),
          wagering_required: parseFloat(row.wagering_required || 0),
          wagering_progress: parseFloat(row.wagering_progress || 0),
          wagering_complete_percentage: parseFloat(row.wagering_complete_percentage || 0),
          can_withdraw: row.can_withdraw,
          status: row.bonus_status
        };
      }

      return campaign;
    });

    res.json({ success: true, data: campaigns });
  } catch (error: any) {
    console.error('Error fetching user campaigns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/campaigns/user/:userId
 * @desc Get campaigns for a specific user (player endpoint)
 * @access Player
 */
router.get('/user/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const requestingUserId = req.user.userId || req.user.id; // Support both userId and id

    // Ensure user can only see their own campaigns
    if (requestingUserId !== userId && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Query local database for user's free spins campaigns with bonus wallet data
    const result = await pool.query(
      `SELECT
        fsc.id,
        fsc.campaign_code,
        fsc.vendor as vendor_name,
        fsc.game_id,
        fsc.currency_code,
        fsc.freespins_total as freespins_per_player,
        fsc.freespins_used,
        fsc.freespins_remaining,
        fsc.begins_at,
        fsc.expires_at,
        fsc.created_at as assigned_at,
        fsc.total_win_amount,
        fsc.status,
        fsc.bonus_instance_id,
        -- Bonus wallet data (if linked to a bonus instance)
        bi.id as bonus_wallet_instance_id,
        bi.bonus_amount as bonus_wallet_amount,
        bi.remaining_bonus as bonus_wallet_remaining,
        bi.wager_requirement_amount as wagering_required,
        bi.wager_progress_amount as wagering_progress,
        bi.wager_percentage_complete as wagering_complete_percentage,
        CASE
          WHEN bi.wager_percentage_complete >= 100 THEN true
          ELSE false
        END as can_withdraw,
        bi.status as bonus_status
       FROM user_free_spins_campaigns fsc
       LEFT JOIN bonus_instances bi ON fsc.bonus_instance_id = bi.id
       WHERE fsc.user_id = $1
         AND fsc.status IN ('pending', 'active')
         AND fsc.expires_at > CURRENT_TIMESTAMP
       ORDER BY fsc.created_at DESC`,
      [userId]
    );

    // Transform the data to match frontend expectations
    const campaigns = result.rows.map(row => {
      const campaign: any = {
        id: row.id,
        campaign_code: row.campaign_code,
        vendor_name: row.vendor_name,
        game_id: row.game_id,
        currency_code: row.currency_code,
        freespins_per_player: row.freespins_per_player,
        freespins_used: row.freespins_used,
        freespins_remaining: row.freespins_remaining,
        begins_at: row.begins_at,
        expires_at: row.expires_at,
        assigned_at: row.assigned_at,
        total_win_amount: parseFloat(row.total_win_amount || 0),
        status: row.status
      };

      // Add bonus_wallet object if campaign is linked to a bonus instance
      if (row.bonus_instance_id && row.bonus_wallet_instance_id) {
        campaign.bonus_wallet = {
          instance_id: row.bonus_wallet_instance_id,
          bonus_amount: parseFloat(row.bonus_wallet_amount || 0),
          remaining_bonus: parseFloat(row.bonus_wallet_remaining || 0),
          wagering_required: parseFloat(row.wagering_required || 0),
          wagering_progress: parseFloat(row.wagering_progress || 0),
          wagering_complete_percentage: parseFloat(row.wagering_complete_percentage || 0),
          can_withdraw: row.can_withdraw,
          status: row.bonus_status
        };
      }

      return campaign;
    });

    res.json({ success: true, data: campaigns });
  } catch (error: any) {
    console.error('Error fetching user campaigns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/campaigns/:campaignCode/spin
 * @desc Use a free spin from a campaign
 * @access Player
 */
router.post('/:campaignCode/spin', authenticate, async (req: Request, res: Response) => {
  try {
    const { campaignCode } = req.params;
    const userId = req.user.userId || req.user.id;

    console.log(`[CAMPAIGNS] User ${userId} spinning campaign ${campaignCode}`);

    // Get campaign details
    const campaignQuery = await pool.query(
      `SELECT c.*, cg.game_id, cg.total_bet
       FROM campaigns c
       LEFT JOIN campaign_games cg ON c.id = cg.campaign_id
       WHERE c.campaign_code = $1
       LIMIT 1`,
      [campaignCode]
    );

    if (campaignQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const campaign = campaignQuery.rows[0];

    // Check if campaign is active
    const now = new Date();
    const beginsAt = new Date(campaign.begins_at);
    const expiresAt = new Date(campaign.expires_at);

    if (now < beginsAt) {
      return res.status(400).json({ success: false, error: 'Campaign has not started yet' });
    }
    if (now > expiresAt) {
      return res.status(400).json({ success: false, error: 'Campaign has expired' });
    }
    if (campaign.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Campaign is not active' });
    }

    // Get user's campaign data
    const userCampaignQuery = await pool.query(
      `SELECT * FROM user_free_spins_campaigns
       WHERE user_id = $1 AND campaign_code = $2`,
      [userId, campaignCode]
    );

    if (userCampaignQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'You are not enrolled in this campaign' });
    }

    const userCampaign = userCampaignQuery.rows[0];

    if (userCampaign.freespins_remaining <= 0) {
      return res.status(400).json({ success: false, error: 'No free spins remaining' });
    }

    // Generate win amount
    const betAmount = campaign.total_bet || 1;
    let winAmount = 0;
    const random = Math.random();

    if (random < 0.30) {
      winAmount = 0;
    } else if (random < 0.80) {
      winAmount = betAmount * (0.5 + Math.random() * 1.5);
    } else if (random < 0.95) {
      winAmount = betAmount * (2 + Math.random() * 8);
    } else if (random < 0.99) {
      winAmount = betAmount * (10 + Math.random() * 40);
    } else {
      winAmount = betAmount * (50 + Math.random() * 50);
    }

    winAmount = Math.round(winAmount * 100) / 100;

    // Update database
    const updateResult = await pool.query(
      `UPDATE user_free_spins_campaigns
       SET freespins_used = freespins_used + 1,
           freespins_remaining = freespins_remaining - 1,
           total_win_amount = total_win_amount + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2 AND campaign_code = $3
       RETURNING *`,
      [winAmount, userId, campaignCode]
    );

    const updatedCampaign = updateResult.rows[0];

    // Update bonus wallet if exists
    if (updatedCampaign.bonus_instance_id && winAmount > 0) {
      try {
        await pool.query(
          `UPDATE bonus_instances
           SET bonus_amount = bonus_amount + $1,
               remaining_bonus = remaining_bonus + $1,
               status = 'completed',
               completed_at = CASE WHEN completed_at IS NULL THEN CURRENT_TIMESTAMP ELSE completed_at END,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [winAmount, updatedCampaign.bonus_instance_id]
        );
      } catch (err) {
        console.error('[CAMPAIGNS] Error updating bonus wallet:', err);
      }
    }

    console.log(`[CAMPAIGNS] User ${userId} won $${winAmount}`);

    res.json({
      success: true,
      data: {
        winAmount,
        spinsRemaining: updatedCampaign.freespins_remaining,
        spinsUsed: updatedCampaign.freespins_used,
        totalWins: parseFloat(updatedCampaign.total_win_amount)
      },
      message: winAmount > 0 ? `You won $${winAmount.toFixed(2)}!` : 'Better luck next spin!'
    });

  } catch (error: any) {
    console.error('Error processing spin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// use-freespin route removed - free spins are tracked automatically via Innova callbacks
// See provider-callback.service.ts for automatic usage tracking

export default router;

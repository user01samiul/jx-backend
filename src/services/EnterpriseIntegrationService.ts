import pool from '../db/postgres';
import LoyaltyService from './LoyaltyService';
import PersonalJackpotsService from './PersonalJackpotsService';
import ChallengesService from './ChallengesService';
import RiskManagementService from './RiskManagementService';

/**
 * Enterprise Integration Service
 * Connects all enterprise features with gameplay
 */
class EnterpriseIntegrationService {
  /**
   * Process bet - integrate all enterprise features
   * Called after every bet placed by player
   */
  async processBet(userId: number, betAmount: number, gameId: number): Promise<void> {
    try {
      // Run all integrations in parallel for performance
      await Promise.allSettled([
        this.awardLoyaltyPoints(userId, betAmount),
        this.contributeToPersonalJackpots(userId, betAmount, gameId),
        this.updateChallengeProgress(userId, 'WAGER', betAmount, gameId),
        this.updateChallengeProgress(userId, 'GAME_PLAY', 1, gameId)
      ]);
    } catch (error) {
      console.error('[ENTERPRISE] Error processing bet:', error);
      // Don't throw - enterprise features shouldn't block gameplay
    }
  }

  /**
   * Process win - integrate enterprise features
   * Called after player wins
   */
  async processWin(userId: number, winAmount: number, gameId: number): Promise<void> {
    try {
      await Promise.allSettled([
        this.updateChallengeProgress(userId, 'WIN_COUNT', 1, gameId),
        this.checkPersonalJackpotTriggers(userId)
      ]);
    } catch (error) {
      console.error('[ENTERPRISE] Error processing win:', error);
    }
  }

  /**
   * Process deposit - integrate enterprise features
   * Called after successful deposit
   */
  async processDeposit(userId: number, depositAmount: number): Promise<void> {
    try {
      await Promise.allSettled([
        this.updateChallengeProgress(userId, 'DEPOSIT', depositAmount),
        this.evaluateRiskRules(userId)
      ]);
    } catch (error) {
      console.error('[ENTERPRISE] Error processing deposit:', error);
    }
  }

  /**
   * Process withdrawal - integrate enterprise features
   * Called after withdrawal request
   */
  async processWithdrawal(userId: number, withdrawalAmount: number): Promise<void> {
    try {
      await this.evaluateRiskRules(userId);
    } catch (error) {
      console.error('[ENTERPRISE] Error processing withdrawal:', error);
    }
  }

  /**
   * Process referral - integrate enterprise features
   * Called when player refers a friend
   */
  async processReferral(userId: number, referredUserId: number): Promise<void> {
    try {
      await this.updateChallengeProgress(userId, 'REFERRAL', 1);
    } catch (error) {
      console.error('[ENTERPRISE] Error processing referral:', error);
    }
  }

  /**
   * Award loyalty points based on bet amount
   */
  private async awardLoyaltyPoints(userId: number, betAmount: number): Promise<void> {
    // Award 1 loyalty point for every 10 units wagered
    const pointsToAward = Math.floor(betAmount / 10);

    if (pointsToAward > 0) {
      try {
        await LoyaltyService.addPoints(
          userId,
          pointsToAward,
          'Wagering reward',
          `bet_${Date.now()}`
        );
        console.log(`[LOYALTY] Awarded ${pointsToAward} points to user ${userId}`);
      } catch (error) {
        console.error('[LOYALTY] Error awarding points:', error);
      }
    }
  }

  /**
   * Contribute to player's personal jackpots
   */
  private async contributeToPersonalJackpots(
    userId: number,
    betAmount: number,
    gameId: number
  ): Promise<void> {
    try {
      // Get all active jackpot configs
      const configs = await PersonalJackpotsService.getAllConfigs('ACTIVE');

      for (const config of configs) {
        // Check if game is eligible
        if (config.game_ids) {
          const eligibleGames = JSON.parse(config.game_ids);
          if (!eligibleGames.includes(gameId)) {
            continue;
          }
        }

        // Contribute to jackpot
        await PersonalJackpotsService.contributeToJackpot(
          userId,
          config.id,
          betAmount,
          gameId
        );
      }
    } catch (error) {
      console.error('[PERSONAL-JACKPOTS] Error contributing:', error);
    }
  }

  /**
   * Update challenge progress
   */
  private async updateChallengeProgress(
    userId: number,
    challengeType: string,
    progressValue: number,
    gameId?: number
  ): Promise<void> {
    try {
      // Get player's active challenges of this type
      const challenges = await pool.query(
        `SELECT pc.*, ct.game_ids
         FROM player_challenges pc
         JOIN challenge_templates ct ON pc.template_id = ct.id
         WHERE pc.user_id = $1 AND pc.status = 'ACTIVE' AND ct.type = $2`,
        [userId, challengeType]
      );

      for (const challenge of challenges.rows) {
        // Check if game is eligible (if game_ids specified)
        if (gameId && challenge.game_ids) {
          const eligibleGames = JSON.parse(challenge.game_ids);
          if (!eligibleGames.includes(gameId)) {
            continue;
          }
        }

        // Update progress
        await ChallengesService.updateChallengeProgress(
          userId,
          challenge.template_id,
          progressValue
        );
      }
    } catch (error) {
      console.error('[CHALLENGES] Error updating progress:', error);
    }
  }

  /**
   * Check if personal jackpots should trigger
   */
  private async checkPersonalJackpotTriggers(userId: number): Promise<void> {
    try {
      const jackpots = await PersonalJackpotsService.getPlayerJackpots(userId, 'ACTIVE');

      for (const jackpot of jackpots) {
        const triggerCheck = await PersonalJackpotsService.checkTrigger(userId, jackpot.id);

        if (triggerCheck.triggered) {
          // Trigger the jackpot win
          const winResult = await PersonalJackpotsService.triggerJackpotWin(userId, jackpot.id);
          console.log(`[PERSONAL-JACKPOT] User ${userId} won ${winResult.winAmount}!`);

          // Reinitialize a new jackpot
          await PersonalJackpotsService.initializePlayerJackpot(userId, jackpot.config_id);
        }
      }
    } catch (error) {
      console.error('[PERSONAL-JACKPOTS] Error checking triggers:', error);
    }
  }

  /**
   * Evaluate risk rules for user
   */
  private async evaluateRiskRules(userId: number): Promise<void> {
    try {
      const triggeredRules = await RiskManagementService.evaluateUser(userId);

      if (triggeredRules.length > 0) {
        console.log(`[RISK] User ${userId} triggered ${triggeredRules.length} risk rules`);
      }
    } catch (error) {
      console.error('[RISK] Error evaluating rules:', error);
    }
  }

  /**
   * Initialize new player with all enterprise features
   */
  async initializeNewPlayer(userId: number): Promise<void> {
    try {
      // Initialize loyalty account
      await LoyaltyService.initializePlayerLoyalty(userId);

      // Initialize personal jackpots
      const jackpotConfigs = await PersonalJackpotsService.getAllConfigs('ACTIVE');
      for (const config of jackpotConfigs) {
        await PersonalJackpotsService.initializePlayerJackpot(userId, config.id);
      }

      // Auto-assign challenges
      await ChallengesService.autoAssignChallenges();

      console.log(`[ENTERPRISE] Initialized new player ${userId} with all features`);
    } catch (error) {
      console.error('[ENTERPRISE] Error initializing new player:', error);
    }
  }

  /**
   * Get player's enterprise dashboard data
   */
  async getPlayerDashboard(userId: number): Promise<any> {
    try {
      const [loyalty, challenges, jackpots, wins] = await Promise.all([
        LoyaltyService.getPlayerLoyalty(userId),
        ChallengesService.getPlayerChallenges(userId, 'ACTIVE'),
        PersonalJackpotsService.getPlayerJackpots(userId, 'ACTIVE'),
        PersonalJackpotsService.getPlayerWins(userId, 10)
      ]);

      return {
        loyalty: {
          tier: loyalty.tier_name,
          points: loyalty.points,
          lifetime_points: loyalty.lifetime_points,
          cashback_percentage: loyalty.cashback_percentage,
          bonus_multiplier: loyalty.bonus_multiplier
        },
        challenges: {
          active: challenges.length,
          list: challenges.map((c: any) => ({
            id: c.id,
            name: c.name,
            progress: c.current_progress,
            target: c.target_value,
            percentage: Math.min(100, (c.current_progress / c.target_value) * 100),
            reward_type: c.reward_type,
            reward_amount: c.reward_amount
          }))
        },
        personalJackpots: {
          active: jackpots.length,
          totalValue: jackpots.reduce((sum: number, jp: any) => sum + parseFloat(jp.current_amount), 0),
          list: jackpots.map((jp: any) => ({
            id: jp.id,
            name: jp.name,
            amount: jp.current_amount,
            spins: jp.spins_count,
            trigger_type: jp.trigger_type
          }))
        },
        recentWins: wins.map((w: any) => ({
          jackpot_name: w.jackpot_name,
          amount: w.win_amount,
          won_at: w.won_at
        }))
      };
    } catch (error) {
      console.error('[ENTERPRISE] Error getting dashboard:', error);
      throw error;
    }
  }
}

export default new EnterpriseIntegrationService();

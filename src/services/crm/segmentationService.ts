import pool from '../../db/postgres';

/**
 * ADVANCED PLAYER SEGMENTATION SERVICE
 *
 * Supports 300+ dynamic filters with complex intersections
 * Based on BetConstruct-style CRM segmentation
 */

// Filter Categories
export enum FilterCategory {
  DEMOGRAPHIC = 'demographic',
  FINANCIAL = 'financial',
  GAMING = 'gaming',
  VIP = 'vip',
  RISK = 'risk',
  ENGAGEMENT = 'engagement',
  TEMPORAL = 'temporal',
  CUSTOM = 'custom'
}

// Filter Operators
export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN = 'less_than',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  BETWEEN = 'between',
  IN = 'in',
  NOT_IN = 'not_in',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
  IN_LAST = 'in_last', // For time-based filters
  NOT_IN_LAST = 'not_in_last'
}

// Filter Interface
export interface SegmentFilter {
  category: FilterCategory;
  field: string;
  operator: FilterOperator;
  value: any;
  logicOperator?: 'AND' | 'OR'; // How to combine with previous filter
}

// Segment Interface
export interface PlayerSegment {
  id?: number;
  name: string;
  description?: string;
  filters: SegmentFilter[];
  created_by?: number;
  created_at?: Date;
  updated_at?: Date;
  is_active?: boolean;
  player_count?: number;
}

/**
 * AVAILABLE FILTERS (300+)
 *
 * Each filter definition includes:
 * - field: Database field or calculated metric
 * - label: Human-readable name
 * - category: Filter category
 * - operators: Allowed operators
 * - valueType: Expected value type (string, number, date, boolean, array)
 */
export const AVAILABLE_FILTERS = {

  // ========== DEMOGRAPHIC FILTERS (30+) ==========
  demographic: [
    { field: 'country', label: 'Country', operators: ['equals', 'not_equals', 'in', 'not_in'], valueType: 'string' },
    { field: 'city', label: 'City', operators: ['equals', 'not_equals', 'in', 'not_in', 'contains'], valueType: 'string' },
    { field: 'nationality', label: 'Nationality', operators: ['equals', 'not_equals', 'in', 'not_in'], valueType: 'string' },
    { field: 'language', label: 'Language', operators: ['equals', 'not_equals', 'in', 'not_in'], valueType: 'string' },
    { field: 'currency', label: 'Currency', operators: ['equals', 'not_equals', 'in', 'not_in'], valueType: 'string' },
    { field: 'age', label: 'Age', operators: ['equals', 'greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'gender', label: 'Gender', operators: ['equals', 'not_equals'], valueType: 'string' },
    { field: 'registration_date', label: 'Registration Date', operators: ['between', 'in_last', 'not_in_last'], valueType: 'date' },
    { field: 'account_age_days', label: 'Account Age (days)', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'email_verified', label: 'Email Verified', operators: ['equals'], valueType: 'boolean' },
    { field: 'phone_verified', label: 'Phone Verified', operators: ['equals'], valueType: 'boolean' },
    { field: 'timezone', label: 'Timezone', operators: ['equals', 'in', 'not_in'], valueType: 'string' },
    { field: 'registration_source', label: 'Registration Source', operators: ['equals', 'in', 'not_in'], valueType: 'string' },
    { field: 'registration_device', label: 'Registration Device', operators: ['equals', 'in'], valueType: 'string' },
    { field: 'registration_ip_country', label: 'Registration IP Country', operators: ['equals', 'not_equals', 'in'], valueType: 'string' },
    { field: 'current_ip_country', label: 'Current IP Country', operators: ['equals', 'not_equals', 'in'], valueType: 'string' },
    { field: 'affiliate_id', label: 'Affiliate ID', operators: ['equals', 'is_null', 'is_not_null'], valueType: 'number' },
    { field: 'referral_code', label: 'Referral Code', operators: ['equals', 'is_null', 'is_not_null'], valueType: 'string' },
    { field: 'marketing_consent', label: 'Marketing Consent', operators: ['equals'], valueType: 'boolean' },
    { field: 'sms_consent', label: 'SMS Consent', operators: ['equals'], valueType: 'boolean' },
    { field: 'email_bounced', label: 'Email Bounced', operators: ['equals'], valueType: 'boolean' },
    { field: 'account_status', label: 'Account Status', operators: ['equals', 'in', 'not_in'], valueType: 'string' },
    { field: 'user_tags', label: 'User Tags', operators: ['contains', 'not_contains'], valueType: 'array' },
    { field: 'preferred_contact_method', label: 'Preferred Contact Method', operators: ['equals', 'in'], valueType: 'string' },
    { field: 'postal_code', label: 'Postal Code', operators: ['equals', 'starts_with'], valueType: 'string' },
    { field: 'birth_month', label: 'Birth Month', operators: ['equals', 'in'], valueType: 'number' },
    { field: 'birth_day', label: 'Birth Day', operators: ['equals', 'in'], valueType: 'number' },
    { field: 'occupation', label: 'Occupation', operators: ['equals', 'in', 'contains'], valueType: 'string' },
    { field: 'income_range', label: 'Income Range', operators: ['equals', 'in'], valueType: 'string' },
    { field: 'marital_status', label: 'Marital Status', operators: ['equals', 'in'], valueType: 'string' }
  ],

  // ========== FINANCIAL FILTERS (50+) ==========
  financial: [
    { field: 'current_balance', label: 'Current Balance', operators: ['greater_than', 'less_than', 'between', 'equals'], valueType: 'number' },
    { field: 'bonus_balance', label: 'Bonus Balance', operators: ['greater_than', 'less_than', 'between', 'equals'], valueType: 'number' },
    { field: 'locked_balance', label: 'Locked Balance', operators: ['greater_than', 'less_than', 'equals'], valueType: 'number' },
    { field: 'total_deposited', label: 'Total Deposited', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'total_withdrawn', label: 'Total Withdrawn', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'net_deposits', label: 'Net Deposits', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'deposit_count', label: 'Deposit Count', operators: ['greater_than', 'less_than', 'between', 'equals'], valueType: 'number' },
    { field: 'withdrawal_count', label: 'Withdrawal Count', operators: ['greater_than', 'less_than', 'between', 'equals'], valueType: 'number' },
    { field: 'avg_deposit_amount', label: 'Average Deposit Amount', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'avg_withdrawal_amount', label: 'Average Withdrawal Amount', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'largest_deposit', label: 'Largest Deposit', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'largest_withdrawal', label: 'Largest Withdrawal', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'first_deposit_date', label: 'First Deposit Date', operators: ['between', 'in_last'], valueType: 'date' },
    { field: 'last_deposit_date', label: 'Last Deposit Date', operators: ['between', 'in_last', 'not_in_last'], valueType: 'date' },
    { field: 'last_withdrawal_date', label: 'Last Withdrawal Date', operators: ['between', 'in_last', 'not_in_last'], valueType: 'date' },
    { field: 'days_since_first_deposit', label: 'Days Since First Deposit', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'days_since_last_deposit', label: 'Days Since Last Deposit', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'days_since_last_withdrawal', label: 'Days Since Last Withdrawal', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'deposit_frequency', label: 'Deposit Frequency (days)', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'withdrawal_frequency', label: 'Withdrawal Frequency (days)', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'preferred_payment_method', label: 'Preferred Payment Method', operators: ['equals', 'in', 'not_in'], valueType: 'string' },
    { field: 'deposit_methods_used', label: 'Deposit Methods Used Count', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'has_pending_withdrawal', label: 'Has Pending Withdrawal', operators: ['equals'], valueType: 'boolean' },
    { field: 'pending_withdrawal_amount', label: 'Pending Withdrawal Amount', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'total_bonus_claimed', label: 'Total Bonus Claimed', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'bonus_claim_count', label: 'Bonus Claim Count', operators: ['greater_than', 'less_than', 'equals'], valueType: 'number' },
    { field: 'deposit_to_withdrawal_ratio', label: 'Deposit to Withdrawal Ratio', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'cashout_percentage', label: 'Cashout Percentage', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'ltv', label: 'Lifetime Value (LTV)', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'ggr', label: 'Gross Gaming Revenue (GGR)', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'ngr', label: 'Net Gaming Revenue (NGR)', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'player_value_score', label: 'Player Value Score', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'monthly_deposits', label: 'Monthly Deposits', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'monthly_withdrawals', label: 'Monthly Withdrawals', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'quarterly_deposits', label: 'Quarterly Deposits', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'yearly_deposits', label: 'Yearly Deposits', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'failed_deposit_count', label: 'Failed Deposit Count', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'cancelled_withdrawal_count', label: 'Cancelled Withdrawal Count', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'chargebacks_count', label: 'Chargebacks Count', operators: ['greater_than', 'equals'], valueType: 'number' },
    { field: 'average_balance', label: 'Average Balance', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'balance_volatility', label: 'Balance Volatility', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'withdrawal_success_rate', label: 'Withdrawal Success Rate %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'deposit_success_rate', label: 'Deposit Success Rate %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'crypto_deposits', label: 'Crypto Deposits Count', operators: ['greater_than', 'equals'], valueType: 'number' },
    { field: 'fiat_deposits', label: 'Fiat Deposits Count', operators: ['greater_than', 'equals'], valueType: 'number' },
    { field: 'first_deposit_amount', label: 'First Deposit Amount', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'redeposit_rate', label: 'Redeposit Rate %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'days_between_deposits', label: 'Avg Days Between Deposits', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'balance_trend', label: 'Balance Trend', operators: ['equals'], valueType: 'string' }, // increasing, decreasing, stable
    { field: 'credit_card_deposits', label: 'Credit Card Deposits Count', operators: ['greater_than'], valueType: 'number' }
  ],

  // ========== GAMING FILTERS (60+) ==========
  gaming: [
    { field: 'total_wagered', label: 'Total Wagered', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'total_won', label: 'Total Won', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'total_bets', label: 'Total Bets Count', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'win_loss_ratio', label: 'Win/Loss Ratio', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'avg_bet_amount', label: 'Average Bet Amount', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'largest_bet', label: 'Largest Bet', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'largest_win', label: 'Largest Win', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'win_rate', label: 'Win Rate %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'first_bet_date', label: 'First Bet Date', operators: ['between', 'in_last'], valueType: 'date' },
    { field: 'last_bet_date', label: 'Last Bet Date', operators: ['between', 'in_last', 'not_in_last'], valueType: 'date' },
    { field: 'days_since_first_bet', label: 'Days Since First Bet', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'days_since_last_bet', label: 'Days Since Last Bet', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'betting_frequency', label: 'Betting Frequency (bets/day)', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'favorite_game_category', label: 'Favorite Game Category', operators: ['equals', 'in'], valueType: 'string' },
    { field: 'favorite_game_provider', label: 'Favorite Game Provider', operators: ['equals', 'in'], valueType: 'string' },
    { field: 'favorite_game', label: 'Favorite Game', operators: ['equals', 'in'], valueType: 'string' },
    { field: 'unique_games_played', label: 'Unique Games Played', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'slots_wagered', label: 'Slots Wagered', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'live_casino_wagered', label: 'Live Casino Wagered', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'table_games_wagered', label: 'Table Games Wagered', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'sports_betting_wagered', label: 'Sports Betting Wagered', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'slots_percentage', label: 'Slots Percentage %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'live_casino_percentage', label: 'Live Casino Percentage %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'avg_session_duration', label: 'Avg Session Duration (mins)', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'avg_session_wagered', label: 'Avg Session Wagered', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'total_sessions', label: 'Total Sessions', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'sessions_last_30_days', label: 'Sessions Last 30 Days', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'wagered_last_7_days', label: 'Wagered Last 7 Days', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'wagered_last_30_days', label: 'Wagered Last 30 Days', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'bets_last_7_days', label: 'Bets Last 7 Days', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'bets_last_30_days', label: 'Bets Last 30 Days', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'max_consecutive_wins', label: 'Max Consecutive Wins', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'max_consecutive_losses', label: 'Max Consecutive Losses', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'bet_variance', label: 'Bet Variance', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'preferred_bet_size', label: 'Preferred Bet Size Range', operators: ['equals'], valueType: 'string' }, // micro, small, medium, high, whale
    { field: 'gaming_pattern', label: 'Gaming Pattern', operators: ['equals'], valueType: 'string' }, // casual, regular, hardcore, whale
    { field: 'time_of_day_preference', label: 'Time of Day Preference', operators: ['equals', 'in'], valueType: 'string' },
    { field: 'day_of_week_preference', label: 'Day of Week Preference', operators: ['equals', 'in'], valueType: 'string' },
    { field: 'mobile_gaming_percentage', label: 'Mobile Gaming %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'desktop_gaming_percentage', label: 'Desktop Gaming %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'rtp_preference', label: 'RTP Preference', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'volatility_preference', label: 'Volatility Preference', operators: ['equals'], valueType: 'string' }, // low, medium, high
    { field: 'jackpot_games_played', label: 'Jackpot Games Played', operators: ['greater_than'], valueType: 'number' },
    { field: 'tournament_participation', label: 'Tournament Participation Count', operators: ['greater_than'], valueType: 'number' },
    { field: 'tournament_wins', label: 'Tournament Wins', operators: ['greater_than'], valueType: 'number' },
    { field: 'bonus_games_triggered', label: 'Bonus Games Triggered', operators: ['greater_than'], valueType: 'number' },
    { field: 'free_spins_used', label: 'Free Spins Used', operators: ['greater_than'], valueType: 'number' },
    { field: 'game_diversity_score', label: 'Game Diversity Score', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'provider_loyalty', label: 'Provider Loyalty %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'demo_to_real_ratio', label: 'Demo to Real Play Ratio', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'weekend_wagering_percentage', label: 'Weekend Wagering %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'night_gaming_percentage', label: 'Night Gaming % (10PM-6AM)', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'autoplay_usage', label: 'Autoplay Usage %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'turbo_mode_usage', label: 'Turbo Mode Usage %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'max_bet_usage', label: 'Max Bet Button Usage %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'bet_escalation_pattern', label: 'Bet Escalation Pattern', operators: ['equals'], valueType: 'string' }, // aggressive, moderate, conservative
    { field: 'recovery_betting_detected', label: 'Recovery Betting Detected', operators: ['equals'], valueType: 'boolean' },
    { field: 'chase_losses_indicator', label: 'Chase Losses Indicator', operators: ['equals'], valueType: 'boolean' },
    { field: 'responsible_gaming_limits_set', label: 'RG Limits Set', operators: ['equals'], valueType: 'boolean' },
    { field: 'self_exclusion_history', label: 'Self Exclusion History', operators: ['equals'], valueType: 'boolean' }
  ],

  // ========== VIP & LOYALTY FILTERS (40+) ==========
  vip: [
    { field: 'vip_tier', label: 'VIP Tier', operators: ['equals', 'in', 'not_in', 'greater_than', 'less_than'], valueType: 'string' },
    { field: 'vip_level', label: 'VIP Level', operators: ['equals', 'greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'vip_points', label: 'VIP Points', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'vip_lifetime_points', label: 'VIP Lifetime Points', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'vip_joined_date', label: 'VIP Joined Date', operators: ['between', 'in_last'], valueType: 'date' },
    { field: 'vip_days_active', label: 'VIP Days Active', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'has_account_manager', label: 'Has Account Manager', operators: ['equals'], valueType: 'boolean' },
    { field: 'account_manager_id', label: 'Account Manager', operators: ['equals', 'in'], valueType: 'number' },
    { field: 'vip_benefits_claimed', label: 'VIP Benefits Claimed', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'vip_cashback_claimed', label: 'VIP Cashback Claimed', operators: ['greater_than'], valueType: 'number' },
    { field: 'vip_exclusive_offers_claimed', label: 'VIP Exclusive Offers Claimed', operators: ['greater_than'], valueType: 'number' },
    { field: 'vip_gifts_received', label: 'VIP Gifts Received', operators: ['greater_than'], valueType: 'number' },
    { field: 'vip_tier_upgrade_count', label: 'VIP Tier Upgrades', operators: ['greater_than'], valueType: 'number' },
    { field: 'vip_tier_downgrade_count', label: 'VIP Tier Downgrades', operators: ['greater_than'], valueType: 'number' },
    { field: 'last_tier_change_date', label: 'Last Tier Change Date', operators: ['in_last', 'not_in_last'], valueType: 'date' },
    { field: 'points_to_next_tier', label: 'Points to Next Tier', operators: ['less_than', 'greater_than'], valueType: 'number' },
    { field: 'tier_retention_risk', label: 'Tier Retention Risk', operators: ['equals'], valueType: 'string' }, // low, medium, high
    { field: 'vip_engagement_score', label: 'VIP Engagement Score', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'comp_points', label: 'Comp Points', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'comp_points_redeemed', label: 'Comp Points Redeemed', operators: ['greater_than'], valueType: 'number' },
    { field: 'comp_points_redemption_rate', label: 'Comp Points Redemption Rate %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'loyalty_level', label: 'Loyalty Level', operators: ['equals', 'greater_than', 'less_than'], valueType: 'number' },
    { field: 'loyalty_score', label: 'Loyalty Score', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'loyalty_program_tenure', label: 'Loyalty Program Tenure (days)', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'referral_count', label: 'Referral Count', operators: ['greater_than', 'equals'], valueType: 'number' },
    { field: 'successful_referrals', label: 'Successful Referrals', operators: ['greater_than'], valueType: 'number' },
    { field: 'referral_earnings', label: 'Referral Earnings', operators: ['greater_than'], valueType: 'number' },
    { field: 'is_affiliate', label: 'Is Affiliate', operators: ['equals'], valueType: 'boolean' },
    { field: 'birthday_bonus_claimed', label: 'Birthday Bonus Claimed This Year', operators: ['equals'], valueType: 'boolean' },
    { field: 'anniversary_bonus_claimed', label: 'Anniversary Bonus Claimed', operators: ['equals'], valueType: 'boolean' },
    { field: 'special_events_attended', label: 'Special Events Attended', operators: ['greater_than'], valueType: 'number' },
    { field: 'exclusive_promotions_eligible', label: 'Exclusive Promotions Eligible Count', operators: ['greater_than'], valueType: 'number' },
    { field: 'cashback_percentage', label: 'Cashback Percentage', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'monthly_cashback_amount', label: 'Monthly Cashback Amount', operators: ['greater_than'], valueType: 'number' },
    { field: 'rakeback_percentage', label: 'Rakeback Percentage', operators: ['greater_than'], valueType: 'number' },
    { field: 'personal_bonus_multiplier', label: 'Personal Bonus Multiplier', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'faster_withdrawal_eligible', label: 'Faster Withdrawal Eligible', operators: ['equals'], valueType: 'boolean' },
    { field: 'higher_limits_eligible', label: 'Higher Limits Eligible', operators: ['equals'], valueType: 'boolean' },
    { field: 'dedicated_support_eligible', label: 'Dedicated Support Eligible', operators: ['equals'], valueType: 'boolean' },
    { field: 'invitations_to_events', label: 'Invitations to Events Count', operators: ['greater_than'], valueType: 'number' }
  ],

  // ========== RISK & COMPLIANCE FILTERS (30+) ==========
  risk: [
    { field: 'kyc_status', label: 'KYC Status', operators: ['equals', 'in', 'not_in'], valueType: 'string' },
    { field: 'kyc_verification_level', label: 'KYC Verification Level', operators: ['equals', 'greater_than', 'less_than'], valueType: 'number' },
    { field: 'is_kyc_verified', label: 'Is KYC Verified', operators: ['equals'], valueType: 'boolean' },
    { field: 'kyc_verified_date', label: 'KYC Verified Date', operators: ['between', 'in_last'], valueType: 'date' },
    { field: 'kyc_documents_pending', label: 'KYC Documents Pending', operators: ['greater_than'], valueType: 'number' },
    { field: 'kyc_documents_rejected', label: 'KYC Documents Rejected', operators: ['greater_than'], valueType: 'number' },
    { field: 'aml_risk_score', label: 'AML Risk Score', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'aml_risk_level', label: 'AML Risk Level', operators: ['equals', 'in'], valueType: 'string' }, // low, medium, high, critical
    { field: 'pep_status', label: 'PEP Status', operators: ['equals'], valueType: 'boolean' },
    { field: 'sanctions_list_match', label: 'Sanctions List Match', operators: ['equals'], valueType: 'boolean' },
    { field: 'fraud_score', label: 'Fraud Score', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'fraud_flags', label: 'Fraud Flags Count', operators: ['greater_than', 'equals'], valueType: 'number' },
    { field: 'multi_account_risk', label: 'Multi-Account Risk', operators: ['equals'], valueType: 'string' }, // none, low, medium, high
    { field: 'ip_changes_count', label: 'IP Changes Count', operators: ['greater_than'], valueType: 'number' },
    { field: 'suspicious_activity_flags', label: 'Suspicious Activity Flags', operators: ['greater_than'], valueType: 'number' },
    { field: 'churn_risk_score', label: 'Churn Risk Score', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'churn_risk_level', label: 'Churn Risk Level', operators: ['equals', 'in'], valueType: 'string' }, // low, medium, high, critical
    { field: 'churn_risk_factors', label: 'Churn Risk Factors', operators: ['contains'], valueType: 'array' },
    { field: 'engagement_score', label: 'Engagement Score', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'activity_level', label: 'Activity Level', operators: ['equals'], valueType: 'string' }, // dormant, low, medium, high, very_high
    { field: 'problem_gambling_indicators', label: 'Problem Gambling Indicators', operators: ['greater_than'], valueType: 'number' },
    { field: 'responsible_gaming_alerts', label: 'Responsible Gaming Alerts', operators: ['greater_than'], valueType: 'number' },
    { field: 'deposit_limit_breaches', label: 'Deposit Limit Breaches', operators: ['greater_than'], valueType: 'number' },
    { field: 'loss_limit_breaches', label: 'Loss Limit Breaches', operators: ['greater_than'], valueType: 'number' },
    { field: 'session_limit_breaches', label: 'Session Limit Breaches', operators: ['greater_than'], valueType: 'number' },
    { field: 'cooling_off_periods', label: 'Cooling Off Periods Count', operators: ['greater_than'], valueType: 'number' },
    { field: 'self_exclusion_requests', label: 'Self Exclusion Requests', operators: ['greater_than'], valueType: 'number' },
    { field: 'currently_self_excluded', label: 'Currently Self Excluded', operators: ['equals'], valueType: 'boolean' },
    { field: 'reality_check_frequency', label: 'Reality Check Frequency', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'account_restrictions', label: 'Has Account Restrictions', operators: ['equals'], valueType: 'boolean' }
  ],

  // ========== ENGAGEMENT & COMMUNICATION FILTERS (40+) ==========
  engagement: [
    { field: 'last_login_date', label: 'Last Login Date', operators: ['between', 'in_last', 'not_in_last'], valueType: 'date' },
    { field: 'days_since_last_login', label: 'Days Since Last Login', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'login_frequency', label: 'Login Frequency (days)', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'total_logins', label: 'Total Logins', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'logins_last_7_days', label: 'Logins Last 7 Days', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'logins_last_30_days', label: 'Logins Last 30 Days', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'avg_session_duration_total', label: 'Avg Session Duration Total (mins)', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'total_time_spent', label: 'Total Time Spent (hours)', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'email_open_rate', label: 'Email Open Rate %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'email_click_rate', label: 'Email Click Rate %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'emails_sent', label: 'Emails Sent Count', operators: ['greater_than'], valueType: 'number' },
    { field: 'emails_opened', label: 'Emails Opened Count', operators: ['greater_than'], valueType: 'number' },
    { field: 'emails_clicked', label: 'Emails Clicked Count', operators: ['greater_than'], valueType: 'number' },
    { field: 'last_email_opened_date', label: 'Last Email Opened Date', operators: ['in_last', 'not_in_last'], valueType: 'date' },
    { field: 'sms_sent', label: 'SMS Sent Count', operators: ['greater_than'], valueType: 'number' },
    { field: 'sms_clicked', label: 'SMS Clicked Count', operators: ['greater_than'], valueType: 'number' },
    { field: 'push_notifications_sent', label: 'Push Notifications Sent', operators: ['greater_than'], valueType: 'number' },
    { field: 'push_notifications_opened', label: 'Push Notifications Opened', operators: ['greater_than'], valueType: 'number' },
    { field: 'communication_response_rate', label: 'Communication Response Rate %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'unsubscribed_from_email', label: 'Unsubscribed From Email', operators: ['equals'], valueType: 'boolean' },
    { field: 'unsubscribed_from_sms', label: 'Unsubscribed From SMS', operators: ['equals'], valueType: 'boolean' },
    { field: 'support_tickets_count', label: 'Support Tickets Count', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'open_support_tickets', label: 'Open Support Tickets', operators: ['greater_than', 'equals'], valueType: 'number' },
    { field: 'resolved_support_tickets', label: 'Resolved Support Tickets', operators: ['greater_than'], valueType: 'number' },
    { field: 'avg_ticket_resolution_time', label: 'Avg Ticket Resolution Time (hours)', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'last_support_ticket_date', label: 'Last Support Ticket Date', operators: ['in_last', 'not_in_last'], valueType: 'date' },
    { field: 'support_ticket_satisfaction', label: 'Support Ticket Satisfaction Avg', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'complaints_count', label: 'Complaints Count', operators: ['greater_than'], valueType: 'number' },
    { field: 'unresolved_complaints', label: 'Unresolved Complaints', operators: ['greater_than'], valueType: 'number' },
    { field: 'live_chat_sessions', label: 'Live Chat Sessions', operators: ['greater_than'], valueType: 'number' },
    { field: 'last_chat_date', label: 'Last Chat Date', operators: ['in_last', 'not_in_last'], valueType: 'date' },
    { field: 'promotion_participation_rate', label: 'Promotion Participation Rate %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'promotions_claimed', label: 'Promotions Claimed', operators: ['greater_than'], valueType: 'number' },
    { field: 'last_promotion_claimed_date', label: 'Last Promotion Claimed Date', operators: ['in_last', 'not_in_last'], valueType: 'date' },
    { field: 'survey_responses', label: 'Survey Responses Count', operators: ['greater_than'], valueType: 'number' },
    { field: 'feedback_submitted', label: 'Feedback Submitted Count', operators: ['greater_than'], valueType: 'number' },
    { field: 'nps_score', label: 'NPS Score', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'csat_score', label: 'CSAT Score', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'app_downloads', label: 'Has Downloaded App', operators: ['equals'], valueType: 'boolean' },
    { field: 'social_media_connected', label: 'Social Media Connected', operators: ['equals'], valueType: 'boolean' }
  ],

  // ========== TEMPORAL FILTERS (30+) ==========
  temporal: [
    { field: 'active_today', label: 'Active Today', operators: ['equals'], valueType: 'boolean' },
    { field: 'active_yesterday', label: 'Active Yesterday', operators: ['equals'], valueType: 'boolean' },
    { field: 'active_last_7_days', label: 'Active Last 7 Days', operators: ['equals'], valueType: 'boolean' },
    { field: 'active_last_30_days', label: 'Active Last 30 Days', operators: ['equals'], valueType: 'boolean' },
    { field: 'dormant_days', label: 'Dormant Days', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'is_dormant', label: 'Is Dormant (30+ days)', operators: ['equals'], valueType: 'boolean' },
    { field: 'reactivated_in_last_30_days', label: 'Reactivated in Last 30 Days', operators: ['equals'], valueType: 'boolean' },
    { field: 'new_player', label: 'New Player (< 7 days)', operators: ['equals'], valueType: 'boolean' },
    { field: 'player_lifecycle_stage', label: 'Player Lifecycle Stage', operators: ['equals', 'in'], valueType: 'string' }, // new, active, engaged, at_risk, dormant, churned
    { field: 'cohort_month', label: 'Registration Month Cohort', operators: ['equals', 'in'], valueType: 'string' },
    { field: 'cohort_year', label: 'Registration Year Cohort', operators: ['equals', 'in'], valueType: 'number' },
    { field: 'deposit_made_today', label: 'Deposit Made Today', operators: ['equals'], valueType: 'boolean' },
    { field: 'deposit_made_yesterday', label: 'Deposit Made Yesterday', operators: ['equals'], valueType: 'boolean' },
    { field: 'deposit_made_last_7_days', label: 'Deposit Made Last 7 Days', operators: ['equals'], valueType: 'boolean' },
    { field: 'deposit_made_last_30_days', label: 'Deposit Made Last 30 Days', operators: ['equals'], valueType: 'boolean' },
    { field: 'no_deposit_in_30_days', label: 'No Deposit in 30+ Days', operators: ['equals'], valueType: 'boolean' },
    { field: 'no_deposit_in_60_days', label: 'No Deposit in 60+ Days', operators: ['equals'], valueType: 'boolean' },
    { field: 'first_deposit_today', label: 'First Deposit Today', operators: ['equals'], valueType: 'boolean' },
    { field: 'first_deposit_yesterday', label: 'First Deposit Yesterday', operators: ['equals'], valueType: 'boolean' },
    { field: 'first_deposit_last_7_days', label: 'First Deposit Last 7 Days', operators: ['equals'], valueType: 'boolean' },
    { field: 'bet_placed_today', label: 'Bet Placed Today', operators: ['equals'], valueType: 'boolean' },
    { field: 'bet_placed_yesterday', label: 'Bet Placed Yesterday', operators: ['equals'], valueType: 'boolean' },
    { field: 'bet_placed_last_7_days', label: 'Bet Placed Last 7 Days', operators: ['equals'], valueType: 'boolean' },
    { field: 'no_bet_in_7_days', label: 'No Bet in 7+ Days', operators: ['equals'], valueType: 'boolean' },
    { field: 'no_bet_in_30_days', label: 'No Bet in 30+ Days', operators: ['equals'], valueType: 'boolean' },
    { field: 'won_big_today', label: 'Won Big Today (>$500)', operators: ['equals'], valueType: 'boolean' },
    { field: 'lost_big_today', label: 'Lost Big Today (>$500)', operators: ['equals'], valueType: 'boolean' },
    { field: 'birthday_this_month', label: 'Birthday This Month', operators: ['equals'], valueType: 'boolean' },
    { field: 'anniversary_this_month', label: 'Anniversary This Month', operators: ['equals'], valueType: 'boolean' },
    { field: 'days_until_birthday', label: 'Days Until Birthday', operators: ['less_than'], valueType: 'number' }
  ],

  // ========== ADVANCED INTELLIGENCE & PREDICTION (50+) ==========
  custom: [
    // Player Intelligence & ML Scores
    { field: 'player_intelligence_score', label: 'Player Intelligence Score (AI)', operators: ['greater_than', 'less_than', 'between'], valueType: 'number' },
    { field: 'predicted_ltv_next_90_days', label: 'Predicted LTV Next 90 Days', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'predicted_churn_probability', label: 'Predicted Churn Probability %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'predicted_next_deposit_amount', label: 'Predicted Next Deposit Amount', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'predicted_next_deposit_days', label: 'Predicted Next Deposit in X Days', operators: ['less_than', 'between'], valueType: 'number' },
    { field: 'whale_probability_score', label: 'Whale Probability Score %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'bonus_hunter_score', label: 'Bonus Hunter Score (0-100)', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'professional_gambler_indicator', label: 'Professional Gambler Indicator', operators: ['equals'], valueType: 'boolean' },
    { field: 'arbitrage_betting_detected', label: 'Arbitrage Betting Detected', operators: ['equals'], valueType: 'boolean' },
    { field: 'card_counter_probability', label: 'Card Counter Probability %', operators: ['greater_than'], valueType: 'number' },

    // Cross-Platform & Device Intelligence
    { field: 'devices_used_count', label: 'Devices Used Count', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'browsers_used_count', label: 'Browsers Used Count', operators: ['greater_than'], valueType: 'number' },
    { field: 'locations_played_from', label: 'Locations Played From Count', operators: ['greater_than'], valueType: 'number' },
    { field: 'vpn_usage_detected', label: 'VPN Usage Detected', operators: ['equals'], valueType: 'boolean' },
    { field: 'tor_usage_detected', label: 'TOR Usage Detected', operators: ['equals'], valueType: 'boolean' },
    { field: 'proxy_usage_detected', label: 'Proxy Usage Detected', operators: ['equals'], valueType: 'boolean' },
    { field: 'device_fingerprint_changes', label: 'Device Fingerprint Changes', operators: ['greater_than'], valueType: 'number' },
    { field: 'cross_device_sessions', label: 'Cross-Device Sessions %', operators: ['greater_than'], valueType: 'number' },
    { field: 'simultaneous_logins_detected', label: 'Simultaneous Logins Detected', operators: ['equals'], valueType: 'boolean' },
    { field: 'app_vs_web_preference', label: 'App vs Web Preference %', operators: ['greater_than', 'less_than'], valueType: 'number' },

    // Advanced Financial Behavior
    { field: 'deposit_pattern_volatility', label: 'Deposit Pattern Volatility', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'unusual_deposit_pattern', label: 'Unusual Deposit Pattern Detected', operators: ['equals'], valueType: 'boolean' },
    { field: 'structured_deposits_indicator', label: 'Structured Deposits Indicator', operators: ['equals'], valueType: 'boolean' },
    { field: 'round_number_deposits_ratio', label: 'Round Number Deposits Ratio %', operators: ['greater_than'], valueType: 'number' },
    { field: 'micro_deposits_count', label: 'Micro Deposits Count (<$10)', operators: ['greater_than'], valueType: 'number' },
    { field: 'mega_deposits_count', label: 'Mega Deposits Count (>$10k)', operators: ['greater_than'], valueType: 'number' },
    { field: 'deposit_spike_events', label: 'Deposit Spike Events Count', operators: ['greater_than'], valueType: 'number' },
    { field: 'withdrawal_after_big_win_speed', label: 'Withdrawal After Big Win Speed (hours)', operators: ['less_than', 'greater_than'], valueType: 'number' },
    { field: 'cashout_timing_pattern', label: 'Cashout Timing Pattern', operators: ['equals'], valueType: 'string' }, // instant, delayed, strategic
    { field: 'balance_manipulation_score', label: 'Balance Manipulation Score', operators: ['greater_than'], valueType: 'number' },

    // Game-Specific Intelligence
    { field: 'roulette_system_detected', label: 'Roulette System Detected', operators: ['equals'], valueType: 'string' }, // martingale, fibonacci, labouchere, none
    { field: 'blackjack_basic_strategy_adherence', label: 'Blackjack Basic Strategy Adherence %', operators: ['greater_than'], valueType: 'number' },
    { field: 'poker_skill_rating', label: 'Poker Skill Rating (1-10)', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'slot_game_hopping_frequency', label: 'Slot Game Hopping Frequency', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'progressive_jackpot_hunter', label: 'Progressive Jackpot Hunter', operators: ['equals'], valueType: 'boolean' },
    { field: 'high_rtp_games_preference', label: 'High RTP Games Preference %', operators: ['greater_than'], valueType: 'number' },
    { field: 'new_games_adoption_rate', label: 'New Games Adoption Rate', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'game_testing_behavior', label: 'Game Testing Behavior', operators: ['equals'], valueType: 'boolean' },
    { field: 'bet_size_per_bankroll_ratio', label: 'Bet Size per Bankroll Ratio %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'kelly_criterion_adherence', label: 'Kelly Criterion Adherence', operators: ['equals'], valueType: 'boolean' },

    // Social & Network Analysis
    { field: 'social_network_size', label: 'Social Network Size (referred players)', operators: ['greater_than'], valueType: 'number' },
    { field: 'network_revenue_contribution', label: 'Network Revenue Contribution', operators: ['greater_than'], valueType: 'number' },
    { field: 'influencer_potential_score', label: 'Influencer Potential Score', operators: ['greater_than'], valueType: 'number' },
    { field: 'community_engagement_level', label: 'Community Engagement Level', operators: ['equals', 'in'], valueType: 'string' },
    { field: 'forum_posts_count', label: 'Forum Posts Count', operators: ['greater_than'], valueType: 'number' },
    { field: 'game_reviews_submitted', label: 'Game Reviews Submitted', operators: ['greater_than'], valueType: 'number' },
    { field: 'chat_activity_level', label: 'Chat Activity Level', operators: ['equals'], valueType: 'string' },
    { field: 'social_sharing_frequency', label: 'Social Sharing Frequency', operators: ['greater_than'], valueType: 'number' },

    // Seasonal & Timing Intelligence
    { field: 'holiday_spending_multiplier', label: 'Holiday Spending Multiplier', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'weekend_activity_ratio', label: 'Weekend Activity Ratio %', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'payday_correlation_score', label: 'Payday Correlation Score', operators: ['greater_than'], valueType: 'number' },
    { field: 'late_night_gaming_percentage', label: 'Late Night Gaming % (12AM-6AM)', operators: ['greater_than'], valueType: 'number' },
    { field: 'early_morning_gaming_percentage', label: 'Early Morning Gaming % (6AM-9AM)', operators: ['greater_than'], valueType: 'number' },
    { field: 'seasonal_player_type', label: 'Seasonal Player Type', operators: ['equals'], valueType: 'string' }, // christmas, summer, sports_events
    { field: 'weather_correlation_score', label: 'Weather Correlation Score', operators: ['greater_than'], valueType: 'number' },

    // Lifetime & Cohort Analysis
    { field: 'lifetime_months_active', label: 'Lifetime Months Active', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'months_since_registration', label: 'Months Since Registration', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'cohort_performance_percentile', label: 'Cohort Performance Percentile', operators: ['greater_than', 'less_than'], valueType: 'number' },
    { field: 'retention_cohort_day_7', label: 'Retention Cohort Day 7', operators: ['equals'], valueType: 'boolean' },
    { field: 'retention_cohort_day_30', label: 'Retention Cohort Day 30', operators: ['equals'], valueType: 'boolean' },
    { field: 'retention_cohort_day_90', label: 'Retention Cohort Day 90', operators: ['equals'], valueType: 'boolean' },
    { field: 'expected_lifetime_remaining_days', label: 'Expected Lifetime Remaining (days)', operators: ['greater_than', 'less_than'], valueType: 'number' },

    // Advanced Tags & Manual Flags
    { field: 'internal_notes_contain', label: 'Internal Notes Contain', operators: ['contains', 'not_contains'], valueType: 'string' },
    { field: 'tagged_as_vip_manually', label: 'Tagged as VIP Manually', operators: ['equals'], valueType: 'boolean' },
    { field: 'tagged_as_whale', label: 'Tagged as Whale', operators: ['equals'], valueType: 'boolean' },
    { field: 'tagged_as_high_risk', label: 'Tagged as High Risk', operators: ['equals'], valueType: 'boolean' },
    { field: 'tagged_as_loyal', label: 'Tagged as Loyal', operators: ['equals'], valueType: 'boolean' },
    { field: 'blacklisted', label: 'Blacklisted', operators: ['equals'], valueType: 'boolean' },
    { field: 'whitelisted', label: 'Whitelisted', operators: ['equals'], valueType: 'boolean' },
    { field: 'priority_player', label: 'Priority Player', operators: ['equals'], valueType: 'boolean' },
    { field: 'requires_manual_approval', label: 'Requires Manual Approval', operators: ['equals'], valueType: 'boolean' },
    { field: 'test_account', label: 'Test Account', operators: ['equals'], valueType: 'boolean' },
    { field: 'influencer', label: 'Influencer', operators: ['equals'], valueType: 'boolean' },
    { field: 'streamer', label: 'Streamer', operators: ['equals'], valueType: 'boolean' },
    { field: 'corporate_account', label: 'Corporate Account', operators: ['equals'], valueType: 'boolean' },
    { field: 'special_status', label: 'Special Status', operators: ['equals', 'in'], valueType: 'string' },
    { field: 'internal_rating', label: 'Internal Rating (1-10)', operators: ['equals', 'greater_than', 'less_than'], valueType: 'number' },
    { field: 'competitor_analysis_flag', label: 'Competitor Analysis Flag', operators: ['equals'], valueType: 'boolean' },
    { field: 'regulatory_watchlist', label: 'Regulatory Watchlist', operators: ['equals'], valueType: 'boolean' },
    { field: 'vip_tier_upgrade_pending', label: 'VIP Tier Upgrade Pending', operators: ['equals'], valueType: 'boolean' },
    { field: 'manual_review_required', label: 'Manual Review Required', operators: ['equals'], valueType: 'boolean' }
  ]
};

class SegmentationService {

  /**
   * Get all available filters with metadata
   */
  async getAvailableFilters() {
    const allFilters = [];

    for (const [category, filters] of Object.entries(AVAILABLE_FILTERS)) {
      filters.forEach(filter => {
        allFilters.push({
          ...filter,
          category
        });
      });
    }

    return {
      total: allFilters.length,
      categories: Object.keys(AVAILABLE_FILTERS),
      filters: allFilters
    };
  }

  /**
   * Build SQL WHERE clause from filters
   */
  private buildWhereClause(filters: SegmentFilter[]): { where: string; params: any[] } {
    if (!filters || filters.length === 0) {
      return { where: '1=1', params: [] };
    }

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;

    filters.forEach((filter, index) => {
      const logic = index === 0 ? '' : ` ${filter.logicOperator || 'AND'} `;
      const condition = this.buildCondition(filter, paramCounter);

      if (condition) {
        conditions.push(logic + condition.sql);
        params.push(...condition.params);
        paramCounter += condition.params.length;
      }
    });

    return {
      where: conditions.join(''),
      params
    };
  }

  /**
   * Build individual filter condition
   */
  private buildCondition(filter: SegmentFilter, startParam: number): { sql: string; params: any[] } | null {
    const { field, operator, value } = filter;
    const params: any[] = [];
    let sql = '';

    // Map filter fields to actual database columns/calculations
    const fieldMap = this.getFieldMapping(field);

    switch (operator) {
      case FilterOperator.EQUALS:
        sql = `${fieldMap} = $${startParam}`;
        params.push(value);
        break;

      case FilterOperator.NOT_EQUALS:
        sql = `${fieldMap} != $${startParam}`;
        params.push(value);
        break;

      case FilterOperator.GREATER_THAN:
        sql = `${fieldMap} > $${startParam}`;
        params.push(value);
        break;

      case FilterOperator.GREATER_THAN_OR_EQUAL:
        sql = `${fieldMap} >= $${startParam}`;
        params.push(value);
        break;

      case FilterOperator.LESS_THAN:
        sql = `${fieldMap} < $${startParam}`;
        params.push(value);
        break;

      case FilterOperator.LESS_THAN_OR_EQUAL:
        sql = `${fieldMap} <= $${startParam}`;
        params.push(value);
        break;

      case FilterOperator.BETWEEN:
        sql = `${fieldMap} BETWEEN $${startParam} AND $${startParam + 1}`;
        params.push(value[0], value[1]);
        break;

      case FilterOperator.IN:
        const inPlaceholders = value.map((_: any, i: number) => `$${startParam + i}`).join(', ');
        sql = `${fieldMap} IN (${inPlaceholders})`;
        params.push(...value);
        break;

      case FilterOperator.NOT_IN:
        const notInPlaceholders = value.map((_: any, i: number) => `$${startParam + i}`).join(', ');
        sql = `${fieldMap} NOT IN (${notInPlaceholders})`;
        params.push(...value);
        break;

      case FilterOperator.CONTAINS:
        sql = `${fieldMap} ILIKE $${startParam}`;
        params.push(`%${value}%`);
        break;

      case FilterOperator.NOT_CONTAINS:
        sql = `${fieldMap} NOT ILIKE $${startParam}`;
        params.push(`%${value}%`);
        break;

      case FilterOperator.STARTS_WITH:
        sql = `${fieldMap} ILIKE $${startParam}`;
        params.push(`${value}%`);
        break;

      case FilterOperator.ENDS_WITH:
        sql = `${fieldMap} ILIKE $${startParam}`;
        params.push(`%${value}`);
        break;

      case FilterOperator.IS_NULL:
        sql = `${fieldMap} IS NULL`;
        break;

      case FilterOperator.IS_NOT_NULL:
        sql = `${fieldMap} IS NOT NULL`;
        break;

      case FilterOperator.IN_LAST:
        // value should be {amount: number, unit: 'days'|'hours'|'months'}
        sql = `${fieldMap} >= NOW() - INTERVAL '${value.amount} ${value.unit}'`;
        break;

      case FilterOperator.NOT_IN_LAST:
        sql = `${fieldMap} < NOW() - INTERVAL '${value.amount} ${value.unit}'`;
        break;

      default:
        return null;
    }

    return { sql, params };
  }

  /**
   * Map filter field names to actual database columns or calculations
   */
  private getFieldMapping(field: string): string {
    const mappings: { [key: string]: string } = {
      // Demographic
      'country': 'up.country',
      'city': 'up.city',
      'nationality': 'up.nationality',
      'language': 'up.language',
      'currency': 'up.currency',
      'age': 'EXTRACT(YEAR FROM AGE(up.date_of_birth))',
      'registration_date': 'u.created_at',
      'account_age_days': 'EXTRACT(DAY FROM NOW() - u.created_at)',
      'email_verified': 'u.email_verified',
      'phone_verified': 'u.phone_verified',
      'account_status': 's.name',

      // Financial
      'current_balance': 'ub.balance',
      'bonus_balance': 'ub.bonus_balance',
      'locked_balance': 'ub.locked_balance',
      'total_deposited': 'fin.total_deposited',
      'total_withdrawn': 'fin.total_withdrawn',
      'net_deposits': '(fin.total_deposited - fin.total_withdrawn)',
      'deposit_count': 'fin.deposit_count',
      'withdrawal_count': 'fin.withdrawal_count',
      'avg_deposit_amount': '(fin.total_deposited / NULLIF(fin.deposit_count, 0))',
      'last_deposit_date': 'fin.last_deposit_date',
      'days_since_last_deposit': 'EXTRACT(DAY FROM NOW() - fin.last_deposit_date)',

      // Gaming
      'total_wagered': 'gaming.total_wagered',
      'total_won': 'gaming.total_won',
      'total_bets': 'gaming.total_bets',
      'win_loss_ratio': '(gaming.total_won / NULLIF(gaming.total_wagered, 0))',
      'avg_bet_amount': '(gaming.total_wagered / NULLIF(gaming.total_bets, 0))',
      'last_bet_date': 'gaming.last_bet_date',
      'days_since_last_bet': 'EXTRACT(DAY FROM NOW() - gaming.last_bet_date)',
      'ggr': '(gaming.total_wagered - gaming.total_won)',

      // VIP
      'vip_tier': 'vt.name',
      'vip_level': 'vt.level',
      'vip_points': 'uvs.points',
      'vip_lifetime_points': 'uvs.lifetime_points',
      'has_account_manager': 'CASE WHEN vpa.manager_id IS NOT NULL THEN true ELSE false END',

      // Risk
      'kyc_status': 'u.kyc_status',
      'kyc_verified': 'u.kyc_verified',
      'is_2fa_enabled': 'u.is_2fa_enabled',
      'kyc_verification_level': 'kyc.verification_level',
      'is_kyc_verified': 'kyc.is_verified',
      'churn_risk_score': 'cr.churn_score',
      'churn_risk_level': 'cr.risk_level',
      'engagement_score': 'cr.engagement_score',

      // Engagement
      'last_login_date': 'up.last_login_at',
      'days_since_last_login': 'EXTRACT(DAY FROM NOW() - up.last_login_at)',
      'last_activity_at': 'up.last_activity_at',

      // Temporal
      'active_last_7_days': '(up.last_activity_at >= NOW() - INTERVAL \'7 days\')',
      'active_last_30_days': '(up.last_activity_at >= NOW() - INTERVAL \'30 days\')',
      'is_dormant': '(up.last_activity_at < NOW() - INTERVAL \'30 days\')',
      'new_player': '(u.created_at >= NOW() - INTERVAL \'7 days\')',

      // Custom tags
      'user_tags': 'ARRAY(SELECT pt.name FROM user_tags ut JOIN player_tags pt ON ut.tag_id = pt.id WHERE ut.user_id = u.id)'
    };

    return mappings[field] || field;
  }

  /**
   * Apply segment filters and return matching player IDs
   */
  async applySegment(filters: SegmentFilter[], limit: number = 10000): Promise<number[]> {
    const { where, params } = this.buildWhereClause(filters);

    const query = `
      SELECT DISTINCT u.id
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      LEFT JOIN user_vip_status uvs ON u.id = uvs.user_id
      LEFT JOIN vip_tiers vt ON uvs.current_tier_id = vt.id
      WHERE ${where}
      LIMIT $${params.length + 1}
    `;

    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows.map(row => row.id);
  }

  /**
   * Get detailed players from segment
   */
  async getSegmentPlayers(filters: SegmentFilter[], page: number = 1, limit: number = 100) {
    const { where, params } = this.buildWhereClause(filters);
    const offset = (page - 1) * limit;

    const query = `
      SELECT DISTINCT ON (u.id)
        u.id,
        u.username,
        u.email,
        COALESCE(up.country, 'Unknown') as country,
        COALESCE(ub.balance, 0) as current_balance,
        COALESCE(vt.name, 'Standard') as vip_tier
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      LEFT JOIN user_vip_status uvs ON u.id = uvs.user_id
      LEFT JOIN vip_tiers vt ON uvs.current_tier_id = vt.id
      WHERE ${where}
      ORDER BY u.id DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      LEFT JOIN user_vip_status uvs ON u.id = uvs.user_id
      LEFT JOIN vip_tiers vt ON uvs.current_tier_id = vt.id
      WHERE ${where}
    `;

    params.push(limit, offset);

    const [players, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2))
    ]);

    return {
      players: players.rows,
      total: parseInt(countResult.rows[0]?.total || '0'),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0]?.total || '0') / limit)
    };
  }

  /**
   * Save segment to database
   */
  async saveSegment(segment: PlayerSegment): Promise<number> {
    const query = `
      INSERT INTO advanced_segments (name, description, filters, created_by, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const result = await pool.query(query, [
      segment.name,
      segment.description || null,
      JSON.stringify(segment.filters),
      segment.created_by || null,
      segment.is_active !== false
    ]);

    return result.rows[0].id;
  }

  /**
   * Get saved segments
   */
  async getSavedSegments(): Promise<PlayerSegment[]> {
    const query = `
      SELECT
        id,
        name,
        description,
        filters,
        created_by,
        created_at,
        updated_at,
        is_active,
        player_count
      FROM advanced_segments
      WHERE is_active = true
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query);
    return result.rows.map(row => ({
      ...row,
      filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters
    }));
  }

  /**
   * Update segment player count
   */
  async updateSegmentPlayerCount(segmentId: number, playerIds: number[]): Promise<void> {
    const query = `
      UPDATE advanced_segments
      SET player_count = $1, last_refreshed_at = NOW(), updated_at = NOW()
      WHERE id = $2
    `;

    await pool.query(query, [playerIds.length, segmentId]);
  }
}

export default new SegmentationService();

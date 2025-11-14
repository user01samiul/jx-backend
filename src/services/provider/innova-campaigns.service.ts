/**
 * Innova Campaigns API Service
 *
 * Manages free spins campaigns through Innova Gaming Platform API.
 * Handles creation, player management, and tracking of free spin campaigns.
 *
 * API Documentation: /InnovaSDK/campaigns-api-docs-v0.5.pdf
 */

import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { env } from '../../configs/env';

// Configuration
const INNOVA_CAMPAIGNS_CONFIG = {
  baseUrl: process.env.INNOVA_API_HOST || 'https://ttlive.me',
  operatorId: env.SUPPLIER_OPERATOR_ID,
  secretKey: env.SUPPLIER_SECRET_KEY,
  timeout: 30000
};

// Types
export interface CampaignGame {
  game_id: number;
  total_bet: number;
}

export interface CreateCampaignRequest {
  vendor: string;
  campaign_code: string;
  currency_code: string;
  freespins_per_player: number;
  begins_at: number; // Unix timestamp
  expires_at: number; // Unix timestamp
  games: CampaignGame[];
  players?: string[] | string;
}

export interface CampaignResponse {
  status: string;
  data?: any;
  first_page_url?: string;
  next_page_url?: string;
  prev_page_url?: string;
}

export interface AddPlayersRequest {
  campaign_code: string;
  players: string[] | string;
}

export interface RemovePlayersRequest {
  campaign_code: string;
  players: string[] | string;
}

export interface CancelCampaignRequest {
  campaign_code: string;
}

/**
 * Innova Campaigns API Service
 */
class InnovaCampaignsService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: INNOVA_CAMPAIGNS_CONFIG.baseUrl,
      timeout: INNOVA_CAMPAIGNS_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for authentication
    this.axiosInstance.interceptors.request.use((config) => {
      const authHash = this.generateAuthorizationHash();
      config.headers['X-Authorization'] = authHash;
      config.headers['X-Operator-Id'] = INNOVA_CAMPAIGNS_CONFIG.operatorId;
      return config;
    });
  }

  /**
   * Generate authorization hash for Innova Campaigns API
   * Format: sha1('campaigns' + operatorId + secretKey)
   */
  private generateAuthorizationHash(): string {
    const payload = 'campaigns' + INNOVA_CAMPAIGNS_CONFIG.operatorId + INNOVA_CAMPAIGNS_CONFIG.secretKey;
    return crypto.createHash('sha1').update(payload).digest('hex');
  }

  /**
   * List supported vendors
   */
  async listVendors(): Promise<string[]> {
    try {
      console.log('[INNOVA_CAMPAIGNS] Fetching vendors list');
      const response = await this.axiosInstance.get<CampaignResponse>('/api/generic/campaigns/vendors');

      if (response.data.status === 'OK' && response.data.data) {
        console.log('[INNOVA_CAMPAIGNS] Vendors fetched:', response.data.data);
        return response.data.data;
      }

      throw new Error('Failed to fetch vendors list');
    } catch (error: any) {
      console.error('[INNOVA_CAMPAIGNS] Error fetching vendors:', error.message);
      throw error;
    }
  }

  /**
   * Get game limits for campaigns
   */
  async getGameLimits(vendors?: string[], games?: number[], currencies?: string[]): Promise<any> {
    try {
      const params: any = {};
      if (vendors && vendors.length > 0) params.vendors = vendors.join(',');
      if (games && games.length > 0) params.games = games.join(',');
      if (currencies && currencies.length > 0) params.currencies = currencies.join(',');

      console.log('[INNOVA_CAMPAIGNS] Fetching game limits with params:', params);

      const response = await this.axiosInstance.get<CampaignResponse>(
        '/api/generic/campaigns/vendors/limits',
        { params }
      );

      if (response.data.status === 'OK') {
        console.log('[INNOVA_CAMPAIGNS] Game limits fetched, count:', response.data.data?.length || 0);
        return response.data.data;
      }

      throw new Error('Failed to fetch game limits');
    } catch (error: any) {
      console.error('[INNOVA_CAMPAIGNS] Error fetching game limits:', error.message);
      throw error;
    }
  }

  /**
   * List campaigns with optional filters
   */
  async listCampaigns(filters?: {
    vendors?: string[];
    currencies?: string[];
    players?: string[];
    games?: number[];
    include_expired?: boolean;
    per_page?: number;
  }): Promise<CampaignResponse> {
    try {
      const params: any = {};

      if (filters?.vendors) params.vendors = filters.vendors.join(',');
      if (filters?.currencies) params.currencies = filters.currencies.join(',');
      if (filters?.players) params.players = filters.players.join(',');
      if (filters?.games) params.games = filters.games.join(',');
      if (filters?.include_expired !== undefined) params.include_expired = filters.include_expired;
      if (filters?.per_page) params.per_page = filters.per_page;

      console.log('[INNOVA_CAMPAIGNS] Listing campaigns with filters:', params);

      const response = await this.axiosInstance.get<CampaignResponse>(
        '/api/generic/campaigns/list',
        { params }
      );

      if (response.data.status === 'OK') {
        console.log('[INNOVA_CAMPAIGNS] Campaigns listed, count:', response.data.data?.length || 0);
        return response.data;
      }

      throw new Error('Failed to list campaigns');
    } catch (error: any) {
      console.error('[INNOVA_CAMPAIGNS] Error listing campaigns:', error.message);
      throw error;
    }
  }

  /**
   * Get campaign details by code
   */
  async getCampaignDetails(campaignCode: string): Promise<any> {
    try {
      console.log('[INNOVA_CAMPAIGNS] Fetching campaign details:', campaignCode);

      const response = await this.axiosInstance.get<CampaignResponse>(
        `/api/generic/campaigns/${campaignCode}`
      );

      if (response.data.status === 'OK' && response.data.data) {
        console.log('[INNOVA_CAMPAIGNS] Campaign details fetched:', response.data.data);
        return response.data.data;
      }

      throw new Error('Campaign not found');
    } catch (error: any) {
      console.error('[INNOVA_CAMPAIGNS] Error fetching campaign details:', error.message);
      throw error;
    }
  }

  /**
   * Create a new free spins campaign
   */
  async createCampaign(request: CreateCampaignRequest): Promise<void> {
    try {
      console.log('[INNOVA_CAMPAIGNS] Creating campaign:', {
        campaign_code: request.campaign_code,
        vendor: request.vendor,
        freespins_per_player: request.freespins_per_player,
        games_count: request.games.length,
        players_count: Array.isArray(request.players) ? request.players.length : 1
      });

      const response = await this.axiosInstance.post<CampaignResponse>(
        '/api/generic/campaigns/create',
        request
      );

      if (response.data.status === 'OK') {
        console.log('[INNOVA_CAMPAIGNS] Campaign created successfully:', request.campaign_code);
        return;
      }

      throw new Error(`Failed to create campaign: ${response.data.status}`);
    } catch (error: any) {
      console.error('[INNOVA_CAMPAIGNS] Error creating campaign:', error.response?.data || error.message);
      throw new Error(`Failed to create Innova campaign: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Cancel an existing campaign
   */
  async cancelCampaign(request: CancelCampaignRequest): Promise<void> {
    try {
      console.log('[INNOVA_CAMPAIGNS] Canceling campaign:', request.campaign_code);

      const response = await this.axiosInstance.post<CampaignResponse>(
        '/api/generic/campaigns/cancel',
        request
      );

      if (response.data.status === 'OK') {
        console.log('[INNOVA_CAMPAIGNS] Campaign canceled successfully');
        return;
      }

      throw new Error('Failed to cancel campaign');
    } catch (error: any) {
      console.error('[INNOVA_CAMPAIGNS] Error canceling campaign:', error.message);
      throw error;
    }
  }

  /**
   * Add players to an existing campaign
   */
  async addPlayers(request: AddPlayersRequest): Promise<void> {
    try {
      console.log('[INNOVA_CAMPAIGNS] Adding players to campaign:', {
        campaign_code: request.campaign_code,
        players_count: Array.isArray(request.players) ? request.players.length : 1
      });

      const response = await this.axiosInstance.post<CampaignResponse>(
        '/api/generic/campaigns/players/add',
        request
      );

      if (response.data.status === 'OK') {
        console.log('[INNOVA_CAMPAIGNS] Players added successfully');
        return;
      }

      throw new Error('Failed to add players to campaign');
    } catch (error: any) {
      console.error('[INNOVA_CAMPAIGNS] Error adding players:', error.message);
      throw error;
    }
  }

  /**
   * Remove players from an existing campaign
   */
  async removePlayers(request: RemovePlayersRequest): Promise<void> {
    try {
      console.log('[INNOVA_CAMPAIGNS] Removing players from campaign:', {
        campaign_code: request.campaign_code,
        players_count: Array.isArray(request.players) ? request.players.length : 1
      });

      const response = await this.axiosInstance.post<CampaignResponse>(
        '/api/generic/campaigns/players/remove',
        request
      );

      if (response.data.status === 'OK') {
        console.log('[INNOVA_CAMPAIGNS] Players removed successfully');
        return;
      }

      throw new Error('Failed to remove players from campaign');
    } catch (error: any) {
      console.error('[INNOVA_CAMPAIGNS] Error removing players:', error.message);
      throw error;
    }
  }

  /**
   * Helper: Generate unique campaign code
   */
  generateCampaignCode(source: 'challenge' | 'loyalty', sourceId: number, userId: number): string {
    const timestamp = Date.now();
    return `${source.toUpperCase()}_${sourceId}_USER_${userId}_${timestamp}`;
  }

  /**
   * Helper: Calculate campaign expiry timestamp (24 hours from now)
   */
  getDefaultExpiryTimestamp(hoursFromNow: number = 24): number {
    return Math.floor(Date.now() / 1000) + (hoursFromNow * 60 * 60);
  }

  /**
   * Helper: Get current timestamp
   */
  getCurrentTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }
}

// Export singleton instance
export default new InnovaCampaignsService();

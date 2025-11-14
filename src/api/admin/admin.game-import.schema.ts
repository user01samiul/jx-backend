import { z } from "zod";

// Schema for adding API provider configuration
export const AddProviderConfigSchema = z.object({
  provider_name: z.string().min(1, "Provider name is required"),
  api_key: z.string().min(1, "API key is required"),
  api_secret: z.string().optional(),
  base_url: z.string().url("Valid base URL is required"),
  is_active: z.boolean().default(true),
  metadata: z.record(z.any()).optional()
});

// Schema for importing games by category
export const ImportGamesByCategorySchema = z.object({
  provider_name: z.string().min(1, "Provider name is required"),
  category: z.string().min(1, "Category is required"),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0),
  force_update: z.boolean().default(false)
});

// Schema for importing specific game by ID
export const ImportGameByIdSchema = z.object({
  provider_name: z.string().min(1, "Provider name is required"),
  game_id: z.string().min(1, "Game ID is required"),
  force_update: z.boolean().default(false)
});

// Schema for updating provider configuration
export const UpdateProviderConfigSchema = z.object({
  api_key: z.string().optional(),
  api_secret: z.string().optional(),
  base_url: z.string().url("Valid base URL is required").optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
});

// Schema for game data mapping
export const GameDataMappingSchema = z.object({
  name: z.string(),
  provider: z.string(),
  vendor: z.string(),
  category: z.string(),
  game_code: z.string(),
  image_url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  rtp_percentage: z.number().optional(),
  volatility: z.enum(['low', 'medium', 'high']).optional(),
  min_bet: z.number().optional(),
  max_bet: z.number().optional(),
  max_win: z.number().optional(),
  is_featured: z.boolean().optional(),
  is_new: z.boolean().optional(),
  is_hot: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
});

export type AddProviderConfigInput = z.infer<typeof AddProviderConfigSchema>;
export type ImportGamesByCategoryInput = z.infer<typeof ImportGamesByCategorySchema>;
export type ImportGameByIdInput = z.infer<typeof ImportGameByIdSchema>;
export type UpdateProviderConfigInput = z.infer<typeof UpdateProviderConfigSchema>;
export type GameDataMapping = z.infer<typeof GameDataMappingSchema>; 
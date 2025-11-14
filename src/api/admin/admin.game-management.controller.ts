import { Request, Response } from "express";
import { AdminGameManagementService } from "../../services/admin/admin.game-management.service";
import { 
  GameStatusFiltersInput,
  UpdateGameStatusByIdInput,
  UpdateGameStatusByCategoryInput,
  UpdateGameStatusByProviderInput,
  BulkUpdateGameStatusInput,
  GetRecentStatusChangesInput
} from "./admin.game-management.schema";

// Get games with status filters
export const getGamesWithStatus = async (req: Request, res: Response) => {
  try {
    const filters: GameStatusFiltersInput = {
      category: req.query.category as string,
      provider: req.query.provider as string,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      search: req.query.search as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const games = await AdminGameManagementService.getGamesWithStatus(filters);

    res.json({
      success: true,
      data: games,
      message: "Games retrieved successfully"
    });
  } catch (error: any) {
    console.error("Error getting games with status:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get games"
    });
  }
};

// Update game status by ID
export const updateGameStatusById = async (req: Request, res: Response) => {
  try {
    const data: UpdateGameStatusByIdInput = req.body;
    
    const result = await AdminGameManagementService.updateGameStatusById(
      data.game_id,
      data.is_active,
      data.reason
    );

    res.json({
      success: true,
      data: result,
      message: `Game ${data.is_active ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error: any) {
    console.error("Error updating game status by ID:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to update game status"
    });
  }
};

// Update game status by category
export const updateGameStatusByCategory = async (req: Request, res: Response) => {
  try {
    const data: UpdateGameStatusByCategoryInput = req.body;
    
    const result = await AdminGameManagementService.updateGameStatusByCategory(
      data.category,
      data.is_active,
      data.reason
    );

    res.json({
      success: true,
      data: result,
      message: `${result.updated_count} games in category '${data.category}' ${data.is_active ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error: any) {
    console.error("Error updating game status by category:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to update game status by category"
    });
  }
};

// Update game status by provider
export const updateGameStatusByProvider = async (req: Request, res: Response) => {
  try {
    const data: UpdateGameStatusByProviderInput = req.body;
    
    const result = await AdminGameManagementService.updateGameStatusByProvider(
      data.provider,
      data.is_active,
      data.reason
    );

    res.json({
      success: true,
      data: result,
      message: `${result.updated_count} games from provider '${data.provider}' ${data.is_active ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error: any) {
    console.error("Error updating game status by provider:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to update game status by provider"
    });
  }
};

// Bulk update game status
export const bulkUpdateGameStatus = async (req: Request, res: Response) => {
  try {
    const data: BulkUpdateGameStatusInput = req.body;
    
    const result = await AdminGameManagementService.bulkUpdateGameStatus(
      data.game_ids,
      data.is_active,
      data.reason
    );

    res.json({
      success: true,
      data: result,
      message: `${result.updated_count} games ${data.is_active ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error: any) {
    console.error("Error bulk updating game status:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to bulk update game status"
    });
  }
};

// Get game status statistics
export const getGameStatusStats = async (req: Request, res: Response) => {
  try {
    const stats = await AdminGameManagementService.getGameStatusStats();

    res.json({
      success: true,
      data: stats,
      message: "Game status statistics retrieved successfully"
    });
  } catch (error: any) {
    console.error("Error getting game status stats:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get game status statistics"
    });
  }
};

// Get recent game status changes
export const getRecentStatusChanges = async (req: Request, res: Response) => {
  try {
    const data: GetRecentStatusChangesInput = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };
    
    const changes = await AdminGameManagementService.getRecentStatusChanges(data.limit);

    res.json({
      success: true,
      data: changes,
      message: "Recent status changes retrieved successfully"
    });
  } catch (error: any) {
    console.error("Error getting recent status changes:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get recent status changes"
    });
  }
}; 
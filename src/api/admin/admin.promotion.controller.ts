import { Request, Response } from "express";
import { AdminPromotionService } from "../../services/admin/promotion.service";
import {
  CreatePromotionInput,
  UpdatePromotionInput,
  PromotionFiltersInput,
  TogglePromotionInput,
  PromotionStatsFiltersInput
} from "./admin.promotion.schema";
import { ActivityLoggerService } from "../../services/activity/activity-logger.service";

// Create a new promotion
export const createPromotion = async (req: Request, res: Response) => {
  try {
    const data: CreatePromotionInput = req.body;
    const promotion = await AdminPromotionService.createPromotion(data);

    // Log activity
    await ActivityLoggerService.logPromotionCreated(
      req,
      promotion.id,
      promotion.title,
      promotion.type
    );

    res.status(201).json({
      success: true,
      message: "Promotion created successfully",
      data: promotion
    });
  } catch (error: any) {
    console.error("Error creating promotion:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create promotion"
    });
  }
};

// Get all promotions with filters
export const getPromotions = async (req: Request, res: Response) => {
  try {
    const filters: PromotionFiltersInput = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      search: req.query.search as string,
      type: req.query.type as any,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      is_featured: req.query.is_featured !== undefined ? req.query.is_featured === 'true' : undefined,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string
    };
    
    const result = await AdminPromotionService.getPromotions(filters);
    
    res.status(200).json({
      success: true,
      data: result.promotions,
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error("Error fetching promotions:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch promotions"
    });
  }
};

// Get promotion by ID
export const getPromotionById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid promotion ID"
      });
    }
    
    const promotion = await AdminPromotionService.getPromotionById(id);
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Promotion not found"
      });
    }
    
    res.status(200).json({
      success: true,
      data: promotion
    });
  } catch (error: any) {
    console.error("Error fetching promotion:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch promotion"
    });
  }
};

// Update promotion
export const updatePromotion = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid promotion ID"
      });
    }

    const data: UpdatePromotionInput = { ...req.body, id };
    const promotion = await AdminPromotionService.updatePromotion(id, data);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Promotion not found"
      });
    }

    // Log activity for each updated field
    for (const [key, value] of Object.entries(data)) {
      await ActivityLoggerService.logPromotionUpdated(
        req,
        id,
        key,
        null,
        value
      );
    }

    res.status(200).json({
      success: true,
      message: "Promotion updated successfully",
      data: promotion
    });
  } catch (error: any) {
    console.error("Error updating promotion:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update promotion"
    });
  }
};

// Delete promotion
export const deletePromotion = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid promotion ID"
      });
    }

    const promotion = await AdminPromotionService.deletePromotion(id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Promotion not found"
      });
    }

    // Log activity
    await ActivityLoggerService.logPromotionDeleted(
      req,
      id,
      promotion.title
    );

    res.status(200).json({
      success: true,
      message: "Promotion deleted successfully",
      data: promotion
    });
  } catch (error: any) {
    console.error("Error deleting promotion:", error);

    if (error.message.includes("Cannot delete promotion with existing claims")) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete promotion"
    });
  }
};

// Toggle promotion status
export const togglePromotion = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid promotion ID"
      });
    }

    const promotion = await AdminPromotionService.togglePromotion(id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Promotion not found"
      });
    }

    // Log activity
    await ActivityLoggerService.logPromotionStatusChanged(
      req,
      id,
      !promotion.is_active ? 'active' : 'inactive',
      promotion.is_active ? 'active' : 'inactive'
    );

    res.status(200).json({
      success: true,
      message: `Promotion ${promotion.is_active ? 'activated' : 'deactivated'} successfully`,
      data: promotion
    });
  } catch (error: any) {
    console.error("Error toggling promotion:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to toggle promotion"
    });
  }
};

// Get promotion statistics
export const getPromotionStats = async (req: Request, res: Response) => {
  try {
    const filters: PromotionStatsFiltersInput = {
      promotion_id: req.query.promotion_id ? parseInt(req.query.promotion_id as string) : undefined,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      group_by: (req.query.group_by as any) || 'day'
    };
    
    const stats = await AdminPromotionService.getPromotionStats(filters);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error("Error fetching promotion stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch promotion statistics"
    });
  }
};

// Get promotion overview statistics
export const getPromotionOverviewStats = async (req: Request, res: Response) => {
  try {
    const stats = await AdminPromotionService.getPromotionOverviewStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error("Error fetching promotion overview stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch promotion overview statistics"
    });
  }
};

// Get promotion claims
export const getPromotionClaims = async (req: Request, res: Response) => {
  try {
    const promotionId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (isNaN(promotionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid promotion ID"
      });
    }
    
    const result = await AdminPromotionService.getPromotionClaims(promotionId, page, limit);
    
    res.status(200).json({
      success: true,
      data: result.claims,
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error("Error fetching promotion claims:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch promotion claims"
    });
  }
}; 
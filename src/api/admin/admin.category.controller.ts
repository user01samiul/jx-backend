import { Request, Response, NextFunction } from "express";
import { AdminCategoryService } from "../../services/admin/admin.category.service";
import pool from "../../db/postgres";
import {
  CreateGameCategoryInput,
  UpdateGameCategoryInput,
  CategoryFiltersInput,
  BulkCategoryOperationInput,
  CategoryStatsFiltersInput
} from "./admin.category.schema";

const categoryService = new AdminCategoryService();

// Create a new game category
export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categoryData = req.validated?.body as CreateGameCategoryInput;
    const adminId = (req as any).user?.userId;
    
    const category = await categoryService.createCategory(categoryData, adminId);
    
    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all categories with filtering and pagination
export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = req.validated?.query as CategoryFiltersInput;
    
    const result = await categoryService.getCategories(filters);
    
    res.status(200).json({
      success: true,
      data: result.categories,
      pagination: result.pagination
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get category by ID
export const getCategoryById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categoryId = parseInt(req.params.id);
    
    if (isNaN(categoryId)) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID"
      });
      return;
    }
    
    const category = await categoryService.getCategoryById(categoryId);
    
    if (!category) {
      res.status(404).json({
        success: false,
        message: "Category not found"
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update category
export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categoryId = parseInt(req.params.id);
    const categoryData = req.validated?.body as UpdateGameCategoryInput;
    const adminId = (req as any).user?.userId;
    
    if (isNaN(categoryId)) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID"
      });
      return;
    }
    
    const category = await categoryService.updateCategory(categoryId, categoryData, adminId);
    
    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete category
export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categoryId = parseInt(req.params.id);
    const adminId = (req as any).user?.userId;
    
    if (isNaN(categoryId)) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID"
      });
      return;
    }
    
    await categoryService.deleteCategory(categoryId, adminId);
    
    res.status(200).json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Bulk operations on categories
export const bulkCategoryOperation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const operationData = req.validated?.body as BulkCategoryOperationInput;
    const adminId = (req as any).user?.userId;
    
    const result = await categoryService.bulkCategoryOperation(operationData, adminId);
    
    res.status(200).json({
      success: result.success,
      message: result.message,
      data: result.results
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get category statistics
export const getCategoryStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = req.validated?.query as CategoryStatsFiltersInput;
    
    const stats = await categoryService.getCategoryStats(filters);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get category hierarchy
export const getCategoryHierarchy = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hierarchy = await categoryService.getCategoryHierarchy();
    
    res.status(200).json({
      success: true,
      data: hierarchy
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Migrate existing categories
export const migrateExistingCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = (req as any).user?.userId;
    
    const result = await categoryService.migrateExistingCategories(adminId);
    
    res.status(200).json({
      success: result.success,
      message: result.message,
      data: {
        migrated_count: result.migrated_count,
        errors: result.errors
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get games in a specific category
export const getGamesInCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categoryId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (isNaN(categoryId)) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID"
      });
      return;
    }
    
    // Get category first
    const category = await categoryService.getCategoryById(categoryId);
    
    if (!category) {
      res.status(404).json({
        success: false,
        message: "Category not found"
      });
      return;
    }
    
    // Get games in this category
    const offset = (page - 1) * limit;
    
    const gamesQuery = `
      SELECT 
        id, name, provider, category, subcategory, image_url, thumbnail_url,
        game_code, rtp_percentage, volatility, min_bet, max_bet, max_win,
        is_featured, is_new, is_hot, is_active, created_at, updated_at
      FROM games 
      WHERE category = $1 AND is_active = true
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM games 
      WHERE category = $1 AND is_active = true
    `;
    
    const [gamesResult, countResult] = await Promise.all([
      pool.query(gamesQuery, [category.name, limit, offset]),
      pool.query(countQuery, [category.name])
    ]);
    
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      data: {
        category,
        games: gamesResult.rows,
        pagination: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}; 
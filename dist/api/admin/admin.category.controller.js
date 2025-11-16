"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGamesInCategory = exports.migrateExistingCategories = exports.getCategoryHierarchy = exports.getCategoryStats = exports.bulkCategoryOperation = exports.deleteCategory = exports.updateCategory = exports.getCategoryById = exports.getCategories = exports.createCategory = void 0;
const admin_category_service_1 = require("../../services/admin/admin.category.service");
const postgres_1 = __importDefault(require("../../db/postgres"));
const categoryService = new admin_category_service_1.AdminCategoryService();
// Create a new game category
const createCategory = async (req, res, next) => {
    var _a, _b;
    try {
        const categoryData = (_a = req.validated) === null || _a === void 0 ? void 0 : _a.body;
        const adminId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.userId;
        const category = await categoryService.createCategory(categoryData, adminId);
        res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: category
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
exports.createCategory = createCategory;
// Get all categories with filtering and pagination
const getCategories = async (req, res, next) => {
    var _a;
    try {
        const filters = (_a = req.validated) === null || _a === void 0 ? void 0 : _a.query;
        const result = await categoryService.getCategories(filters);
        res.status(200).json({
            success: true,
            data: result.categories,
            pagination: result.pagination
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getCategories = getCategories;
// Get category by ID
const getCategoryById = async (req, res, next) => {
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getCategoryById = getCategoryById;
// Update category
const updateCategory = async (req, res, next) => {
    var _a, _b;
    try {
        const categoryId = parseInt(req.params.id);
        const categoryData = (_a = req.validated) === null || _a === void 0 ? void 0 : _a.body;
        const adminId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.userId;
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
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
exports.updateCategory = updateCategory;
// Delete category
const deleteCategory = async (req, res, next) => {
    var _a;
    try {
        const categoryId = parseInt(req.params.id);
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
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
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
exports.deleteCategory = deleteCategory;
// Bulk operations on categories
const bulkCategoryOperation = async (req, res, next) => {
    var _a, _b;
    try {
        const operationData = (_a = req.validated) === null || _a === void 0 ? void 0 : _a.body;
        const adminId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.userId;
        const result = await categoryService.bulkCategoryOperation(operationData, adminId);
        res.status(200).json({
            success: result.success,
            message: result.message,
            data: result.results
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
exports.bulkCategoryOperation = bulkCategoryOperation;
// Get category statistics
const getCategoryStats = async (req, res, next) => {
    var _a;
    try {
        const filters = (_a = req.validated) === null || _a === void 0 ? void 0 : _a.query;
        const stats = await categoryService.getCategoryStats(filters);
        res.status(200).json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getCategoryStats = getCategoryStats;
// Get category hierarchy
const getCategoryHierarchy = async (req, res, next) => {
    try {
        const hierarchy = await categoryService.getCategoryHierarchy();
        res.status(200).json({
            success: true,
            data: hierarchy
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getCategoryHierarchy = getCategoryHierarchy;
// Migrate existing categories
const migrateExistingCategories = async (req, res, next) => {
    var _a;
    try {
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const result = await categoryService.migrateExistingCategories(adminId);
        res.status(200).json({
            success: result.success,
            message: result.message,
            data: {
                migrated_count: result.migrated_count,
                errors: result.errors
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.migrateExistingCategories = migrateExistingCategories;
// Get games in a specific category
const getGamesInCategory = async (req, res, next) => {
    try {
        const categoryId = parseInt(req.params.id);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
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
            postgres_1.default.query(gamesQuery, [category.name, limit, offset]),
            postgres_1.default.query(countQuery, [category.name])
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getGamesInCategory = getGamesInCategory;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const template_query_1 = require("../../model/template/template.query");
const apiError_1 = require("../../utils/apiError");
class TemplateService {
    // Get all templates
    static async getAllTemplates() {
        const result = await postgres_1.default.query(template_query_1.TemplateQuery.GET_ALL_TEMPLATES);
        return result.rows;
    }
    // Get template by ID
    static async getTemplateById(id) {
        const result = await postgres_1.default.query(template_query_1.TemplateQuery.GET_TEMPLATE_BY_ID, [id]);
        return result.rows[0] || null;
    }
    // Get template with configs
    static async getTemplateWithConfigs(id) {
        const result = await postgres_1.default.query(template_query_1.TemplateQuery.GET_TEMPLATE_WITH_CONFIGS, [id]);
        if (result.rows.length === 0)
            return null;
        const template = result.rows[0];
        const configs = result.rows
            .filter(row => row.config_id)
            .map(row => ({
            id: row.config_id,
            template_id: row.id,
            config_key: row.config_key,
            config_value: row.config_value,
            config_type: row.config_type,
            is_required: row.is_required,
            created_at: row.created_at
        }));
        return Object.assign(Object.assign({}, template), { configs });
    }
    // Get templates by type
    static async getTemplatesByType(type) {
        const result = await postgres_1.default.query(template_query_1.TemplateQuery.GET_TEMPLATE_BY_TYPE, [type]);
        return result.rows;
    }
    // Get user template
    static async getUserTemplate(userId) {
        const result = await postgres_1.default.query(template_query_1.TemplateQuery.GET_USER_TEMPLATE_WITH_FEATURES, [userId]);
        if (result.rows.length === 0)
            return null;
        const userTemplate = result.rows[0];
        const features = result.rows
            .filter(row => row.feature_id)
            .map(row => ({
            id: row.feature_id,
            template_id: row.template_id,
            feature_name: row.feature_name,
            feature_key: row.feature_key,
            feature_type: row.feature_type,
            feature_config: row.feature_config,
            is_enabled: row.feature_enabled,
            is_premium: row.feature_is_premium,
            price: row.feature_price,
            sort_order: row.sort_order,
            created_at: row.created_at,
            user_feature: row.user_feature_enabled !== null ? {
                id: row.id,
                user_id: userId,
                template_id: row.template_id,
                feature_id: row.feature_id,
                is_enabled: row.user_feature_enabled,
                custom_config: row.user_feature_config,
                purchased_at: row.purchased_at,
                created_at: row.created_at
            } : undefined
        }));
        return {
            id: userTemplate.id,
            user_id: userId,
            template_id: userTemplate.template_id,
            is_active: userTemplate.is_active,
            custom_config: userTemplate.custom_config,
            activated_at: userTemplate.activated_at,
            created_at: userTemplate.created_at,
            template: {
                id: userTemplate.template_id,
                name: userTemplate.template_name,
                description: userTemplate.template_description,
                type: userTemplate.template_type,
                category: userTemplate.template_category,
                version: '',
                is_active: true,
                is_default: false,
                is_premium: userTemplate.template_is_premium,
                price: userTemplate.template_price,
                currency: 'USD',
                created_at: '',
                updated_at: ''
            },
            features
        };
    }
    // Assign template to user
    static async assignTemplateToUser(userId, templateId, customConfig = {}) {
        const template = await this.getTemplateById(templateId);
        if (!template) {
            throw new apiError_1.ApiError('Template not found', 404);
        }
        await postgres_1.default.query(template_query_1.TemplateQuery.DEACTIVATE_USER_TEMPLATE, [userId, templateId]);
        const result = await postgres_1.default.query(template_query_1.TemplateQuery.CREATE_USER_TEMPLATE, [userId, templateId, customConfig]);
        return result.rows[0];
    }
    // Load user template on login
    static async loadUserTemplateOnLogin(userId, userLevelId) {
        let userTemplate = await this.getUserTemplate(userId);
        if (!userTemplate) {
            const result = await postgres_1.default.query(template_query_1.TemplateQuery.GET_DEFAULT_TEMPLATE_BY_LEVEL, [userLevelId]);
            const defaultTemplate = result.rows[0];
            if (!defaultTemplate) {
                throw new apiError_1.ApiError('No default template found for user level', 500);
            }
            await this.assignTemplateToUser(userId, defaultTemplate.template_id, {});
            userTemplate = await this.getUserTemplate(userId);
            if (!userTemplate) {
                throw new apiError_1.ApiError('Failed to load user template', 500);
            }
        }
        return userTemplate;
    }
    // Get available templates for user
    static async getAvailableTemplatesForUser(userId) {
        const result = await postgres_1.default.query(template_query_1.TemplateQuery.GET_AVAILABLE_TEMPLATES_FOR_USER, [userId]);
        return result.rows;
    }
}
exports.TemplateService = TemplateService;

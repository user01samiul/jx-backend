"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModuleHierarchy = exports.deleteModule = exports.updateModule = exports.createModule = exports.getModuleById = exports.getAllModules = void 0;
const postgres_1 = __importDefault(require("../../../db/postgres"));
const admin_activity_service_1 = require("../../../services/admin/admin-activity.service");
// Get all modules with filtering and pagination
const getAllModules = async (req, res) => {
    try {
        const { parentId, menuName, limit = 50, offset = 0, hierarchical = 'true' } = req.query;
        // If hierarchical is false, return flat structure
        if (hierarchical === 'false') {
            let query = `
        SELECT 
          id, title, subtitle, path, icons, newtab, "parentId", "menuName",
          created_at, updated_at
        FROM modules 
        WHERE 1=1
      `;
            const params = [];
            let paramIndex = 1;
            if (parentId !== undefined) {
                query += ` AND "parentId" = $${paramIndex}`;
                params.push(parentId);
                paramIndex++;
            }
            if (menuName) {
                query += ` AND "menuName" = $${paramIndex}`;
                params.push(menuName);
                paramIndex++;
            }
            // Add ordering and pagination
            query += ` ORDER BY id ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);
            const result = await postgres_1.default.query(query, params);
            // Get total count for pagination
            let countQuery = `SELECT COUNT(*) as total FROM modules WHERE 1=1`;
            const countParams = [];
            let countParamIndex = 1;
            if (parentId !== undefined) {
                countQuery += ` AND "parentId" = $${countParamIndex}`;
                countParams.push(parentId);
                countParamIndex++;
            }
            if (menuName) {
                countQuery += ` AND "menuName" = $${countParamIndex}`;
                countParams.push(menuName);
                countParamIndex++;
            }
            const countResult = await postgres_1.default.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0].total);
            res.status(200).json({
                success: true,
                data: result.rows,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + limit < total
                }
            });
            return;
        }
        // For hierarchical structure, get all modules and build the tree
        let query = `
      SELECT 
        id, title, subtitle, path, icons, newtab, "parentId", "menuName",
        created_at, updated_at
      FROM modules 
      WHERE 1=1
    `;
        const params = [];
        let paramIndex = 1;
        if (parentId !== undefined) {
            query += ` AND "parentId" = $${paramIndex}`;
            params.push(parentId);
            paramIndex++;
        }
        if (menuName) {
            query += ` AND "menuName" = $${paramIndex}`;
            params.push(menuName);
            paramIndex++;
        }
        // Add ordering
        query += ` ORDER BY "parentId" NULLS FIRST, id ASC`;
        const result = await postgres_1.default.query(query, params);
        const modules = result.rows;
        // Build menu structure
        const moduleMap = new Map();
        const menuStructure = [];
        // Create a map of all modules
        modules.forEach(module => {
            moduleMap.set(module.id, { ...module, submenu: [] });
        });
        // Build parent-child relationships
        modules.forEach(module => {
            if (module.parentId) {
                const parent = moduleMap.get(module.parentId);
                if (parent) {
                    parent.submenu.push(moduleMap.get(module.id));
                }
            }
        });
        // Create menu structure for top-level modules only
        modules.forEach(module => {
            if (!module.parentId) {
                // Create menu object structure
                const menuItem = {
                    menu: {
                        id: module.id,
                        title: module.title,
                        subtitle: module.subtitle,
                        path: module.path,
                        icons: module.icons,
                        newtab: module.newtab,
                        menuName: module.menuName,
                        created_at: module.created_at,
                        updated_at: module.updated_at
                    },
                    submenu: moduleMap.get(module.id).submenu.map((child) => ({
                        id: child.id,
                        title: child.title,
                        subtitle: child.subtitle,
                        path: child.path,
                        icons: child.icons,
                        newtab: child.newtab,
                        parentId: child.parentId,
                        menuName: child.menuName,
                        created_at: child.created_at,
                        updated_at: child.updated_at
                    }))
                };
                menuStructure.push(menuItem);
            }
        });
        // Get total count for pagination (only count top-level modules when hierarchical)
        let countQuery = `SELECT COUNT(*) as total FROM modules WHERE 1=1`;
        const countParams = [];
        let countParamIndex = 1;
        if (parentId !== undefined) {
            countQuery += ` AND "parentId" = $${countParamIndex}`;
            countParams.push(parentId);
            countParamIndex++;
        }
        else {
            countQuery += ` AND "parentId" IS NULL`;
        }
        if (menuName) {
            countQuery += ` AND "menuName" = $${countParamIndex}`;
            countParams.push(menuName);
            countParamIndex++;
        }
        const countResult = await postgres_1.default.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);
        res.status(200).json({
            success: true,
            data: menuStructure,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            }
        });
    }
    catch (error) {
        console.error('Error fetching modules:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch modules",
            error: error.message
        });
    }
};
exports.getAllModules = getAllModules;
// Get module by ID
const getModuleById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await postgres_1.default.query(`SELECT id, title, subtitle, path, icons, newtab, "parentId", "menuName", created_at, updated_at 
       FROM modules WHERE id = $1`, [id]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Module not found"
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    }
    catch (error) {
        console.error('Error fetching module:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch module",
            error: error.message
        });
    }
};
exports.getModuleById = getModuleById;
// Create new module
const createModule = async (req, res) => {
    try {
        const moduleData = req.body;
        const adminId = req.user?.userId;
        // Check if parent module exists if parentId is provided
        if (moduleData.parentId) {
            const parentCheck = await postgres_1.default.query(`SELECT id FROM modules WHERE id = $1`, [moduleData.parentId]);
            if (parentCheck.rows.length === 0) {
                res.status(400).json({
                    success: false,
                    message: "Parent module not found"
                });
                return;
            }
        }
        const result = await postgres_1.default.query(`INSERT INTO modules (title, subtitle, path, icons, newtab, "parentId", "menuName", created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, title, subtitle, path, icons, newtab, "parentId", "menuName", created_at, updated_at`, [
            moduleData.title,
            moduleData.subtitle || null,
            moduleData.path || null,
            moduleData.icons || null,
            moduleData.newtab || false,
            moduleData.parentId || null,
            moduleData.menuName
        ]);
        const newModule = result.rows[0];
        // Log admin activity
        await (0, admin_activity_service_1.logAdminActivity)(adminId, 'module_created', {
            module_id: newModule.id,
            module_title: newModule.title,
            module_menu: newModule.menuName
        });
        res.status(201).json({
            success: true,
            message: "Module created successfully",
            data: newModule
        });
    }
    catch (error) {
        console.error('Error creating module:', error);
        if (error.code === '23505') { // Unique constraint violation
            res.status(400).json({
                success: false,
                message: "Module with this title already exists"
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Failed to create module",
            error: error.message
        });
    }
};
exports.createModule = createModule;
// Update module
const updateModule = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const adminId = req.user?.userId;
        // Check if module exists
        const existingModule = await postgres_1.default.query(`SELECT id FROM modules WHERE id = $1`, [id]);
        if (existingModule.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Module not found"
            });
            return;
        }
        // Check if parent module exists if parentId is being updated
        if (updateData.parentId !== undefined) {
            if (updateData.parentId) {
                const parentCheck = await postgres_1.default.query(`SELECT id FROM modules WHERE id = $1`, [updateData.parentId]);
                if (parentCheck.rows.length === 0) {
                    res.status(400).json({
                        success: false,
                        message: "Parent module not found"
                    });
                    return;
                }
            }
            // Prevent circular reference (module cannot be its own parent)
            if (parseInt(id) === updateData.parentId) {
                res.status(400).json({
                    success: false,
                    message: "Module cannot be its own parent"
                });
                return;
            }
        }
        // Build dynamic update query
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        if (updateData.title !== undefined) {
            updateFields.push(`title = $${paramIndex}`);
            values.push(updateData.title);
            paramIndex++;
        }
        if (updateData.subtitle !== undefined) {
            updateFields.push(`subtitle = $${paramIndex}`);
            values.push(updateData.subtitle);
            paramIndex++;
        }
        if (updateData.path !== undefined) {
            updateFields.push(`path = $${paramIndex}`);
            values.push(updateData.path);
            paramIndex++;
        }
        if (updateData.icons !== undefined) {
            updateFields.push(`icons = $${paramIndex}`);
            values.push(updateData.icons);
            paramIndex++;
        }
        if (updateData.newtab !== undefined) {
            updateFields.push(`newtab = $${paramIndex}`);
            values.push(updateData.newtab);
            paramIndex++;
        }
        if (updateData.parentId !== undefined) {
            updateFields.push(`"parentId" = $${paramIndex}`);
            values.push(updateData.parentId);
            paramIndex++;
        }
        if (updateData.menuName !== undefined) {
            updateFields.push(`"menuName" = $${paramIndex}`);
            values.push(updateData.menuName);
            paramIndex++;
        }
        if (updateFields.length === 0) {
            res.status(400).json({
                success: false,
                message: "No fields to update"
            });
            return;
        }
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        const query = `
      UPDATE modules 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, title, subtitle, path, icons, newtab, "parentId", "menuName", created_at, updated_at
    `;
        const result = await postgres_1.default.query(query, values);
        const updatedModule = result.rows[0];
        // Log admin activity
        await (0, admin_activity_service_1.logAdminActivity)(adminId, 'module_updated', {
            module_id: updatedModule.id,
            module_title: updatedModule.title,
            module_menu: updatedModule.menuName
        });
        res.status(200).json({
            success: true,
            message: "Module updated successfully",
            data: updatedModule
        });
    }
    catch (error) {
        console.error('Error updating module:', error);
        if (error.code === '23505') { // Unique constraint violation
            res.status(400).json({
                success: false,
                message: "Module with this title already exists"
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Failed to update module",
            error: error.message
        });
    }
};
exports.updateModule = updateModule;
// Delete module
const deleteModule = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.userId;
        // Check if module exists
        const existingModule = await postgres_1.default.query(`SELECT id, title, "menuName" FROM modules WHERE id = $1`, [id]);
        if (existingModule.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Module not found"
            });
            return;
        }
        // Check if module has children
        const childrenCheck = await postgres_1.default.query(`SELECT COUNT(*) as count FROM modules WHERE "parentId" = $1`, [id]);
        if (parseInt(childrenCheck.rows[0].count) > 0) {
            res.status(400).json({
                success: false,
                message: "Cannot delete module with child modules. Please delete child modules first."
            });
            return;
        }
        // Delete the module
        await postgres_1.default.query(`DELETE FROM modules WHERE id = $1`, [id]);
        // Log admin activity
        await (0, admin_activity_service_1.logAdminActivity)(adminId, 'module_deleted', {
            module_id: parseInt(id),
            module_title: existingModule.rows[0].title,
            module_menu: existingModule.rows[0].menuName
        });
        res.status(200).json({
            success: true,
            message: "Module deleted successfully"
        });
    }
    catch (error) {
        console.error('Error deleting module:', error);
        res.status(500).json({
            success: false,
            message: "Failed to delete module",
            error: error.message
        });
    }
};
exports.deleteModule = deleteModule;
// Get module hierarchy (parent-child relationships)
const getModuleHierarchy = async (req, res) => {
    try {
        const result = await postgres_1.default.query(`SELECT 
        id, title, subtitle, path, icons, newtab, "parentId", "menuName",
        created_at, updated_at
       FROM modules 
       ORDER BY "parentId" NULLS FIRST, id ASC`);
        // Build hierarchy
        const modules = result.rows;
        const moduleMap = new Map();
        const hierarchy = [];
        // Create a map of all modules
        modules.forEach(module => {
            moduleMap.set(module.id, { ...module, children: [] });
        });
        // Build parent-child relationships
        modules.forEach(module => {
            if (module.parentId) {
                const parent = moduleMap.get(module.parentId);
                if (parent) {
                    parent.children.push(moduleMap.get(module.id));
                }
            }
            else {
                hierarchy.push(moduleMap.get(module.id));
            }
        });
        res.status(200).json({
            success: true,
            data: hierarchy
        });
    }
    catch (error) {
        console.error('Error fetching module hierarchy:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch module hierarchy",
            error: error.message
        });
    }
};
exports.getModuleHierarchy = getModuleHierarchy;

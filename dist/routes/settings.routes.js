"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settings_controller_1 = require("../api/settings/settings.controller");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /api/settings/maintenance:
 *   get:
 *     summary: Get all system settings
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: All settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: All system settings
 *               example:
 *                 maintenance: false
 *                 customer-support: "https://support.example.com"
 *                 site-name: "JackpotX Casino"
 *                 max-withdrawal: "5000"
 *   post:
 *     summary: Update system settings
 *     tags: [Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Settings to update (only the settings you want to change)
 *             example:
 *               maintenance: true
 *               customer-support: "https://new-support.example.com"
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: All current settings after update
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Request body must be an object with settings to update"
 * /api/settings/maintenance/toggle:
 *   post:
 *     summary: Toggle maintenance mode
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Maintenance mode toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 maintenance:
 *                   type: boolean
 *                   example: true
 */
router.get("/settings/maintenance", settings_controller_1.getMaintenance);
router.post("/settings/maintenance", settings_controller_1.setMaintenance);
router.post("/settings/maintenance/toggle", settings_controller_1.toggleMaintenance);
exports.default = router;

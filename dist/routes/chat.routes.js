"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middlewares/authenticate");
const authorize_1 = require("../middlewares/authorize");
const roles_1 = require("../constants/roles");
const chatController = __importStar(require("../controllers/chatController"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(authenticate_1.authenticate);
// Player routes
router.get('/history', chatController.getPlayerChatHistory);
router.get('/sessions/:sessionId/messages', chatController.getSessionMessages);
router.post('/sessions/:sessionId/rate', chatController.rateChatSession);
// Agent/Admin routes (Support role acts as Agent)
router.get('/agent/sessions', (0, authorize_1.authorize)([roles_1.Roles.ADMIN, roles_1.Roles.SUPPORT]), chatController.getAgentSessions);
router.get('/agent/settings', (0, authorize_1.authorize)([roles_1.Roles.ADMIN, roles_1.Roles.SUPPORT]), chatController.getAgentSettings);
router.put('/agent/settings', (0, authorize_1.authorize)([roles_1.Roles.ADMIN, roles_1.Roles.SUPPORT]), chatController.updateAgentSettings);
router.get('/queue', (0, authorize_1.authorize)([roles_1.Roles.ADMIN, roles_1.Roles.SUPPORT]), chatController.getChatQueue);
router.get('/canned-responses', (0, authorize_1.authorize)([roles_1.Roles.ADMIN, roles_1.Roles.SUPPORT]), chatController.getCannedResponses);
// Admin only routes
router.post('/canned-responses', (0, authorize_1.authorize)([roles_1.Roles.ADMIN]), chatController.saveCannedResponse);
router.get('/stats', (0, authorize_1.authorize)([roles_1.Roles.ADMIN]), chatController.getChatStats);
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logUserActivity = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const logUserActivity = async ({ userId, action, category, description, ipAddress, userAgent, sessionId, metadata, }) => {
    await postgres_1.default.query(`INSERT INTO user_activity_logs
      (user_id, action, category, description, ip_address, user_agent, session_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
        userId,
        action,
        category || null,
        description || null,
        ipAddress || null,
        userAgent || null,
        sessionId || null,
        metadata ? JSON.stringify(metadata) : null,
    ]);
};
exports.logUserActivity = logUserActivity;

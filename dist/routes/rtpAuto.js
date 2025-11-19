"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEffectiveRtp = exports.setRtpAutoAdjustment = exports.setRtpTargetProfit = exports.getRtpTargetProfit = void 0;
const postgres_1 = __importDefault(require("./db/postgres"));
// Get current RTP target profit and mode
const getRtpTargetProfit = async (req, res) => {
    const result = await postgres_1.default.query("SELECT target_profit_percent, effective_rtp, adjustment_mode FROM rtp_settings ORDER BY id DESC LIMIT 1");
    if (result.rows.length === 0) {
        return res.json({ target_profit_percent: 20, effective_rtp: 80, adjustment_mode: 'manual' });
    }
    res.json(result.rows[0]);
};
exports.getRtpTargetProfit = getRtpTargetProfit;
// Set RTP target profit and mode (manual mode)
const setRtpTargetProfit = async (req, res) => {
    const { target_profit_percent } = req.body;
    const result = await postgres_1.default.query(`INSERT INTO rtp_settings (target_profit_percent, effective_rtp, adjustment_mode, updated_at)
     VALUES ($1, 80, 'manual', NOW())
     RETURNING *`, [target_profit_percent]);
    res.json(result.rows[0]);
};
exports.setRtpTargetProfit = setRtpTargetProfit;
// Set auto adjustment mode
const setRtpAutoAdjustment = async (req, res) => {
    // Optionally allow admin to set initial target_profit_percent and effective_rtp
    const { target_profit_percent = 20, effective_rtp = 80 } = req.body || {};
    const result = await postgres_1.default.query(`INSERT INTO rtp_settings (target_profit_percent, effective_rtp, adjustment_mode, updated_at)
     VALUES ($1, $2, 'auto', NOW())
     RETURNING *`, [target_profit_percent, effective_rtp]);
    res.json(result.rows[0]);
};
exports.setRtpAutoAdjustment = setRtpAutoAdjustment;
// Service to update effective RTP based on actual profit and mode
const updateEffectiveRtp = async (actualProfitPercent) => {
    const result = await postgres_1.default.query("SELECT id, target_profit_percent, effective_rtp, adjustment_mode FROM rtp_settings ORDER BY id DESC LIMIT 1");
    if (result.rows.length === 0)
        return;
    const { id, target_profit_percent, effective_rtp, adjustment_mode } = result.rows[0];
    let newRtp = effective_rtp;
    if (adjustment_mode === 'auto') {
        // Advanced adjustment: proportional, capped
        let diff = actualProfitPercent - target_profit_percent;
        let adjustment = Math.round(diff * 0.5); // 0.5% RTP change per 1% profit difference
        adjustment = Math.max(Math.min(adjustment, 5), -5); // Cap between -5% and +5%
        newRtp = effective_rtp + adjustment;
        newRtp = Math.max(Math.min(newRtp, 99), 50);
    }
    else {
        // Manual mode: 1% step
        if (actualProfitPercent < target_profit_percent) {
            newRtp = Math.max(effective_rtp - 1, 50); // Lower RTP, min 50%
        }
        else if (actualProfitPercent > target_profit_percent) {
            newRtp = Math.min(effective_rtp + 1, 99); // Raise RTP, max 99%
        }
    }
    if (newRtp !== effective_rtp) {
        await postgres_1.default.query("UPDATE rtp_settings SET effective_rtp = $1, updated_at = NOW() WHERE id = $2", [newRtp, id]);
    }
};
exports.updateEffectiveRtp = updateEffectiveRtp;

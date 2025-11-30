"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var postgres_1 = __importDefault(require("../db/postgres"));
var innova_campaigns_service_1 = __importDefault(require("./provider/innova-campaigns.service"));
var ChallengesService = /** @class */ (function () {
    function ChallengesService() {
    }
    /**
     * Create a new challenge template
     */
    ChallengesService.prototype.createTemplate = function (template) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.query("INSERT INTO challenge_templates (\n        name, description, type, target_value, reward_type, reward_value,\n        duration_hours, game_ids, min_bet, status, priority\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)\n      RETURNING *", [
                            template.name,
                            template.description,
                            template.type,
                            template.target_value,
                            template.reward_type,
                            template.reward_amount,
                            template.duration_hours || null,
                            template.game_ids ? JSON.stringify(template.game_ids) : null,
                            template.min_bet || null,
                            template.status,
                            template.priority
                        ])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0]];
                }
            });
        });
    };
    /**
     * Get all challenge templates
     */
    ChallengesService.prototype.getAllTemplates = function (status) {
        return __awaiter(this, void 0, void 0, function () {
            var query, params, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = 'SELECT * FROM challenge_templates';
                        params = [];
                        if (status) {
                            query += ' WHERE status = $1';
                            params.push(status);
                        }
                        query += ' ORDER BY priority DESC, created_at DESC';
                        return [4 /*yield*/, postgres_1.default.query(query, params)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows];
                }
            });
        });
    };
    /**
     * Get challenge template by ID
     */
    ChallengesService.prototype.getTemplateById = function (templateId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.query('SELECT * FROM challenge_templates WHERE id = $1', [templateId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0]];
                }
            });
        });
    };
    /**
     * Update challenge template
     */
    ChallengesService.prototype.updateTemplate = function (templateId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var fields, values, paramIndex, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fields = [];
                        values = [];
                        paramIndex = 1;
                        Object.entries(updates).forEach(function (_a) {
                            var key = _a[0], value = _a[1];
                            if (value !== undefined) {
                                fields.push("".concat(key, " = $").concat(paramIndex));
                                values.push(key === 'game_ids' && Array.isArray(value) ? JSON.stringify(value) : value);
                                paramIndex++;
                            }
                        });
                        if (fields.length === 0) {
                            throw new Error('No fields to update');
                        }
                        values.push(templateId);
                        return [4 /*yield*/, postgres_1.default.query("UPDATE challenge_templates SET ".concat(fields.join(', '), ", updated_at = CURRENT_TIMESTAMP\n       WHERE id = $").concat(paramIndex, " RETURNING *"), values)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0]];
                }
            });
        });
    };
    /**
     * Delete challenge template
     */
    ChallengesService.prototype.deleteTemplate = function (templateId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.query('DELETE FROM challenge_templates WHERE id = $1', [templateId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount > 0];
                }
            });
        });
    };
    /**
     * Assign challenge to player
     */
    ChallengesService.prototype.assignChallengeToPlayer = function (userId, templateId) {
        return __awaiter(this, void 0, void 0, function () {
            var template, existingChallenge, expiresAt, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getTemplateById(templateId)];
                    case 1:
                        template = _a.sent();
                        if (!template) {
                            throw new Error('Challenge template not found');
                        }
                        if (template.status !== 'ACTIVE') {
                            throw new Error('Challenge template is not active');
                        }
                        return [4 /*yield*/, postgres_1.default.query("SELECT id FROM player_challenges\n       WHERE user_id = $1 AND template_id = $2 AND status = 'ACTIVE'", [userId, templateId])];
                    case 2:
                        existingChallenge = _a.sent();
                        if (existingChallenge.rows.length > 0) {
                            throw new Error('Player already has this challenge active');
                        }
                        expiresAt = template.duration_hours
                            ? new Date(Date.now() + template.duration_hours * 60 * 60 * 1000)
                            : null;
                        return [4 /*yield*/, postgres_1.default.query("INSERT INTO player_challenges (\n        user_id, template_id, progress, target, status, expires_at\n      ) VALUES ($1, $2, 0, $3, 'ACTIVE', $4)\n      RETURNING *", [userId, templateId, template.target_value, expiresAt])];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0]];
                }
            });
        });
    };
    /**
     * Get player's active challenges
     */
    ChallengesService.prototype.getPlayerChallenges = function (userId, status) {
        return __awaiter(this, void 0, void 0, function () {
            var query, params, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[CHALLENGES SERVICE] getPlayerChallenges called with userId:', userId, 'status:', status);
                        query = "\n      SELECT pc.*, ct.name, ct.description, ct.type, ct.reward_type, ct.reward_value\n      FROM player_challenges pc\n      JOIN challenge_templates ct ON pc.template_id = ct.id\n      WHERE pc.user_id = $1\n    ";
                        params = [userId];
                        if (status) {
                            query += ' AND pc.status = $2';
                            params.push(status);
                        }
                        query += ' ORDER BY pc.started_at DESC';
                        console.log('[CHALLENGES SERVICE] Executing query:', query);
                        console.log('[CHALLENGES SERVICE] With params:', params);
                        return [4 /*yield*/, postgres_1.default.query(query, params)];
                    case 1:
                        result = _a.sent();
                        console.log('[CHALLENGES SERVICE] Query result rowCount:', result.rowCount);
                        console.log('[CHALLENGES SERVICE] Query result rows:', JSON.stringify(result.rows, null, 2));
                        return [2 /*return*/, result.rows];
                }
            });
        });
    };
    /**
     * Update challenge progress
     */
    ChallengesService.prototype.updateChallengeProgress = function (userId, templateId, progressIncrement) {
        return __awaiter(this, void 0, void 0, function () {
            var client, challengeResult, challenge, newProgress, isCompleted, updateResult, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.connect()];
                    case 1:
                        client = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 12, 14, 15]);
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, client.query("SELECT * FROM player_challenges\n         WHERE user_id = $1 AND template_id = $2 AND status = 'ACTIVE'\n         FOR UPDATE", [userId, templateId])];
                    case 4:
                        challengeResult = _a.sent();
                        if (!(challengeResult.rows.length === 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 5:
                        _a.sent();
                        return [2 /*return*/, null];
                    case 6:
                        challenge = challengeResult.rows[0];
                        if (!(challenge.expires_at && new Date(challenge.expires_at) < new Date())) return [3 /*break*/, 9];
                        return [4 /*yield*/, client.query("UPDATE player_challenges SET status = 'EXPIRED' WHERE id = $1", [challenge.id])];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 8:
                        _a.sent();
                        return [2 /*return*/, __assign(__assign({}, challenge), { status: 'EXPIRED' })];
                    case 9:
                        newProgress = challenge.progress + progressIncrement;
                        isCompleted = newProgress >= challenge.target;
                        return [4 /*yield*/, client.query("UPDATE player_challenges\n         SET progress = $1, status = $2, completed_at = $3, updated_at = CURRENT_TIMESTAMP\n         WHERE id = $4\n         RETURNING *", [
                                newProgress,
                                isCompleted ? 'COMPLETED' : 'ACTIVE',
                                isCompleted ? new Date() : null,
                                challenge.id
                            ])];
                    case 10:
                        updateResult = _a.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 11:
                        _a.sent();
                        return [2 /*return*/, updateResult.rows[0]];
                    case 12:
                        error_1 = _a.sent();
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 13:
                        _a.sent();
                        throw error_1;
                    case 14:
                        client.release();
                        return [7 /*endfinally*/];
                    case 15: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Claim challenge reward
     */
    ChallengesService.prototype.claimChallengeReward = function (userId, challengeId) {
        return __awaiter(this, void 0, void 0, function () {
            var client, challengeResult, challenge, _a, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.connect()];
                    case 1:
                        client = _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 18, 20, 21]);
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 3:
                        _b.sent();
                        return [4 /*yield*/, client.query("SELECT pc.*, ct.reward_type, ct.reward_value\n         FROM player_challenges pc\n         JOIN challenge_templates ct ON pc.template_id = ct.id\n         WHERE pc.id = $1 AND pc.user_id = $2 AND pc.status = 'COMPLETED'\n         FOR UPDATE", [challengeId, userId])];
                    case 4:
                        challengeResult = _b.sent();
                        if (!(challengeResult.rows.length === 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 5:
                        _b.sent();
                        throw new Error('Challenge not found or not completed');
                    case 6:
                        challenge = challengeResult.rows[0];
                        // Mark as claimed
                        return [4 /*yield*/, client.query("UPDATE player_challenges SET status = 'CLAIMED', claimed_at = CURRENT_TIMESTAMP\n         WHERE id = $1", [challengeId])];
                    case 7:
                        // Mark as claimed
                        _b.sent();
                        _a = challenge.reward_type;
                        switch (_a) {
                            case 'CASH': return [3 /*break*/, 8];
                            case 'BONUS': return [3 /*break*/, 10];
                            case 'LOYALTY_POINTS': return [3 /*break*/, 12];
                            case 'FREE_SPINS': return [3 /*break*/, 14];
                        }
                        return [3 /*break*/, 16];
                    case 8: return [4 /*yield*/, client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [challenge.reward_value, userId])];
                    case 9:
                        _b.sent();
                        return [3 /*break*/, 16];
                    case 10: return [4 /*yield*/, client.query('UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2', [challenge.reward_value, userId])];
                    case 11:
                        _b.sent();
                        return [3 /*break*/, 16];
                    case 12: return [4 /*yield*/, client.query("UPDATE player_loyalty SET available_points = available_points + $1, lifetime_points = lifetime_points + $1\n             WHERE user_id = $2", [challenge.reward_value, userId])];
                    case 13:
                        _b.sent();
                        return [3 /*break*/, 16];
                    case 14: 
                    // Create Innova campaign for free spins
                    return [4 /*yield*/, this.grantFreeSpinsCampaign(client, userId, challengeId, challenge)];
                    case 15:
                        // Create Innova campaign for free spins
                        _b.sent();
                        return [3 /*break*/, 16];
                    case 16: return [4 /*yield*/, client.query('COMMIT')];
                    case 17:
                        _b.sent();
                        return [2 /*return*/, {
                                success: true,
                                reward_type: challenge.reward_type,
                                reward_amount: challenge.reward_value
                            }];
                    case 18:
                        error_2 = _b.sent();
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 19:
                        _b.sent();
                        throw error_2;
                    case 20:
                        client.release();
                        return [7 /*endfinally*/];
                    case 21: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Auto-assign challenges to eligible players
     */
    ChallengesService.prototype.autoAssignChallenges = function () {
        return __awaiter(this, void 0, void 0, function () {
            var templates, _i, _a, template, eligibleUsers, _b, _c, user, error_3;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.query("SELECT * FROM challenge_templates\n       WHERE status = 'ACTIVE' AND auto_assign = true\n       ORDER BY priority DESC")];
                    case 1:
                        templates = _d.sent();
                        _i = 0, _a = templates.rows;
                        _d.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 10];
                        template = _a[_i];
                        return [4 /*yield*/, postgres_1.default.query("SELECT u.id FROM users u\n         WHERE u.is_active = true\n         AND NOT EXISTS (\n           SELECT 1 FROM player_challenges pc\n           WHERE pc.user_id = u.id\n           AND pc.template_id = $1\n           AND pc.status IN ('ACTIVE', 'COMPLETED')\n         )\n         LIMIT 100", [template.id])];
                    case 3:
                        eligibleUsers = _d.sent();
                        _b = 0, _c = eligibleUsers.rows;
                        _d.label = 4;
                    case 4:
                        if (!(_b < _c.length)) return [3 /*break*/, 9];
                        user = _c[_b];
                        _d.label = 5;
                    case 5:
                        _d.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, this.assignChallengeToPlayer(user.id, template.id)];
                    case 6:
                        _d.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        error_3 = _d.sent();
                        console.error("Failed to auto-assign challenge ".concat(template.id, " to user ").concat(user.id, ":"), error_3);
                        return [3 /*break*/, 8];
                    case 8:
                        _b++;
                        return [3 /*break*/, 4];
                    case 9:
                        _i++;
                        return [3 /*break*/, 2];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Expire old challenges
     */
    ChallengesService.prototype.expireOldChallenges = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.query("UPDATE player_challenges\n       SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP\n       WHERE status = 'ACTIVE'\n       AND expires_at IS NOT NULL\n       AND expires_at < CURRENT_TIMESTAMP")];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount];
                }
            });
        });
    };
    /**
     * Grant free spins campaign through Innova API
     * Called when claiming a FREE_SPINS reward
     */
    ChallengesService.prototype.grantFreeSpinsCampaign = function (client, userId, challengeId, challenge) {
        return __awaiter(this, void 0, void 0, function () {
            var userResult, currency, freespinsCount, defaultVendor, defaultGameId, defaultBetAmount, campaignCode, beginsAt, expiresAt, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        console.log("[CHALLENGES] Granting free spins campaign for user ".concat(userId, ", challenge ").concat(challengeId));
                        return [4 /*yield*/, client.query('SELECT currency FROM users WHERE id = $1', [userId])];
                    case 1:
                        userResult = _a.sent();
                        if (userResult.rows.length === 0) {
                            throw new Error('User not found');
                        }
                        currency = userResult.rows[0].currency || 'USD';
                        freespinsCount = Math.floor(challenge.reward_value);
                        defaultVendor = 'pragmatic';
                        defaultGameId = 23000;
                        defaultBetAmount = 0.20;
                        campaignCode = innova_campaigns_service_1.default.generateCampaignCode('challenge', challengeId, userId);
                        beginsAt = innova_campaigns_service_1.default.getCurrentTimestamp();
                        expiresAt = innova_campaigns_service_1.default.getDefaultExpiryTimestamp(24);
                        // Create campaign in Innova
                        return [4 /*yield*/, innova_campaigns_service_1.default.createCampaign({
                                vendor: defaultVendor,
                                campaign_code: campaignCode,
                                currency_code: currency,
                                freespins_per_player: freespinsCount,
                                begins_at: beginsAt,
                                expires_at: expiresAt,
                                games: [
                                    {
                                        game_id: defaultGameId,
                                        total_bet: defaultBetAmount
                                    }
                                ],
                                players: [userId.toString()]
                            })];
                    case 2:
                        // Create campaign in Innova
                        _a.sent();
                        console.log("[CHALLENGES] Innova campaign created: ".concat(campaignCode));
                        // Save campaign in database
                        return [4 /*yield*/, client.query("INSERT INTO user_free_spins_campaigns (\n          user_id, campaign_code, source, source_id,\n          vendor, game_id, currency_code,\n          freespins_total, freespins_remaining,\n          total_bet_amount, status,\n          begins_at, expires_at\n        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, to_timestamp($12), to_timestamp($13))", [
                                userId,
                                campaignCode,
                                'challenge',
                                challengeId,
                                defaultVendor,
                                defaultGameId,
                                currency,
                                freespinsCount,
                                freespinsCount, // freespins_remaining starts at total
                                defaultBetAmount * freespinsCount, // total_bet_amount
                                'pending',
                                beginsAt,
                                expiresAt
                            ])];
                    case 3:
                        // Save campaign in database
                        _a.sent();
                        console.log("[CHALLENGES] Free spins campaign saved to database for user ".concat(userId));
                        return [3 /*break*/, 5];
                    case 4:
                        error_4 = _a.sent();
                        console.error("[CHALLENGES] Error granting free spins campaign:", error_4.message);
                        throw new Error("Failed to grant free spins: ".concat(error_4.message));
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return ChallengesService;
}());
exports.default = new ChallengesService();

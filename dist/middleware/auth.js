"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.authenticateToken = void 0;
// Re-export auth middleware for enterprise routes
var auth_middleware_1 = require("../middlewares/auth.middleware");
Object.defineProperty(exports, "authenticateToken", { enumerable: true, get: function () { return auth_middleware_1.authenticateToken; } });
const authorize_1 = require("../middlewares/authorize");
// Admin role middleware
const isAdmin = (req, res, next) => {
    (0, authorize_1.authorize)(["Admin"])(req, res, next);
};
exports.isAdmin = isAdmin;

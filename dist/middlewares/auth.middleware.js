"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuth = exports.authenticateToken = exports.authMiddleware = exports.authenticate = void 0;
const authenticate_1 = require("./authenticate");
const authorize_1 = require("./authorize");
// Export authenticate function
exports.authenticate = authenticate_1.authenticate;
exports.authMiddleware = authenticate_1.authenticate;
exports.authenticateToken = authenticate_1.authenticate; // Alias for backwards compatibility
// Admin authorization middleware
const adminAuth = (req, res, next) => {
    (0, authorize_1.authorize)(["Admin"])(req, res, next);
};
exports.adminAuth = adminAuth;

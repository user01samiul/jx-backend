"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isManager = exports.isSupport = exports.isAdmin = void 0;
// Re-export role middleware
const authorize_1 = require("../middlewares/authorize");
// Admin role middleware
const isAdmin = (req, res, next) => {
    (0, authorize_1.authorize)(["Admin"])(req, res, next);
};
exports.isAdmin = isAdmin;
// Support role middleware
const isSupport = (req, res, next) => {
    (0, authorize_1.authorize)(["Support", "Admin"])(req, res, next);
};
exports.isSupport = isSupport;
// Manager role middleware
const isManager = (req, res, next) => {
    (0, authorize_1.authorize)(["Manager", "Admin"])(req, res, next);
};
exports.isManager = isManager;

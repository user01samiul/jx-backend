"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
var authorize = function (allowedRoles) {
    return function (req, res, next) {
        var user = req.user;
        if (!user || !user.role) {
            console.log('[AUTHORIZE] No user or role found');
            res.status(401).json({
                success: false,
                message: "Unauthorized: No user found",
            });
            return;
        }
        // Case-insensitive role comparison (Admin === admin)
        var userRoleLower = user.role.toLowerCase();
        var hasPermission = allowedRoles.some(function (role) { return role.toLowerCase() === userRoleLower; });
        console.log("[AUTHORIZE] User role: ".concat(user.role, ", Allowed: [").concat(allowedRoles.join(', '), "], Has permission: ").concat(hasPermission));
        if (!hasPermission) {
            res.status(403).json({
                success: false,
                message: "Forbidden: Insufficient permissions",
            });
            return;
        }
        next();
    };
};
exports.authorize = authorize;

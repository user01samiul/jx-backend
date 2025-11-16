"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const authorize = (allowedRoles) => (req, res, next) => {
    const user = req.user;
    if (!user || !user.role) {
        console.log('[AUTHORIZE] No user or role found');
        res.status(401).json({
            success: false,
            message: "Unauthorized: No user found",
        });
        return;
    }
    // Case-insensitive role comparison (Admin === admin)
    const userRoleLower = user.role.toLowerCase();
    const hasPermission = allowedRoles.some(role => role.toLowerCase() === userRoleLower);
    console.log(`[AUTHORIZE] User role: ${user.role}, Allowed: [${allowedRoles.join(', ')}], Has permission: ${hasPermission}`);
    if (!hasPermission) {
        res.status(403).json({
            success: false,
            message: "Forbidden: Insufficient permissions",
        });
        return;
    }
    next();
};
exports.authorize = authorize;

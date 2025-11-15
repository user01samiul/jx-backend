"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = void 0;
const adminMiddleware = (req, res, next) => {
    const user = req.user;
    if (!user || !user.role) {
        res.status(401).json({
            success: false,
            message: 'Unauthorized: No user found'
        });
        return;
    }
    // Case-insensitive role check (Admin === admin)
    if (user.role.toLowerCase() !== 'admin') {
        res.status(403).json({
            success: false,
            message: 'Forbidden: Admin access required'
        });
        return;
    }
    next();
};
exports.adminMiddleware = adminMiddleware;

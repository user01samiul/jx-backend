"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerAuthMiddleware = void 0;
const env_1 = require("../configs/env");
const swaggerAuthMiddleware = (req, res, next) => {
    // Skip authentication in development mode if no password is set
    if (env_1.env.NODE_ENV === 'development' && env_1.env.SWAGGER_PASSWORD === 'admin123') {
        next();
        return;
    }
    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        // Return 401 with WWW-Authenticate header to trigger browser auth dialog
        res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
        res.status(401).json({
            success: false,
            message: 'Authentication required for Swagger documentation'
        });
    }
    try {
        // Decode base64 credentials
        const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
        const [username, password] = credentials.split(':');
        // Check if password matches (username can be anything)
        if (password === env_1.env.SWAGGER_PASSWORD) {
            next();
            return;
        }
        else {
            res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
            res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
    }
    catch (error) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
        res.status(401).json({
            success: false,
            message: 'Invalid authorization header'
        });
    }
};
exports.swaggerAuthMiddleware = swaggerAuthMiddleware;

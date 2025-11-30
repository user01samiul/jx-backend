"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var config_1 = require("../configs/config");
var authenticate = function (req, res, next) {
    var _a;
    var authHeader = req.headers.authorization;
    console.log("[AUTH] Authenticating request to:", req.path);
    console.log("[AUTH] Auth header:", authHeader ? "present" : "missing");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.log("[AUTH] Missing or invalid authorization header");
        res.status(401).json({ status: 401, message: "Missing or invalid token" });
        return;
    }
    var token = authHeader.split(" ")[1];
    console.log("[AUTH] Token extracted, length:", token === null || token === void 0 ? void 0 : token.length);
    console.log("[AUTH] Using secret (first 10 chars):", (_a = config_1.Config.jwt.accessSecret) === null || _a === void 0 ? void 0 : _a.substring(0, 10));
    try {
        var decoded = jsonwebtoken_1.default.verify(token, config_1.Config.jwt.accessSecret);
        console.log("[AUTH] Token verified successfully for user:", decoded.username);
        req.user = decoded;
        next();
    }
    catch (err) {
        console.error("[AUTH] JWT verification error:", err.message);
        console.error("[AUTH] Error name:", err.name);
        res.status(401).json({ status: 401, message: "Invalid or expired token" });
    }
};
exports.authenticate = authenticate;

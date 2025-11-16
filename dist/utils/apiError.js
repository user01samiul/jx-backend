"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
class ApiError extends Error {
    status;
    statusCode; // Alias for compatibility
    constructor(message, status = 500) {
        super(message);
        this.status = status;
        this.statusCode = status; // Set both for compatibility
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.ApiError = ApiError;

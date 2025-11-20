"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuccessMessages = exports.ErrorMessages = void 0;
exports.ErrorMessages = {
    USER_NOT_FOUND: "User not found.",
    INVALID_CREDENTIALS: "Invalid email or password.",
    SERVER_ERROR: "Something went wrong. Please try again.",
    INTERNAL_SERVER_ERROR: "Internal server error. Please try again later.",
    INVALID_EMAIL: "Invalid email format",
    INVALID_USERNAME: "Username minimum 5 characters",
    INVALID_PASSWORD: "Password minimum 8 characters ",
    EXPIRED_ACCESS_TOKEN: "Access token expired",
    INVALID_ACCESS_TOKEN: "Invalid access token",
    EXPIRED_REFRESH_TOKEN: "Refresh token expired",
    INVALID_REFRESH_TOKEN: "Invalid refresh token",
    MONGO_CONNECTION_ERROR: "MONGO_URI is not defined in environment variables.",
    POSTGRES_CONNECTION_ERROR: "Missing required database env vars",
    INVALID_CAPTCHA: "Invalid captcha",
    CAPTCHA_EXPIRED: "Captcha has expired",
    CAPTCHA_REQUIRED: "Captcha is required",
    QR_GENERATION_FAILED: "Failed to generate QR code",
    INVALID_2FA_CODE: "Invalid 2FA authentication code",
    TWOFA_REQUIRED: "2FA authentication code is required",
};
exports.SuccessMessages = {
    USER_CREATED: "User created successfully.",
    REGISTER_SUCCESS: "Registered Successfully",
    LOGIN_SUCCESS: "Login Successfully"
};

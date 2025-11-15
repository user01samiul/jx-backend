"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMongo = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("../configs/config");
const apiError_1 = require("../utils/apiError");
const messages_1 = require("../constants/messages");
const connectMongo = async () => {
    const mongoUri = config_1.Config.db.mongoUri;
    if (!mongoUri) {
        throw new apiError_1.ApiError(messages_1.ErrorMessages.MONGO_CONNECTION_ERROR, 500);
    }
    try {
        const conn = await mongoose_1.default.connect(mongoUri);
        console.log(`MongoDB connected: ${conn.connection.host}`);
    }
    catch (err) {
        console.error("MongoDB connection failed:", err);
        process.exit(1); // Exit process if unable to connect
    }
};
exports.connectMongo = connectMongo;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const env_1 = require("./env");
exports.Config = {
    db: {
        host: env_1.env.DB_HOST,
        port: env_1.env.DB_PORT,
        user: env_1.env.DB_USER,
        password: env_1.env.DB_PASS,
        database: env_1.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        mongoUri: env_1.env.MONGO_URI
    },
    jwt: {
        accessSecret: env_1.env.JWT_ACCESS_SECRET,
        refreshSecret: env_1.env.JWT_REFRESH_SECRET,
        accessTokenExpiresIn: env_1.env.JWT_ACCESS_TOKEN_EXPIRES,
        refreshTokenExpiresIn: env_1.env.JWT_REFRESH_TOKEN_EXPIRES,
    },
    port: env_1.env.PORT,
    env: env_1.env.NODE_ENV,
    swaggerPassword: env_1.env.SWAGGER_PASSWORD,
    // listPerPage: 10
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var pg_1 = require("pg");
var config_1 = require("../configs/config");
var apiError_1 = require("../utils/apiError");
var messages_1 = require("../constants/messages");
var _a = config_1.Config.db, host = _a.host, user = _a.user, password = _a.password, database = _a.database, //db name
port = _a.port;
if (!host || !user || !password || !database || !port) {
    throw new apiError_1.ApiError(messages_1.ErrorMessages.POSTGRES_CONNECTION_ERROR, 500);
}
var pool = new pg_1.Pool({
    host: host,
    user: user,
    password: password,
    database: database,
    port: Number(port),
    // Enterprise-level timeout settings for millions of users
    connectionTimeoutMillis: 30000, // 30 seconds to connect (enterprise-level)
    idleTimeoutMillis: 60000, // 60 seconds idle timeout (enterprise-level)
    max: 500, // Enterprise-level maximum number of clients
    // Enterprise-level query timeouts
    statement_timeout: 60000, // 60 seconds query timeout (enterprise-level)
    query_timeout: 60000, // 60 seconds query timeout (enterprise-level)
    // Enterprise-level optimizations
    allowExitOnIdle: false,
    maxUses: 10000
});
exports.default = pool;

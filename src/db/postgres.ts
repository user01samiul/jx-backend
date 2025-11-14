import { Pool } from 'pg';
import { Config } from '../configs/config';
import { ApiError } from '../utils/apiError';
import { ErrorMessages } from '../constants/messages';

const {
  host,
  user,
  password,
  database, //db name
  port
} = Config.db;

if (!host || !user || !password || !database || !port) {
  throw new ApiError(ErrorMessages.POSTGRES_CONNECTION_ERROR, 500);   
}

const pool = new Pool({
  host, 
  user, 
  password, 
  database, 
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

export default pool;
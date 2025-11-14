import { env } from './env';

export const Config = {
  db: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    mongoUri: env.MONGO_URI
  },
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTokenExpiresIn: env.JWT_ACCESS_TOKEN_EXPIRES,
    refreshTokenExpiresIn: env.JWT_REFRESH_TOKEN_EXPIRES,
  },
  port: env.PORT,
  env: env.NODE_ENV,
  swaggerPassword: env.SWAGGER_PASSWORD,
  // listPerPage: 10
} as const;

export type Config = typeof Config[keyof typeof Config];

// src/services/jwt.service.ts

import jwt, { JwtPayload, SignOptions, VerifyOptions } from 'jsonwebtoken';
import { Config } from '../../configs/config';
import { TokenPayload, TokenPayloadSchema } from './jwt.schema';
import { ApiError } from '../../utils/apiError';
import { ErrorMessages } from '../../constants/messages';

export class JwtService {
  private accessSecret: string;
  private refreshSecret: string;
  private accessTokenExpiresIn: string;
  private refreshTokenExpiresIn: string;

  constructor() {
    this.accessSecret = Config.jwt.accessSecret;
    this.refreshSecret = Config.jwt.refreshSecret;
    this.accessTokenExpiresIn = Config.jwt.accessTokenExpiresIn;
    this.refreshTokenExpiresIn = Config.jwt.refreshTokenExpiresIn;
  }

  signAccessToken(payload: object, options: SignOptions = {}): string {
    const accessTokenOptions: SignOptions = {
      expiresIn: this.accessTokenExpiresIn as jwt.SignOptions['expiresIn'],
      ...options,
    }
    return jwt.sign(payload, this.accessSecret, accessTokenOptions);
  }

  signRefreshToken(payload: object, options: SignOptions = {}): string {
    const refreshTokenOptions: SignOptions = {
      expiresIn: this.refreshTokenExpiresIn as jwt.SignOptions['expiresIn'],
      ...options,
    };
    console.log("[JWT] Signing refresh token with secret:", this.refreshSecret);
    return jwt.sign(payload, this.refreshSecret, refreshTokenOptions);
  }

  verifyAccessToken(token: string, options: VerifyOptions = {}): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.accessSecret, options);
      return TokenPayloadSchema.parse(decoded); // runtime validation
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new ApiError(ErrorMessages.EXPIRED_ACCESS_TOKEN, 401);
      }
      if (err.name === 'JsonWebTokenError') {
        throw new ApiError(ErrorMessages.INVALID_ACCESS_TOKEN, 401);
      }
      throw err;
    }
  }

  verifyRefreshToken(token: string, options: VerifyOptions = {}): TokenPayload {
    try {
      console.log("[JWT] Verifying refresh token with secret:", this.refreshSecret);
      const decoded = jwt.verify(token, this.refreshSecret, options);
      console.log("[JWT] Decoded refresh token:", decoded);
      return TokenPayloadSchema.parse(decoded); // runtime validation
    } catch (err: any) {
      console.error("[JWT] Refresh token verification error:", err.message);
      if (err.name === 'TokenExpiredError') {
        throw new ApiError(ErrorMessages.EXPIRED_REFRESH_TOKEN, 401);
      }
      if (err.name === 'JsonWebTokenError') {
        throw new ApiError(ErrorMessages.INVALID_REFRESH_TOKEN, 401);
      }
      throw err;
    }
  }

  decode<T = JwtPayload>(token: string): T | null {
    return jwt.decode(token) as T | null;
  }
}
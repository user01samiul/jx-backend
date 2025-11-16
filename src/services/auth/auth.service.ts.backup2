import pool from "../../db/postgres";
import bcrypt from "bcrypt";
import { LoginInput, RegisterInput } from "../../api/auth/auth.schema";
import { ErrorMessages, SuccessMessages } from "../../constants/messages";
import { Query } from "../../api/auth/auth.query";
import { LoginResponse, RegisterResponse } from "../../api/auth/types/auth";
import { JwtService } from '../jwt/jwt.service';
import { ApiError } from "../../utils/apiError";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Config } from "../../configs/config";
import { getUserByUsernameService, getUserRolesService, getUserByEmailService } from "../user/user.service";
import { logUserActivity } from "../user/user-activity.service";
import { captchaService } from "../captcha/captcha.service";
import axios from "axios";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

const jwtService = new JwtService();

/**
 * Validate Google Authenticator code
 */
const validateAuthCode = async (authCode: string, authSecret: string): Promise<boolean> => {
  try {
    console.log(`[2FA] Validating code: ${authCode} with secret: ${authSecret}`);
    
    const response = await axios.post('http://46.250.232.119:86/api/authenticate', {
      one_time_password: authCode,
      secret: authSecret
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`[2FA] API Response:`, response.data);

    // Check if the response indicates successful authentication
    const isValid = response.data.status === 'success' && response.data.code === '200';
    console.log(`[2FA] Validation result: ${isValid}`);
    
    return isValid;
  } catch (error) {
    console.error('Auth API Error:', error);
    return false;
  }
};

export const loginService = async (
  identifier: string, // can be username or email
  password: string,
  authCode?: string,
  roleId?: number,
  req?: Request
): Promise<LoginResponse> => {
  console.log(`[LOGIN] Attempting login for: ${identifier}, auth_code: ${authCode || 'not provided'}`);
  
  // Determine if identifier is email or username
  let user;
  if (identifier.includes("@")) {
    user = await getUserByEmailService(identifier);
  } else {
    user = await getUserByUsernameService(identifier);
  }
  
  if (!user) {
    throw new ApiError(ErrorMessages.INVALID_CREDENTIALS, 401);
  }

  console.log(`[LOGIN] User found: ${user.username}, has auth_secret: ${!!user.auth_secret}, is_2fa_enabled: ${user.is_2fa_enabled}`);

  // If 2FA is enabled, require only 2FA code (skip password check)
  if (user.is_2fa_enabled && user.auth_secret) {
    console.log(`[LOGIN] User has 2FA enabled, validating code...`);
    if (!authCode) {
      console.log(`[LOGIN] No auth_code provided but 2FA is enabled`);
      throw new ApiError(ErrorMessages.TWOFA_REQUIRED, 401);
    }
    const isAuthCodeValid = await validateAuthCode(authCode, user.auth_secret);
    console.log(`[LOGIN] 2FA validation result: ${isAuthCodeValid}`);
    if (!isAuthCodeValid) {
      throw new ApiError(ErrorMessages.INVALID_2FA_CODE, 401);
    }
  } else {
    // If 2FA is not enabled, require password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(ErrorMessages.INVALID_CREDENTIALS, 401);
    }
  }

  // Get user roles
  const userRolesResult = await pool.query(
    "SELECT r.id, r.name, r.description FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1",
    [user.id]
  );
  const userRoles = userRolesResult.rows;
  if (userRoles.length === 0) {
    throw new ApiError('User has no assigned roles', 401);
  }
  
  // Determine which role to use
  let selectedRole = userRoles[0];
  if (roleId) {
    const requestedRole = userRoles.find(role => role.id === roleId);
    if (requestedRole) {
      selectedRole = requestedRole;
    } else {
      throw new ApiError('Invalid role for user', 401);
    }
  }

  if (!selectedRole) {
    throw new ApiError('No valid role found for user', 401);
  }

  const payload = { 
    userId: user.id, 
    username: user.username,
    role: selectedRole.name,
    roleId: selectedRole.id
  };

  const accessToken = jwtService.signAccessToken(payload);
  const refreshToken = jwtService.signRefreshToken(payload);

  // Store tokens in the database for provider authentication
  const tokenExpiry = new Date();
  tokenExpiry.setDate(tokenExpiry.getDate() + 30); // 30 days expiry
  
  // Upsert token for this user
  await pool.query(
    `INSERT INTO tokens (user_id, access_token, refresh_token, expired_at, is_active)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (access_token) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       refresh_token = EXCLUDED.refresh_token,
       expired_at = EXCLUDED.expired_at,
       is_active = EXCLUDED.is_active`,
    [user.id, accessToken, refreshToken, tokenExpiry, true]
  );

  // Log user login activity
  await logUserActivity({
    userId: user.id,
    action: "login",
    category: "auth",
    description: "User logged in",
    ipAddress: req?.ip || undefined,
    userAgent: req?.headers["user-agent"] || undefined,
  });

  // If admin login, also log to admin_activities
  if (selectedRole.name === 'Admin') {
    try {
      await pool.query(
        `INSERT INTO admin_activities (admin_id, action, details, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          user.id,
          'admin_login',
          JSON.stringify({ username: user.username, role: selectedRole.name, timestamp: new Date().toISOString() }),
          req?.ip || req?.headers['x-forwarded-for'] || null,
          req?.headers["user-agent"] || null
        ]
      );
      console.log(`[AdminActivity] Admin login logged for user ${user.id}`);
    } catch (error) {
      console.error('[AdminActivity] Error logging admin login:', error);
    }
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    role: {
      id: selectedRole.id,
      name: selectedRole.name,
      description: selectedRole.description || null
    }
  };
};

/**
 * Generate 2FA QR code locally using speakeasy + qrcode
 * This is used as fallback when external API fails
 */
const generateLocalQRCode = async (email: string, username: string): Promise<{ secret: string; qr_code: string }> => {
  try {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `JackpotX (${username})`,
      issuer: 'JackpotX',
      length: 32
    });

    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url || '');

    console.log('[QR] Generated 2FA QR code locally for:', username);

    return {
      secret: secret.base32,
      qr_code: qrCodeDataURL
    };
  } catch (error) {
    console.error('[QR] Local QR generation failed:', error);
    throw error;
  }
};

/**
 * Fetch QR code data from external API with local fallback
 * Returns null on failure to allow registration to continue
 */
const fetchQRData = async (email: string, username: string = 'user'): Promise<{ secret: string; qr_code: string } | null> => {
  // Try external API first (with short timeout)
  try {
    const response = await axios.get('http://46.250.232.119:86/api/get-qr-with-secret', {
      params: { email },
      timeout: 3000 // 3 second timeout
    });

    if (response.data.status === 'success') {
      console.log('[QR] Generated QR code via external API');
      return {
        secret: response.data.secret,
        qr_code: response.data.qr_code
      };
    }
  } catch (error) {
    console.warn('[QR] External API failed, using local generation:', error.message);
  }

  // Fallback to local generation
  try {
    return await generateLocalQRCode(email, username);
  } catch (error) {
    console.error('[QR] Both external and local QR generation failed - continuing without 2FA');
    return null;
  }
};

export const registerService = async (
  reqBody: RegisterInput
): Promise<RegisterResponse> => {
  try {
    const { username, email, password, type, captcha_id, captcha_text, referral_code } = reqBody;

    // Validate captcha first (allow admin bypass)
    if (captcha_id !== 'admin_bypass' || captcha_text !== 'admin_bypass') {
      const isCaptchaValid = captchaService.validateCaptcha(captcha_id, captcha_text);
      if (!isCaptchaValid) {
        throw new ApiError(ErrorMessages.INVALID_CAPTCHA, 400);
      }
    }

    // Fetch QR data with local fallback (optional - can be null)
    const qrData = await fetchQRData(email, username);

    const hashedPassword = await bcrypt.hash(password, 10);

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create user with QR data (null if QR generation failed)
      const userResult = await client.query(
        Query.REGISTER_USER,
        [username, email, hashedPassword, qrData?.secret || null, qrData?.qr_code || null]
      );

      if (userResult.rows.length === 0) {
        throw new ApiError('User creation failed', 500);
      }

      const userId = userResult.rows[0].id;

      // Assign role based on type
      const roleResult = await client.query(
        'SELECT id FROM roles WHERE name = $1',
        [type]
      );
      if (roleResult.rows.length === 0) {
        throw new ApiError(`Role '${type}' not found`, 400);
      }
      const roleId = roleResult.rows[0].id;
      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [userId, roleId]
      );

      // Create initial balance for the new user
      await client.query(
        "INSERT INTO user_balances (user_id, balance) VALUES ($1, $2)",
        [userId, 0.00]
      );

      // Create user profile
      await client.query(
        "INSERT INTO user_profiles (user_id) VALUES ($1)",
        [userId]
      );

      // Assign Bronze level
      const bronzeLevelResult = await client.query(
        "SELECT id FROM user_levels WHERE name = 'Bronze'"
      );

      if (bronzeLevelResult.rows.length > 0) {
        const bronzeLevelId = bronzeLevelResult.rows[0].id;
        await client.query(
          "INSERT INTO user_level_progress (user_id, level_id, current_points, total_points_earned) VALUES ($1, $2, $3, $4)",
          [userId, bronzeLevelId, 0, 0]
        );
      }

      // Handle referral code tracking
      if (referral_code) {
        try {
          // Import affiliate service
          const { AffiliateService } = await import('../affiliate/affiliate.service');
          
          // Record the conversion
          await AffiliateService.recordConversion(
            referral_code,
            'registration',
            userId,
            0 // No conversion amount for registration
          );
          
          console.log(`[AFFILIATE] Referral conversion recorded for user ${userId} with code ${referral_code}`);
        } catch (error) {
          console.error('[AFFILIATE] Referral tracking failed:', error);
          // Don't fail registration if referral tracking fails
        }
      }

      // Log user registration activity
      await client.query(
        `
        INSERT INTO user_activity_logs
        (user_id, action, category, description, metadata)
        VALUES ($1, 'register', 'auth', 'User registered', $2)
        `,
        [
          userId,
          JSON.stringify({
            username: username,
            email: email,
            registration_method: 'email',
            qr_generated: qrData !== null,
            referral_code: referral_code || null
          })
        ]
      );

      await client.query('COMMIT');
      
      // Return success response with QR data
      return {
        message: SuccessMessages.REGISTER_SUCCESS,
        user_id: userId,
        qr_code: qrData.qr_code,
        auth_secret: qrData.secret
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('[REGISTER] Error:', err);
    throw err;
  }
};

export const refreshTokenService = async (
  refreshToken: string
): Promise<LoginResponse> => {
  try {
    const decoded = jwtService.verifyRefreshToken(refreshToken);
    
    const user = await getUserByUsernameService(decoded.username);
    if (!user) {
      throw new Error("User not found");
    }

    const payload = { 
      userId: user.id, 
      username: user.username,
      role: decoded.role,
      roleId: decoded.roleId
    };

    const accessToken = jwtService.signAccessToken(payload);
    const newRefreshToken = jwtService.signRefreshToken(payload);

    // Store new tokens in the database for provider authentication
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 30); // 30 days expiry
    
    // Upsert token for this user
    await pool.query(
      `INSERT INTO tokens (user_id, access_token, refresh_token, expired_at, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (access_token) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         refresh_token = EXCLUDED.refresh_token,
         expired_at = EXCLUDED.expired_at,
         is_active = EXCLUDED.is_active`,
      [user.id, accessToken, newRefreshToken, tokenExpiry, true]
    );

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken
    };
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = req.body?.refresh_token;
    
    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required"
      });
      return;
    }

    const tokens = await refreshTokenService(refreshToken);
    
    res.json({
      success: true,
      message: "Tokens refreshed successfully",
      data: tokens
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};
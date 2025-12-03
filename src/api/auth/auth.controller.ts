import { Request, Response, NextFunction } from "express";
import { loginService, registerService, refreshToken as refreshTokenService, forgotPasswordService, resetPasswordService } from "../../services/auth/auth.service";
import { getUserRolesService, getUserByUsernameService, getUserByEmailService } from "../../services/user/user.service";
import { LoginInput, RegisterInput, ForgotPasswordInput, ResetPasswordInput } from "./auth.schema";
import { SuccessMessages } from "../../constants/messages";
import { captchaService } from "../../services/captcha/captcha.service";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reqBody = req.validated?.body as LoginInput;
    const identifier = reqBody.username;
    if (!identifier) {
      res.status(400).json({ success: false, message: 'Username or email is required' });
      return;
    }

    // Determine if identifier is an email or username
    const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identifier);
    let user;
    if (isEmail) {
      user = await getUserByEmailService(identifier);
    } else {
      user = await getUserByUsernameService(identifier);
    }
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // If 2FA is enabled, require only auth_code
    if (user.is_2fa_enabled && user.auth_secret) {
      if (!reqBody.auth_code) {
        res.status(400).json({
          success: false,
          message: '2FA code is required for this user',
          errors: [{ path: ['auth_code'], message: '2FA code required' }]
        });
        return;
      }
    } else {
      // If 2FA is not enabled, require password
      if (!reqBody.password) {
        res.status(400).json({
          success: false,
          message: 'Password is required for this user',
          errors: [{ path: ['password'], message: 'Password required' }]
        });
        return;
      }
    }

    // Pass identifier as username or email, password, and auth_code as appropriate
    const response = await loginService(identifier, reqBody.password, reqBody.auth_code, reqBody.role_id, req);
    res.json({ success: true, message: SuccessMessages.LOGIN_SUCCESS , token: response });
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reqBody = req.validated?.body as RegisterInput;
    const response = await registerService(reqBody);
    res.json({ 
      success: true, 
      message: response.message,
      data: {
        qr_code: response.qr_code,
        auth_secret: response.auth_secret
      }
    });
  } catch (err) {
    next(err);
  }
};

// ✅ This was missing
export const refreshToken = refreshTokenService;

export const getUserRoles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username } = req.query;
    
    if (!username || typeof username !== 'string') {
      res.status(400).json({ success: false, message: "Username is required" });
      return;
    }

    const roles = await getUserRolesService(username);
    res.json({ success: true, data: roles });
  } catch (err) {
    next(err);
  }
};

export const getCaptcha = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const captcha = captchaService.generateCaptcha();
    res.json({
      success: true,
      data: captcha
    });
  } catch (err) {
    next(err);
  }
};

export const refreshCaptcha = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const captcha = captchaService.generateCaptcha();
    res.json({
      success: true,
      data: captcha
    });
  } catch (err) {
    next(err);
  }
};

export const checkUsername = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username } = req.query;

    // Validate input
    if (!username || typeof username !== 'string') {
      res.json({
        success: false,
        message: 'Username is required'
      });
      return;
    }

    if (username.length < 3) {
      res.json({
        success: false,
        message: 'Username must be at least 3 characters long'
      });
      return;
    }

    // Check database (case-insensitive)
    const existingUser = await getUserByUsernameService(username);

    res.json({
      success: true,
      data: {
        available: !existingUser,
        message: existingUser ? 'Username already exists' : 'Username is available'
      }
    });
  } catch (err) {
    console.error('Username check error:', err);
    res.status(500).json({
      success: false,
      message: 'Error checking username availability'
    });
  }
};

export const checkEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.query;

    // Validate input
    if (!email || typeof email !== 'string') {
      res.json({
        success: false,
        message: 'Email is required'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.json({
        success: false,
        message: 'Invalid email format'
      });
      return;
    }

    // Check database (case-insensitive)
    const existingUser = await getUserByEmailService(email);

    res.json({
      success: true,
      data: {
        available: !existingUser,
        message: existingUser ? 'Email already registered' : 'Email is available'
      }
    });
  } catch (err) {
    console.error('Email check error:', err);
    res.status(500).json({
      success: false,
      message: 'Error checking email availability'
    });
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reqBody = req.validated?.body as ForgotPasswordInput;
    const { email } = reqBody;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required'
      });
      return;
    }

    const result = await forgotPasswordService(email, req);

    res.json({
      success: true,
      message: result.message
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Failed to process password reset request'
    });
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reqBody = req.validated?.body as ResetPasswordInput;
    const { token, password } = reqBody;

    if (!token || !password) {
      res.status(400).json({
        success: false,
        message: 'Token and password are required'
      });
      return;
    }

    const result = await resetPasswordService(token, password, req);

    res.json({
      success: true,
      message: result.message
    });
  } catch (err: any) {
    console.error('Reset password error:', err);
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Failed to reset password'
    });
  }
};
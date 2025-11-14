import { Request, Response, NextFunction } from 'express';
import { env } from '../configs/env';

export const swaggerAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip authentication in development mode if no password is set
  if (env.NODE_ENV === 'development' && env.SWAGGER_PASSWORD === 'admin123') {
    return next();
  }

  // Get authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    // Return 401 with WWW-Authenticate header to trigger browser auth dialog
    res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required for Swagger documentation' 
    });
  }

  try {
    // Decode base64 credentials
    const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
    const [username, password] = credentials.split(':');

    // Check if password matches (username can be anything)
    if (password === env.SWAGGER_PASSWORD) {
      return next();
    } else {
      res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
  } catch (error) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid authorization header' 
    });
  }
}; 
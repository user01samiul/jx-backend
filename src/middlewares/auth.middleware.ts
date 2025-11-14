import { authenticate as authFunc } from './authenticate';
import { authorize } from './authorize';

// Export authenticate function
export const authenticate = authFunc;
export const authMiddleware = authFunc;
export const authenticateToken = authFunc; // Alias for backwards compatibility

// Admin authorization middleware
export const adminAuth = (req: any, res: any, next: any) => {
  authorize(["Admin"])(req, res, next);
}; 
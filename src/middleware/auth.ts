// Re-export auth middleware for enterprise routes
export { authenticateToken } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize';

// Admin role middleware
export const isAdmin = (req: any, res: any, next: any) => {
  authorize(["Admin"])(req, res, next);
};

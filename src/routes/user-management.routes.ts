import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { Roles } from '../constants/roles';
import * as userManagementController from '../controllers/userManagementController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Admin and Support can view users
router.get(
  '/',
  authorize([Roles.ADMIN, Roles.SUPPORT]),
  userManagementController.getAllUsers
);

router.get(
  '/stats',
  authorize([Roles.ADMIN]),
  userManagementController.getUserStats
);

router.get(
  '/:userId',
  authorize([Roles.ADMIN, Roles.SUPPORT]),
  userManagementController.getUserById
);

// Only Admin can create/update/delete users
router.post(
  '/',
  authorize([Roles.ADMIN]),
  userManagementController.createUser
);

router.put(
  '/:userId',
  authorize([Roles.ADMIN]),
  userManagementController.updateUser
);

router.delete(
  '/:userId',
  authorize([Roles.ADMIN]),
  userManagementController.deleteUser
);

export default router;

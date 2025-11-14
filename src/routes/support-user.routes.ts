import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { Roles } from '../constants/roles';
import * as supportUserController from '../controllers/supportUserController';

const router = Router();

// All routes require authentication and Admin role
router.use(authenticate);
router.use(authorize([Roles.ADMIN]));

// Get all support users
router.get('/', supportUserController.getAllSupportUsers);

// Get support user by ID
router.get('/:userId', supportUserController.getSupportUserById);

// Create new support user
router.post('/', supportUserController.createSupportUser);

// Update support user
router.put('/:userId', supportUserController.updateSupportUser);

// Delete support user (soft delete)
router.delete('/:userId', supportUserController.deleteSupportUser);

// Get support user statistics
router.get('/:userId/stats', supportUserController.getSupportUserStats);

export default router;

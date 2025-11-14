import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { Roles } from '../constants/roles';
import * as roleController from '../controllers/roleController';

const router = Router();

// All routes require authentication and Admin role
router.use(authenticate);
router.use(authorize([Roles.ADMIN]));

// Get all roles
router.get('/', roleController.getAllRoles);

// Get role by ID
router.get('/:roleId', roleController.getRoleById);

// Create new role
router.post('/', roleController.createRole);

// Update role
router.put('/:roleId', roleController.updateRole);

// Delete role
router.delete('/:roleId', roleController.deleteRole);

export default router;

import express from 'express';
import { validate } from '../validations/index.js';
import { authenticate, authorize } from 'shared';
import { applyDepartmentFilter, canManageDepartmentResource } from '../middlewares/departmentScope.js';
import {
    createClassroomSchema,
    updateClassroomSchema,
    getClassroomByIdSchema,
    deleteClassroomSchema,
    getClassroomsSchema,
} from '../validations/index.js';
import classroomController from '../controllers/classroomController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', applyDepartmentFilter, validate(getClassroomsSchema), classroomController.getAll);
router.get('/:id', validate(getClassroomByIdSchema), classroomController.getById);
router.post('/', authorize('super_admin','admin','program_controller'), canManageDepartmentResource, validate(createClassroomSchema), classroomController.create);
router.patch('/:id', authorize('super_admin','admin','program_controller'), canManageDepartmentResource, validate(updateClassroomSchema), classroomController.update);
router.delete('/:id', authorize('super_admin','admin','program_controller'), canManageDepartmentResource, validate(deleteClassroomSchema), classroomController.delete);

export default router;

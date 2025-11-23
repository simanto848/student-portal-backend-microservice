import express from 'express';
import { validate } from '../validations/index.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { applyDepartmentFilter, canManageDepartmentResource } from '../middlewares/departmentScope.js';
import {
    createCoursePrerequisiteSchema,
    updateCoursePrerequisiteSchema,
    getCoursePrerequisiteByIdSchema,
    deleteCoursePrerequisiteSchema,
    getCoursePrerequisitesSchema,
} from '../validations/index.js';
import coursePrerequisiteController from '../controllers/coursePrerequisiteController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', applyDepartmentFilter, validate(getCoursePrerequisitesSchema), coursePrerequisiteController.getAll);
router.get('/:id', validate(getCoursePrerequisiteByIdSchema), coursePrerequisiteController.getById);
router.post('/', authorize('super_admin','admin','program_controller'), canManageDepartmentResource, validate(createCoursePrerequisiteSchema), coursePrerequisiteController.create);
router.patch('/:id', authorize('super_admin','admin','program_controller'), canManageDepartmentResource, validate(updateCoursePrerequisiteSchema), coursePrerequisiteController.update);
router.delete('/:id', authorize('super_admin','admin','program_controller'), canManageDepartmentResource, validate(deleteCoursePrerequisiteSchema), coursePrerequisiteController.delete);

export default router;

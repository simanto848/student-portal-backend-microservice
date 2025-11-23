import express from 'express';
import { validate } from '../validations/index.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { applyDepartmentFilter, canManageDepartmentResource } from '../middlewares/departmentScope.js';
import {
    createCourseSyllabusSchema,
    updateCourseSyllabusSchema,
    getCourseSyllabusByIdSchema,
    deleteCourseSyllabusSchema,
    getCourseSyllabusesSchema,
    approveSyllabusSchema,
    publishSyllabusSchema,
} from '../validations/index.js';
import courseSyllabusController from '../controllers/courseSyllabusController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', applyDepartmentFilter, validate(getCourseSyllabusesSchema), courseSyllabusController.getAll);
router.get('/:id', validate(getCourseSyllabusByIdSchema), courseSyllabusController.getById);
router.post('/', authorize('super_admin','admin','program_controller'), canManageDepartmentResource, validate(createCourseSyllabusSchema), courseSyllabusController.create);
router.patch('/:id', authorize('super_admin','admin','program_controller'), canManageDepartmentResource, validate(updateCourseSyllabusSchema), courseSyllabusController.update);
router.delete('/:id', authorize('super_admin','admin','program_controller'), canManageDepartmentResource, validate(deleteCourseSyllabusSchema), courseSyllabusController.delete);

router.post('/:id/approve', authorize('super_admin','admin'), validate(approveSyllabusSchema), courseSyllabusController.approveSyllabus);
router.post('/:id/publish', authorize('super_admin','admin'), validate(publishSyllabusSchema), courseSyllabusController.publishSyllabus);

export default router;

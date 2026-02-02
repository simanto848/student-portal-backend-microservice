import express from 'express';
import { validate } from '../validations/index.js';
import { authenticate, authorize } from 'shared';
import { applyDepartmentFilter, canManageDepartmentResource } from '../middlewares/departmentScope.js';
import {
  createCourseSchema,
  updateCourseSchema,
  getCourseByIdSchema,
  deleteCourseSchema,
  getCoursesSchema,
} from '../validations/index.js';
import courseController from '../controllers/courseController.js';
import coursePrerequisiteRoutes from './coursePrerequisiteRoutes.js';
import courseSyllabusRoutes from './courseSyllabusRoutes.js';

const router = express.Router();

router.use(authenticate);

router.use('/prerequisites', coursePrerequisiteRoutes);
router.use('/syllabus', courseSyllabusRoutes);

router.get('/', applyDepartmentFilter, validate(getCoursesSchema), courseController.getAll);
router.get('/:id', validate(getCourseByIdSchema), courseController.getById);
router.post('/', authorize('super_admin', 'admin', 'program_controller'), canManageDepartmentResource, validate(createCourseSchema), courseController.create);
router.patch('/:id', authorize('super_admin', 'admin', 'program_controller'), canManageDepartmentResource, validate(updateCourseSchema), courseController.update);
router.delete('/:id', authorize('super_admin', 'admin', 'program_controller'), canManageDepartmentResource, validate(deleteCourseSchema), courseController.delete);

export default router;

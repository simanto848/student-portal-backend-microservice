import express from 'express';
import { validate } from '../validations/index.js';
import { authenticate, authorize } from 'shared';
import { applyDepartmentFilter, canManageDepartmentResource } from '../middlewares/departmentScope.js';
import {
    createCourseScheduleSchema,
    updateCourseScheduleSchema,
    getCourseScheduleByIdSchema,
    deleteCourseScheduleSchema,
    getCourseSchedulesSchema,
    getBatchScheduleSchema,
    getTeacherScheduleSchema,
} from '../validations/index.js';
import courseScheduleController from '../controllers/courseScheduleController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', applyDepartmentFilter, validate(getCourseSchedulesSchema), courseScheduleController.getAll);
router.get('/:id', validate(getCourseScheduleByIdSchema), courseScheduleController.getById);
router.post('/', authorize('super_admin','admin','program_controller'), canManageDepartmentResource, validate(createCourseScheduleSchema), courseScheduleController.create);
router.patch('/:id', authorize('super_admin','admin','program_controller'), canManageDepartmentResource, validate(updateCourseScheduleSchema), courseScheduleController.update);
router.delete('/:id', authorize('super_admin','admin','program_controller'), canManageDepartmentResource, validate(deleteCourseScheduleSchema), courseScheduleController.delete);

router.get('/batch/:batchId', validate(getBatchScheduleSchema), courseScheduleController.getScheduleByBatch);
router.get('/teacher/:teacherId', validate(getTeacherScheduleSchema), courseScheduleController.getScheduleByTeacher);

export default router;

import express from 'express';
import { validate } from '../validations/index.js';
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

router.get('/', validate(getCourseSchedulesSchema), courseScheduleController.getAll);
router.get('/:id', validate(getCourseScheduleByIdSchema), courseScheduleController.getById);
router.post('/', validate(createCourseScheduleSchema), courseScheduleController.create);
router.patch('/:id', validate(updateCourseScheduleSchema), courseScheduleController.update);
router.delete('/:id', validate(deleteCourseScheduleSchema), courseScheduleController.delete);

router.get('/batch/:batchId', validate(getBatchScheduleSchema), courseScheduleController.getScheduleByBatch);
router.get('/teacher/:teacherId', validate(getTeacherScheduleSchema), courseScheduleController.getScheduleByTeacher);

export default router;


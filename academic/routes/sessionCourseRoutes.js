import express from 'express';
import { validate } from '../validations/index.js';
import {
    createSessionCourseSchema,
    updateSessionCourseSchema,
    getSessionCourseByIdSchema,
    deleteSessionCourseSchema,
    getSessionCoursesSchema,
    getBatchSessionCoursesSchema,
} from '../validations/index.js';
import sessionCourseController from '../controllers/sessionCourseController.js';

const router = express.Router();

router.get('/', validate(getSessionCoursesSchema), sessionCourseController.getAll);
router.get('/:id', validate(getSessionCourseByIdSchema), sessionCourseController.getById);
router.post('/', validate(createSessionCourseSchema), sessionCourseController.create);
router.patch('/:id', validate(updateSessionCourseSchema), sessionCourseController.update);
router.delete('/:id', validate(deleteSessionCourseSchema), sessionCourseController.delete);

router.get('/batch/:batchId', validate(getBatchSessionCoursesSchema), sessionCourseController.getBatchSessionCourses);

export default router;


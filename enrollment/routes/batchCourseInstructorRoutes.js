import express from 'express';
import batchCourseInstructorController from '../controllers/batchCourseInstructorController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import {
    createBatchCourseInstructorSchema,
    updateBatchCourseInstructorSchema,
    getBatchCourseInstructorSchema,
    listBatchCourseInstructorsSchema,
} from '../validations/batchCourseInstructorValidation.js';

const router = express.Router();

router.use(authenticate)

router.post('/', authorize('super_admin', 'admin'), validate(createBatchCourseInstructorSchema), batchCourseInstructorController.assignInstructor);
router.get('/', authorize('super_admin', 'admin', 'teacher'), validate(listBatchCourseInstructorsSchema), batchCourseInstructorController.listAssignments);
router.get('/instructor/:instructorId/courses', authorize('super_admin', 'admin', 'teacher'), batchCourseInstructorController.getInstructorCourses);
router.get('/course/instructors', authorize('super_admin', 'admin', 'teacher'), batchCourseInstructorController.getCourseInstructors);
router.get('/:id', authorize('super_admin', 'admin', 'teacher'), validate(getBatchCourseInstructorSchema), batchCourseInstructorController.getAssignment);
router.put('/:id', authorize('super_admin', 'admin'), validate(updateBatchCourseInstructorSchema), batchCourseInstructorController.updateAssignment);
router.delete('/:id', authorize('super_admin', 'admin'), validate(getBatchCourseInstructorSchema), batchCourseInstructorController.deleteAssignment);

export default router;
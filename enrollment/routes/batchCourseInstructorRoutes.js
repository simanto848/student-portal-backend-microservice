import express from 'express';
import batchCourseInstructorController from '../controllers/batchCourseInstructorController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
    createBatchCourseInstructorSchema,
    updateBatchCourseInstructorSchema,
    getBatchCourseInstructorSchema,
    listBatchCourseInstructorsSchema,
} from '../validations/batchCourseInstructorValidation.js';

const router = express.Router();

// Admin/Super Admin only routes
router.post(
    '/',
    authenticate,
    authorize('super_admin', 'admin'),
    validate(createBatchCourseInstructorSchema),
    batchCourseInstructorController.assignInstructor
);

router.get(
    '/',
    authenticate,
    authorize('super_admin', 'admin', 'teacher'),
    validate(listBatchCourseInstructorsSchema),
    batchCourseInstructorController.listAssignments
);

router.get(
    '/:id',
    authenticate,
    authorize('super_admin', 'admin', 'teacher'),
    validate(getBatchCourseInstructorSchema),
    batchCourseInstructorController.getAssignment
);

router.put(
    '/:id',
    authenticate,
    authorize('super_admin', 'admin'),
    validate(updateBatchCourseInstructorSchema),
    batchCourseInstructorController.updateAssignment
);

router.delete(
    '/:id',
    authenticate,
    authorize('super_admin', 'admin'),
    validate(getBatchCourseInstructorSchema),
    batchCourseInstructorController.deleteAssignment
);

// Get instructor's courses
router.get(
    '/instructor/:instructorId/courses',
    authenticate,
    authorize('super_admin', 'admin', 'teacher'),
    batchCourseInstructorController.getInstructorCourses
);

// Get course instructors
router.get(
    '/course/instructors',
    authenticate,
    authorize('super_admin', 'admin', 'teacher'),
    batchCourseInstructorController.getCourseInstructors
);

export default router;

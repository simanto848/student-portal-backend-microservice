import express from 'express';
import enrollmentController from '../controllers/enrollmentController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
    createEnrollmentSchema,
    bulkEnrollSchema,
    updateEnrollmentSchema,
    getEnrollmentSchema,
    listEnrollmentsSchema,
} from '../validations/enrollmentValidation.js';

const router = express.Router();

// Admin/Super Admin routes
router.post(
    '/',
    authenticate,
    authorize('super_admin', 'admin'),
    validate(createEnrollmentSchema),
    enrollmentController.enrollStudent
);

router.post(
    '/bulk',
    authenticate,
    authorize('super_admin', 'admin'),
    validate(bulkEnrollSchema),
    enrollmentController.bulkEnrollBatch
);

router.post(
    '/complete-semester',
    authenticate,
    authorize('super_admin', 'admin'),
    enrollmentController.completeBatchSemester
);

// Accessible by admin, teachers, and students
router.get(
    '/',
    authenticate,
    authorize('super_admin', 'admin', 'teacher', 'student'),
    validate(listEnrollmentsSchema),
    enrollmentController.listEnrollments
);

router.get(
    '/:id',
    authenticate,
    authorize('super_admin', 'admin', 'teacher', 'student'),
    validate(getEnrollmentSchema),
    enrollmentController.getEnrollment
);

// Get student's semester enrollments
router.get(
    '/student/:studentId/semester/:semester',
    authenticate,
    authorize('super_admin', 'admin', 'teacher', 'student'),
    enrollmentController.getStudentSemesterEnrollments
);

// Admin only update and delete
router.put(
    '/:id',
    authenticate,
    authorize('super_admin', 'admin'),
    validate(updateEnrollmentSchema),
    enrollmentController.updateEnrollment
);

router.delete(
    '/:id',
    authenticate,
    authorize('super_admin', 'admin'),
    validate(getEnrollmentSchema),
    enrollmentController.deleteEnrollment
);

export default router;

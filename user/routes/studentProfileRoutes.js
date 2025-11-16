import express from 'express';
import studentProfileController from '../controllers/studentProfileController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import {
    studentProfileCreateValidation,
    studentProfileUpdateValidation,
    addEducationRecordValidation,
} from '../validations/studentProfileValidation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /profiles/:studentId
 * Get student profile by student ID
 * Accessible by: admin, staff, teachers, and the student themselves
 */
router.get(
    '/:studentId',
    authorize('admin', 'staff', 'teacher', 'student'),
    studentProfileController.getByStudentId
);

/**
 * POST /profiles/:studentId
 * Create a new student profile
 * Accessible by: admin, staff
 */
router.post(
    '/:studentId',
    authorize('admin', 'staff'),
    validate(studentProfileCreateValidation),
    studentProfileController.create
);

/**
 * PUT /profiles/:studentId
 * Create or update student profile (upsert)
 * Accessible by: admin, staff, and the student themselves
 */
router.put(
    '/:studentId',
    authorize('admin', 'staff', 'student'),
    validate(studentProfileCreateValidation),
    studentProfileController.upsert
);

/**
 * PATCH /profiles/:studentId
 * Update student profile
 * Accessible by: admin, staff, and the student themselves
 */
router.patch(
    '/:studentId',
    authorize('admin', 'staff', 'student'),
    validate(studentProfileUpdateValidation),
    studentProfileController.update
);

/**
 * DELETE /profiles/:studentId
 * Delete student profile (soft delete)
 * Accessible by: admin, staff
 */
router.delete(
    '/:studentId',
    authorize('admin', 'staff'),
    studentProfileController.delete
);

/**
 * POST /profiles/:studentId/restore
 * Restore soft-deleted student profile
 * Accessible by: admin, staff
 */
router.post(
    '/:studentId/restore',
    authorize('admin', 'staff'),
    studentProfileController.restore
);

/**
 * POST /profiles/:studentId/education
 * Add education record to student profile
 * Accessible by: admin, staff, and the student themselves
 */
router.post(
    '/:studentId/education',
    authorize('admin', 'staff', 'student'),
    validate(addEducationRecordValidation),
    studentProfileController.addEducationRecord
);

/**
 * PATCH /profiles/:studentId/education/:index
 * Update education record in student profile
 * Accessible by: admin, staff, and the student themselves
 */
router.patch(
    '/:studentId/education/:index',
    authorize('admin', 'staff', 'student'),
    validate(addEducationRecordValidation),
    studentProfileController.updateEducationRecord
);

/**
 * DELETE /profiles/:studentId/education/:index
 * Remove education record from student profile
 * Accessible by: admin, staff, and the student themselves
 */
router.delete(
    '/:studentId/education/:index',
    authorize('admin', 'staff', 'student'),
    studentProfileController.removeEducationRecord
);

export default router;

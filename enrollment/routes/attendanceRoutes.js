import express from 'express';
import attendanceController from '../controllers/attendanceController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
    createAttendanceSchema,
    bulkAttendanceSchema,
    updateAttendanceSchema,
    getAttendanceSchema,
    listAttendanceSchema,
} from '../validations/attendanceValidation.js';

const router = express.Router();

// Teacher only - mark attendance
router.post(
    '/',
    authenticate,
    authorize('teacher'),
    validate(createAttendanceSchema),
    attendanceController.markAttendance
);

router.post(
    '/bulk',
    authenticate,
    authorize('teacher'),
    validate(bulkAttendanceSchema),
    attendanceController.bulkMarkAttendance
);

// Teacher only - update and delete attendance
router.put(
    '/:id',
    authenticate,
    authorize('teacher'),
    validate(updateAttendanceSchema),
    attendanceController.updateAttendance
);

router.delete(
    '/:id',
    authenticate,
    authorize('teacher'),
    validate(getAttendanceSchema),
    attendanceController.deleteAttendance
);

// Accessible by teachers and students (students see only their own)
router.get(
    '/',
    authenticate,
    authorize('super_admin', 'admin', 'teacher', 'student'),
    validate(listAttendanceSchema),
    attendanceController.listAttendance
);

router.get(
    '/:id',
    authenticate,
    authorize('super_admin', 'admin', 'teacher', 'student'),
    validate(getAttendanceSchema),
    attendanceController.getAttendance
);

// Get student attendance statistics
router.get(
    '/student/:studentId/course/:courseId/stats',
    authenticate,
    authorize('super_admin', 'admin', 'teacher', 'student'),
    attendanceController.getStudentAttendanceStats
);

// Get course attendance report (teacher only)
router.get(
    '/course/:courseId/batch/:batchId/report',
    authenticate,
    authorize('teacher'),
    attendanceController.getCourseAttendanceReport
);

export default router;

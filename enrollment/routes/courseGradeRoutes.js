import express from 'express';
import courseGradeController from '../controllers/courseGradeController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
    createCourseGradeSchema,
    updateCourseGradeSchema,
    publishGradeSchema,
    getCourseGradeSchema,
    listCourseGradesSchema,
} from '../validations/courseGradeValidation.js';

const router = express.Router();

// Teacher only - calculate and manage grades
router.post(
    '/',
    authenticate,
    authorize('teacher'),
    validate(createCourseGradeSchema),
    courseGradeController.calculateGrade
);

router.post(
    '/auto-calculate/:enrollmentId',
    authenticate,
    authorize('teacher'),
    courseGradeController.autoCalculateGrade
);

router.put(
    '/:id',
    authenticate,
    authorize('teacher'),
    validate(updateCourseGradeSchema),
    courseGradeController.updateGrade
);

router.post(
    '/:id/publish',
    authenticate,
    authorize('teacher'),
    validate(publishGradeSchema),
    courseGradeController.publishGrade
);

router.post(
    '/:id/unpublish',
    authenticate,
    authorize('teacher'),
    validate(publishGradeSchema),
    courseGradeController.unpublishGrade
);

router.delete(
    '/:id',
    authenticate,
    authorize('teacher'),
    validate(getCourseGradeSchema),
    courseGradeController.deleteGrade
);

// Accessible by teachers and students (students see only their published grades)
router.get(
    '/',
    authenticate,
    authorize('super_admin', 'admin', 'teacher', 'student'),
    validate(listCourseGradesSchema),
    courseGradeController.listGrades
);

router.get(
    '/:id',
    authenticate,
    authorize('super_admin', 'admin', 'teacher', 'student'),
    validate(getCourseGradeSchema),
    courseGradeController.getGrade
);

// Get student's semester grades
router.get(
    '/student/:studentId/semester/:semester',
    authenticate,
    authorize('super_admin', 'admin', 'teacher', 'student'),
    courseGradeController.getStudentSemesterGrades
);

// Calculate semester GPA
router.get(
    '/student/:studentId/semester/:semester/gpa',
    authenticate,
    authorize('super_admin', 'admin', 'teacher', 'student'),
    courseGradeController.calculateSemesterGPA
);

// Teacher only - get course grade statistics
router.get(
    '/stats/course',
    authenticate,
    authorize('teacher'),
    courseGradeController.getCourseGradeStats
);

export default router;

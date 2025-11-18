import express from 'express';
import assessmentTypeController from '../controllers/assessments/assessmentTypeController.js';
import assessmentController from '../controllers/assessments/assessmentController.js';
import assessmentSubmissionController from '../controllers/assessments/assessmentSubmissionController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
    createAssessmentTypeSchema,
    updateAssessmentTypeSchema,
    getAssessmentTypeSchema,
} from '../validations/assessmentTypeValidation.js';
import {
    createAssessmentSchema,
    updateAssessmentSchema,
    getAssessmentSchema,
    listAssessmentsSchema,
} from '../validations/assessmentValidation.js';
import {
    createSubmissionSchema,
    updateSubmissionSchema,
    gradeSubmissionSchema,
    getSubmissionSchema,
    listSubmissionsSchema,
} from '../validations/assessmentSubmissionValidation.js';

const router = express.Router();

// ========== Assessment Type Routes ==========
// Admin only
router.post(
    '/types',
    authenticate,
    authorize('super_admin', 'admin'),
    validate(createAssessmentTypeSchema),
    assessmentTypeController.createAssessmentType
);

router.put(
    '/types/:id',
    authenticate,
    authorize('super_admin', 'admin'),
    validate(updateAssessmentTypeSchema),
    assessmentTypeController.updateAssessmentType
);

router.delete(
    '/types/:id',
    authenticate,
    authorize('super_admin', 'admin'),
    validate(getAssessmentTypeSchema),
    assessmentTypeController.deleteAssessmentType
);

// Accessible by all authenticated users
router.get(
    '/types',
    authenticate,
    assessmentTypeController.listAssessmentTypes
);

router.get(
    '/types/:id',
    authenticate,
    validate(getAssessmentTypeSchema),
    assessmentTypeController.getAssessmentType
);

// ========== Assessment Routes ==========
// Teacher only - create, update, delete, publish, close
router.post(
    '/',
    authenticate,
    authorize('teacher'),
    validate(createAssessmentSchema),
    assessmentController.createAssessment
);

router.put(
    '/:id',
    authenticate,
    authorize('teacher'),
    validate(updateAssessmentSchema),
    assessmentController.updateAssessment
);

router.delete(
    '/:id',
    authenticate,
    authorize('teacher'),
    validate(getAssessmentSchema),
    assessmentController.deleteAssessment
);

router.post(
    '/:id/publish',
    authenticate,
    authorize('teacher'),
    validate(getAssessmentSchema),
    assessmentController.publishAssessment
);

router.post(
    '/:id/close',
    authenticate,
    authorize('teacher'),
    validate(getAssessmentSchema),
    assessmentController.closeAssessment
);

router.post(
    '/:id/mark-graded',
    authenticate,
    authorize('teacher'),
    validate(getAssessmentSchema),
    assessmentController.markAsGraded
);

// Accessible by teachers and students
router.get(
    '/',
    authenticate,
    authorize('super_admin', 'admin', 'teacher', 'student'),
    validate(listAssessmentsSchema),
    assessmentController.listAssessments
);

router.get(
    '/:id',
    authenticate,
    authorize('super_admin', 'admin', 'teacher', 'student'),
    validate(getAssessmentSchema),
    assessmentController.getAssessment
);

// Get student's assessments
router.get(
    '/student/:studentId/course/:courseId',
    authenticate,
    authorize('super_admin', 'admin', 'teacher', 'student'),
    assessmentController.getStudentAssessments
);

// ========== Assessment Submission Routes ==========
// Student only - submit, update, delete
router.post(
    '/submissions',
    authenticate,
    authorize('student'),
    validate(createSubmissionSchema),
    assessmentSubmissionController.submitAssessment
);

router.put(
    '/submissions/:id',
    authenticate,
    authorize('student'),
    validate(updateSubmissionSchema),
    assessmentSubmissionController.updateSubmission
);

router.delete(
    '/submissions/:id',
    authenticate,
    authorize('student'),
    validate(getSubmissionSchema),
    assessmentSubmissionController.deleteSubmission
);

// Teacher only - grade submission
router.post(
    '/submissions/:id/grade',
    authenticate,
    authorize('teacher'),
    validate(gradeSubmissionSchema),
    assessmentSubmissionController.gradeSubmission
);

// Accessible by teachers and students (students see only their own)
router.get(
    '/submissions',
    authenticate,
    authorize('super_admin', 'admin', 'teacher', 'student'),
    validate(listSubmissionsSchema),
    assessmentSubmissionController.listSubmissions
);

router.get(
    '/submissions/:id',
    authenticate,
    authorize('super_admin', 'admin', 'teacher', 'student'),
    validate(getSubmissionSchema),
    assessmentSubmissionController.getSubmission
);

// Get student's submission for an assessment
router.get(
    '/submissions/student/:studentId/assessment/:assessmentId',
    authenticate,
    authorize('super_admin', 'admin', 'teacher', 'student'),
    assessmentSubmissionController.getStudentSubmission
);

// Teacher only - get all submissions for an assessment
router.get(
    '/:assessmentId/submissions',
    authenticate,
    authorize('teacher'),
    assessmentSubmissionController.getAssessmentSubmissions
);

// Teacher only - get submission statistics
router.get(
    '/:assessmentId/submissions/stats',
    authenticate,
    authorize('teacher'),
    assessmentSubmissionController.getAssessmentSubmissionStats
);

export default router;

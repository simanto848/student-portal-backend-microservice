import express from 'express';
import courseGradeController from '../controllers/courseGradeController.js';
import resultWorkflowController from '../controllers/resultWorkflowController.js';
import { authenticate, authorize } from 'shared';
import { validate } from 'shared';
import {
    createCourseGradeSchema,
    updateCourseGradeSchema,
    publishGradeSchema,
    getCourseGradeSchema,
    listCourseGradesSchema,
} from '../validations/courseGradeValidation.js';
import {
    submitToCommitteeSchema,
    approveByCommitteeSchema,
    returnToTeacherSchema,
    requestReturnSchema
} from '../validations/resultWorkflowValidation.js';

const router = express.Router();

router.use(authenticate)

router.post('/', authorize('teacher'), validate(createCourseGradeSchema), courseGradeController.calculateGrade);
router.post('/auto-calculate/:enrollmentId', authorize('teacher'), courseGradeController.autoCalculateGrade);
// Workflow Routes
router.get('/workflow', authorize('teacher', 'admin', 'super_admin'), resultWorkflowController.getWorkflow);
router.post('/workflow/submit', authorize('teacher'), validate(submitToCommitteeSchema), resultWorkflowController.submitToCommittee);
router.post('/workflow/:id/approve', authorize('admin', 'super_admin', 'teacher'), validate(approveByCommitteeSchema), resultWorkflowController.approveByCommittee); // Teacher allowed for Committee members
router.post('/workflow/:id/return', authorize('admin', 'super_admin', 'teacher'), validate(returnToTeacherSchema), resultWorkflowController.returnToTeacher);
router.post('/workflow/:id/publish', authorize('admin', 'super_admin', 'teacher'), resultWorkflowController.publishResult); // Teacher allowed for Dept Head
router.post('/workflow/:id/request-return', authorize('teacher'), validate(requestReturnSchema), resultWorkflowController.requestReturn);
router.post('/workflow/:id/approve-return', authorize('admin', 'super_admin', 'teacher'), resultWorkflowController.approveReturnRequest);

router.get('/stats/course', authorize('teacher'), courseGradeController.getCourseGradeStats);
router.get('/student/:studentId/semester/:semester', authorize('super_admin', 'admin', 'teacher', 'student'), courseGradeController.getStudentSemesterGrades);
router.get('/student/:studentId/semester/:semester/gpa', authorize('super_admin', 'admin', 'teacher', 'student'), courseGradeController.calculateSemesterGPA);
router.get('/student/:studentId/cgpa', authorize('super_admin', 'admin', 'teacher', 'student'), courseGradeController.calculateCGPA);

// Generic ID routes (Must be last)
router.get('/:id', authorize('super_admin', 'admin', 'teacher', 'student'), validate(getCourseGradeSchema), courseGradeController.getGrade);
router.put('/:id', authorize('teacher'), validate(updateCourseGradeSchema), courseGradeController.updateGrade);
router.post('/:id/publish', authorize('teacher'), validate(publishGradeSchema), courseGradeController.publishGrade);
router.post('/:id/unpublish', authorize('teacher'), validate(publishGradeSchema), courseGradeController.unpublishGrade);
router.delete('/:id', authorize('teacher'), validate(getCourseGradeSchema), courseGradeController.deleteGrade);

export default router;
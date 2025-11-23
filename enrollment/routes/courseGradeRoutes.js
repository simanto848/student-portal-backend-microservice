import express from 'express';
import courseGradeController from '../controllers/courseGradeController.js';
import resultWorkflowController from '../controllers/resultWorkflowController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import {
    createCourseGradeSchema,
    updateCourseGradeSchema,
    publishGradeSchema,
    getCourseGradeSchema,
    listCourseGradesSchema,
} from '../validations/courseGradeValidation.js';

const router = express.Router();

router.use(authenticate)

router.post('/', authorize('teacher'), validate(createCourseGradeSchema), courseGradeController.calculateGrade);
router.post('/auto-calculate/:enrollmentId', authorize('teacher'), courseGradeController.autoCalculateGrade);
router.put('/:id', authorize('teacher'), validate(updateCourseGradeSchema), courseGradeController.updateGrade);
router.post('/:id/publish', authorize('teacher'), validate(publishGradeSchema), courseGradeController.publishGrade);
router.post('/:id/unpublish', authorize('teacher'), validate(publishGradeSchema), courseGradeController.unpublishGrade);
router.delete('/:id', authorize('teacher'), validate(getCourseGradeSchema), courseGradeController.deleteGrade);
router.get('/', authorize('super_admin', 'admin', 'teacher', 'student'), validate(listCourseGradesSchema), courseGradeController.listGrades);
router.get('/:id', authorize('super_admin', 'admin', 'teacher', 'student'), validate(getCourseGradeSchema), courseGradeController.getGrade);
router.get('/student/:studentId/semester/:semester', authorize('super_admin', 'admin', 'teacher', 'student'), courseGradeController.getStudentSemesterGrades);
router.get('/student/:studentId/semester/:semester/gpa', authorize('super_admin', 'admin', 'teacher', 'student'), courseGradeController.calculateSemesterGPA);
router.get('/student/:studentId/cgpa', authorize('super_admin', 'admin', 'teacher', 'student'), courseGradeController.calculateCGPA);

// Workflow Routes
router.get('/workflow', authorize('teacher', 'admin', 'super_admin'), resultWorkflowController.getWorkflow);
router.post('/workflow/submit', authorize('teacher'), resultWorkflowController.submitToCommittee);
router.post('/workflow/:id/approve', authorize('admin', 'super_admin'), resultWorkflowController.approveByCommittee); // Assuming admin/super_admin is committee for now
router.post('/workflow/:id/return', authorize('admin', 'super_admin'), resultWorkflowController.returnToTeacher);
router.post('/workflow/:id/publish', authorize('admin', 'super_admin'), resultWorkflowController.publishResult); // Assuming admin/super_admin is Head for now
router.post('/workflow/:id/request-return', authorize('teacher'), resultWorkflowController.requestReturn);
router.post('/workflow/:id/approve-return', authorize('admin', 'super_admin'), resultWorkflowController.approveReturnRequest);

router.get('/stats/course', authorize('teacher'), courseGradeController.getCourseGradeStats);

export default router;
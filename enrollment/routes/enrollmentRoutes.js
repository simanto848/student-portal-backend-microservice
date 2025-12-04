import express from 'express';
import enrollmentController from '../controllers/enrollmentController.js';
import { authenticate, authorize } from 'shared';
import { validate } from 'shared';
import {
    createEnrollmentSchema,
    bulkEnrollSchema,
    updateEnrollmentSchema,
    getEnrollmentSchema,
    listEnrollmentsSchema,
} from '../validations/enrollmentValidation.js';

const router = express.Router();

router.use(authenticate)

router.post('/', authorize('super_admin', 'admin'), validate(createEnrollmentSchema), enrollmentController.enrollStudent);
router.post('/bulk', authorize('super_admin', 'admin'), validate(bulkEnrollSchema), enrollmentController.bulkEnrollBatch);
router.post('/complete-semester', authorize('super_admin', 'admin'), enrollmentController.completeBatchSemester);
router.post('/batch/:batchId/progress-semester', authorize('super_admin', 'admin'), enrollmentController.progressBatchSemester);
router.get('/batch/:batchId/semester/:semester/courses', authorize('super_admin', 'admin'), enrollmentController.getBatchSemesterCourses);
router.get('/', authorize('super_admin', 'admin', 'teacher', 'student'), validate(listEnrollmentsSchema), enrollmentController.listEnrollments);
router.get('/student/:studentId/semester/:semester', authorize('super_admin', 'admin', 'teacher', 'student'), enrollmentController.getStudentSemesterEnrollments);
router.get('/:id', authorize('super_admin', 'admin', 'teacher', 'student'), validate(getEnrollmentSchema), enrollmentController.getEnrollment);
router.put('/:id', authorize('super_admin', 'admin'), validate(updateEnrollmentSchema), enrollmentController.updateEnrollment);
router.delete('/:id', authorize('super_admin', 'admin'), validate(getEnrollmentSchema), enrollmentController.deleteEnrollment);

export default router;
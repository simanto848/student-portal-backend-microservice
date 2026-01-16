import express from 'express';
import enrollmentRoutes from './enrollmentRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import courseGradeRoutes from './courseGradeRoutes.js';
import assessmentRoutes from './assessmentRoutes.js';
import batchCourseInstructorRoutes from './batchCourseInstructorRoutes.js';

import resultWorkflowRoutes from './resultWorkflowRoutes.js';
import examScheduleRoutes from './examScheduleRoutes.js';

const router = express.Router();

router.use('/batch-course-instructors', batchCourseInstructorRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/grades', courseGradeRoutes);
router.use('/result-workflows', resultWorkflowRoutes);
router.use('/exam-schedules', examScheduleRoutes);

export default router;


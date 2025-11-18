import express from 'express';
import batchCourseInstructorRoutes from './batchCourseInstructorRoutes.js';
import enrollmentRoutes from './enrollmentRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import assessmentRoutes from './assessmentRoutes.js';
import courseGradeRoutes from './courseGradeRoutes.js';

const router = express.Router();

// Mount routes
router.use('/batch-course-instructors', batchCourseInstructorRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/grades', courseGradeRoutes);

export default router;

import express from 'express';
import enrollmentRoutes from './enrollmentRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import courseGradeRoutes from './courseGradeRoutes.js';
import assessmentRoutes from './assessmentRoutes.js';
import batchCourseInstructorRoutes from './batchCourseInstructorRoutes.js';

const router = express.Router();

router.use('/batch-course-instructors', batchCourseInstructorRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/grades', courseGradeRoutes);

export default router;


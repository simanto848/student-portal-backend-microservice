import express from 'express';
import facultyRoutes from "./facultyRoutes.js";
import departmentRoutes from "./departmentRoutes.js";
import programRoutes from "./programRoutes.js";
import sessionRoutes from "./sessionRoutes.js";
import courseRoutes from "./courseRoutes.js";
import sessionCourseRoutes from "./sessionCourseRoutes.js";
import batchRoutes from "./batchRoutes.js";
import classroomRoutes from "./classroomRoutes.js";
import courseScheduleRoutes from "./courseScheduleRoutes.js";
import courseSyllabusRoutes from "./courseSyllabusRoutes.js";
import examCommitteeRoutes from "./examCommitteeRoutes.js";

const router = express.Router();

router.use('/faculties', facultyRoutes);
router.use('/departments', departmentRoutes);
router.use('/programs', programRoutes);
router.use('/sessions', sessionRoutes);
router.use('/courses', courseRoutes);
router.use('/session-courses', sessionCourseRoutes);
router.use('/batches', batchRoutes);
router.use('/classrooms', classroomRoutes);
router.use('/schedules', courseScheduleRoutes);
router.use('/syllabus', courseSyllabusRoutes);
router.use('/exam-committees', examCommitteeRoutes);

export default router;
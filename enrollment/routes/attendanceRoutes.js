import express from 'express';
import attendanceController from '../controllers/attendanceController.js';
import validate from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import {
    createAttendanceSchema,
    bulkAttendanceSchema,
    updateAttendanceSchema,
    getAttendanceSchema as attendanceIdSchema,
    listAttendanceSchema as attendanceQuerySchema,
} from '../validations/AttendanceValidation.js';

const router = express.Router();

router.use(authenticate)

router.post('/', authorize('super_admin', 'admin', 'teacher'), validate(createAttendanceSchema), attendanceController.markAttendance);
router.post('/bulk', authorize('super_admin', 'admin', 'teacher'), validate(bulkAttendanceSchema), attendanceController.bulkMarkAttendance);
router.get('/student/:studentId/course/:courseId/stats', attendanceController.getStudentAttendanceStats);
router.get('/course/:courseId/batch/:batchId/report', authorize('super_admin', 'admin', 'teacher'), attendanceController.getCourseAttendanceReport);
router.get('/', validate(attendanceQuerySchema), attendanceController.listAttendance);
router.get('/:id', validate(attendanceIdSchema), attendanceController.getAttendance);
router.put('/:id', authorize('super_admin', 'admin', 'teacher'), validate(updateAttendanceSchema), attendanceController.updateAttendance);
router.delete('/:id', authorize('super_admin', 'admin', 'teacher'), validate(attendanceIdSchema), attendanceController.deleteAttendance);

export default router;

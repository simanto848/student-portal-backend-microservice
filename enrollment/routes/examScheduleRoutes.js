import express from 'express';
import examScheduleController from '../controllers/examScheduleController.js';
import { authenticate, authorize } from 'shared';

const router = express.Router();

router.use(authenticate);

router.post('/', authorize("exam_controller"), examScheduleController.createSchedule);
router.get('/', authorize("exam_controller", "teacher", "student", "admin"), examScheduleController.getSchedules);
router.put('/:id', authorize("exam_controller"), examScheduleController.updateSchedule);
router.delete('/:id', authorize("exam_controller"), examScheduleController.deleteSchedule);

export default router;

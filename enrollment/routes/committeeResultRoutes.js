import express from 'express';
import committeeResultController from '../controllers/committeeResultController.js';
import { authenticate, authorize } from 'shared';

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('teacher', 'exam_controller'), committeeResultController.listWorkflows);
router.get('/:id', authorize('teacher', 'exam_controller'), committeeResultController.getWorkflow);
router.post('/:id/approve', authorize('teacher'), committeeResultController.approveResult);
router.post('/:id/return', authorize('teacher'), committeeResultController.returnResult);
router.post('/:id/publish', authorize('teacher', 'exam_controller'), committeeResultController.publishResult);

export default router;

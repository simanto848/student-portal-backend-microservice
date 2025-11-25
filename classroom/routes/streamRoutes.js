import { Router } from 'express';
import { authenticate, authorize } from 'shared';
import streamController from '../controllers/streamController.js';

const router = Router();
router.use(authenticate);

router.get('/:workspaceId', authorize('super_admin','admin','program_controller','teacher','student'), streamController.list);

export default router;

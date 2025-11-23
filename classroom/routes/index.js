import { Router } from 'express';
import workspaceRoutes from './workspaceRoutes.js';
import topicRoutes from './topicRoutes.js';
import materialRoutes from './materialRoutes.js';
import assignmentRoutes from './assignmentRoutes.js';
import submissionRoutes from './submissionRoutes.js';
import rubricRoutes from './rubricRoutes.js';
import streamRoutes from './streamRoutes.js';

const router = Router();

router.use('/workspaces', workspaceRoutes);
router.use('/topics', topicRoutes);
router.use('/materials', materialRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/submissions', submissionRoutes);
router.use('/rubrics', rubricRoutes);
router.use('/stream', streamRoutes);

export default router;

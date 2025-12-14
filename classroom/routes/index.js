import { Router } from 'express';
import workspaceRoutes from './workspaceRoutes.js';
import topicRoutes from './topicRoutes.js';
import materialRoutes from './materialRoutes.js';
import assignmentRoutes from './assignmentRoutes.js';
import submissionRoutes from './submissionRoutes.js';
import rubricRoutes from './rubricRoutes.js';
import streamRoutes from './streamRoutes.js';
import quizRoutes from './quizRoutes.js';
import questionRoutes from './questionRoutes.js';
import quizAttemptRoutes from './quizAttemptRoutes.js';
import questionImageRoutes from './questionImageRoutes.js';

const router = Router();

router.use('/workspaces', workspaceRoutes);
router.use('/topics', topicRoutes);
router.use('/materials', materialRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/submissions', submissionRoutes);
router.use('/rubrics', rubricRoutes);
router.use('/stream', streamRoutes);
router.use('/quizzes', quizRoutes);
router.use('/questions', questionRoutes);
router.use('/questions', questionImageRoutes);  // Image uploads at /questions/images
router.use('/quiz-attempts', quizAttemptRoutes);

export default router;


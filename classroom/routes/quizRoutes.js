import express from 'express';
import quizController from '../controllers/quizController.js';
import { authenticate } from 'shared';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Quiz CRUD
router.post('/', quizController.create);
router.get('/workspace/:workspaceId', quizController.listByWorkspace);
router.get('/:id', quizController.getById);
router.patch('/:id', quizController.update);
router.delete('/:id', quizController.delete);

// Quiz actions
router.post('/:id/publish', quizController.publish);
router.post('/:id/close', quizController.close);

// Quiz submissions (for teachers)
router.get('/:id/submissions', quizController.getSubmissions);

export default router;

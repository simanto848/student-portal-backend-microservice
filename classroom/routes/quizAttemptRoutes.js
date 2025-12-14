import express from 'express';
import quizAttemptController from '../controllers/quizAttemptController.js';
import { authenticate } from 'shared';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Student endpoints
router.post('/quiz/:quizId/start', quizAttemptController.start);
router.post('/:id/save', quizAttemptController.saveProgress);
router.post('/:id/submit', quizAttemptController.submit);
router.get('/:id/status', quizAttemptController.getStatus);
router.get('/:id/results', quizAttemptController.getResults);
router.get('/quiz/:quizId/my-attempts', quizAttemptController.getMyAttempts);

// Teacher grading endpoint
router.post('/:id/grade/:questionId', quizAttemptController.gradeAnswer);

export default router;

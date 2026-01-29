import express from 'express';
import quizAttemptController from '../controllers/quizAttemptController.js';
import { authenticate } from 'shared';

const router = express.Router();

router.use(authenticate);

// Student endpoints
router.post('/quiz/:quizId/start', quizAttemptController.start);
router.post('/:id/save', quizAttemptController.saveProgress);
router.post('/:id/submit', quizAttemptController.submit);
router.get('/:id/status', quizAttemptController.getStatus);
router.get('/:id/results', quizAttemptController.getResults);
router.get('/quiz/:quizId/my-attempts', quizAttemptController.getMyAttempts);
router.get('/quiz/:quizId/student/:studentId', quizAttemptController.getAttemptsByStudent);

// Teacher grading endpoint
router.post('/:id/grade/:questionId', quizAttemptController.gradeAnswer);
router.post('/:id/grade', quizAttemptController.gradeOverall);
router.post('/:id/regrade', quizAttemptController.regrade);

export default router;

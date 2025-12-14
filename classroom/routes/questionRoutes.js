import express from 'express';
import questionController from '../controllers/questionController.js';
import { authenticate } from 'shared';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Question CRUD
router.post('/', questionController.create);
router.post('/bulk', questionController.bulkCreate);
router.get('/quiz/:quizId', questionController.listByQuiz);
router.get('/:id', questionController.getById);
router.patch('/:id', questionController.update);
router.delete('/:id', questionController.delete);

// Reorder questions
router.post('/quiz/:quizId/reorder', questionController.reorder);

export default router;

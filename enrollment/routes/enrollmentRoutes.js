import express from 'express';
import enrollmentController from '../controllers/enrollmentController.js';

const router = express.Router();

// Core CRUD routes
router.get('/', enrollmentController.getAll);
router.get('/:id', enrollmentController.getById);
router.post('/', enrollmentController.create);
router.post('/bulk', enrollmentController.createBulk);
router.patch('/:id', enrollmentController.update);
router.delete('/:id', enrollmentController.delete);
router.post('/:id/restore', enrollmentController.restore);

// Special query routes
router.get('/student/:studentId', enrollmentController.getByStudent);
router.get('/department/:departmentId/semester/:semester', enrollmentController.getBySemester);

export default router;

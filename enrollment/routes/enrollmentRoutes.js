import express from 'express';
import enrollmentController from '../controllers/enrollmentController.js';

const router = express.Router();

// Special query routes (must be before parameterized routes)
router.get('/student/:studentId', enrollmentController.getByStudent);
router.get('/department/:departmentId/semester/:semester', enrollmentController.getBySemester);

// Bulk operations
router.post('/bulk', enrollmentController.createBulk);

// Core CRUD routes
router.get('/', enrollmentController.getAll);
router.get('/:id', enrollmentController.getById);
router.post('/', enrollmentController.create);
router.patch('/:id', enrollmentController.update);
router.delete('/:id', enrollmentController.delete);
router.post('/:id/restore', enrollmentController.restore);

export default router;

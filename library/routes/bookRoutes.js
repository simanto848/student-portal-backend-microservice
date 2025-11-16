import express from 'express';
import bookController from '../controllers/bookController.js';
import { authenticate, authorize, optionalAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { bookCreateValidation, bookUpdateValidation } from '../validations/bookValidation.js';

const router = express.Router();

// Public route for viewing available books (no authentication required)
router.get('/available', bookController.getAvailableBooks);

// All other book management routes require authentication and authorization
router.get('/', authenticate, authorize('super_admin', 'admin', 'library'), bookController.getAll);
router.get('/:id', authenticate, authorize('super_admin', 'admin', 'library'), bookController.getById);
router.post('/', authenticate, authorize('super_admin', 'admin', 'library'), validate(bookCreateValidation), bookController.create);
router.patch('/:id', authenticate, authorize('super_admin', 'admin', 'library'), validate(bookUpdateValidation), bookController.update);
router.delete('/:id', authenticate, authorize('super_admin', 'admin', 'library'), bookController.delete);
router.post('/:id/restore', authenticate, authorize('super_admin', 'admin', 'library'), bookController.restore);

export default router;

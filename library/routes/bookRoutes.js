import express from 'express';
import bookController from '../controllers/bookController.js';
import { authenticate, authorize, optionalAuth } from 'shared';
import { validate } from 'shared';
import { bookCreateValidation, bookUpdateValidation } from '../validations/bookValidation.js';

const router = express.Router();

router.use(authenticate)

router.get('/available', bookController.getAvailableBooks);

router.use(authorize('super_admin', 'admin', 'library'));

router.get('/', bookController.getAll);
router.get('/:id', bookController.getById);
router.get('/:id/stats', bookController.getStats);
router.post('/', validate(bookCreateValidation), bookController.create);
router.patch('/:id', validate(bookUpdateValidation), bookController.update);
router.delete('/:id', bookController.delete);
router.post('/:id/restore', bookController.restore);
router.post('/:id/generate-copies', bookController.generateCopies);

export default router;
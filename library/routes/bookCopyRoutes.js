import express from 'express';
import bookCopyController from '../controllers/bookCopyController.js';
import { authenticate, authorize } from 'shared';
import { validate } from 'shared';
import { bookCopyCreateValidation, bookCopyUpdateValidation } from '../validations/bookCopyValidation.js';

const router = express.Router();

router.use(authenticate);

router.get('/book/:bookId/available', bookCopyController.getAvailableCopiesByBook);

router.use(authorize('super_admin', 'admin', 'library'));

router.get('/', bookCopyController.getAll);
router.get('/:id', bookCopyController.getById);
router.post('/', validate(bookCopyCreateValidation), bookCopyController.create);
router.patch('/:id', validate(bookCopyUpdateValidation), bookCopyController.update);
router.delete('/:id', bookCopyController.delete);
router.post('/:id/restore', bookCopyController.restore);

export default router;

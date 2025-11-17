import express from 'express';
import bookController from '../controllers/bookController.js';
import { authenticate, authorize, optionalAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { bookCreateValidation, bookUpdateValidation } from '../validations/bookValidation.js';

const router = express.Router();

router.use(authenticate)
router.get('/available', bookController.getAvailableBooks);

router.use(authorize('super_admin', 'admin', 'library'));

router.get('/', bookController.getAll);
router.get('/:id',  bookController.getById);
router.post('/',  validate(bookCreateValidation), bookController.create);
router.patch('/:id',  validate(bookUpdateValidation), bookController.update);
router.delete('/:id',  bookController.delete);
router.post('/:id/restore',  bookController.restore);

export default router;
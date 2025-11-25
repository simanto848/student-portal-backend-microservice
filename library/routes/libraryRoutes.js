import express from 'express';
import libraryController from '../controllers/libraryController.js';
import { authenticate, authorize } from 'shared';
import { validate } from 'shared';
import { libraryCreateValidation, libraryUpdateValidation } from '../validations/libraryValidation.js';

const router = express.Router();

router.get('/', libraryController.getAll);

router.use(authenticate);
router.use(authorize('super_admin', 'admin', 'library'));

router.get('/:id', libraryController.getById);
router.post('/', validate(libraryCreateValidation), libraryController.create);
router.patch('/:id', validate(libraryUpdateValidation), libraryController.update);
router.delete('/:id', libraryController.delete);
router.post('/:id/restore', libraryController.restore);

export default router;
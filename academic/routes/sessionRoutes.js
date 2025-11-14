import express from 'express';
import { validate } from '../validations/index.js';
import {
  createSessionSchema,
  updateSessionSchema,
  getSessionByIdSchema,
  deleteSessionSchema,
  getSessionsSchema,
} from '../validations/index.js';
import sessionController from '../controllers/sessionController.js';

const router = express.Router();

router.get('/', validate(getSessionsSchema), sessionController.getAll);
router.get('/:id', validate(getSessionByIdSchema), sessionController.getById);
router.post('/', validate(createSessionSchema), sessionController.create);
router.patch('/:id', validate(updateSessionSchema), sessionController.update);
router.delete('/:id', validate(deleteSessionSchema), sessionController.delete);

export default router;


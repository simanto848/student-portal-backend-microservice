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
import { authenticate, authorize } from 'shared';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['super_admin', 'admin']));

router.get('/', validate(getSessionsSchema), sessionController.getAll);
router.get('/:id', validate(getSessionByIdSchema), sessionController.getById);
router.post('/', validate(createSessionSchema), sessionController.create);
router.patch('/:id', validate(updateSessionSchema), sessionController.update);
router.delete('/:id', validate(deleteSessionSchema), sessionController.delete);

export default router;


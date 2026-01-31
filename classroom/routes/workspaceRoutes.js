import { Router } from 'express';
import { authenticate, authorize } from 'shared';
import { validate } from 'shared';
import { workspaceCreateSchema } from '../validations/schemas.js';
import workspaceController from '../controllers/workspaceController.js';

const router = Router();
router.use(authenticate);

router.post('/', authorize( 'teacher'), validate(workspaceCreateSchema), workspaceController.create);
router.get('/', authorize('teacher', 'student'), workspaceController.listMine);
router.get('/pending', authorize('teacher'), workspaceController.listPending);
router.get('/:id', authorize( 'teacher', 'student'), workspaceController.get);
router.post('/:id/archive', authorize('teacher'), workspaceController.archive);
router.delete('/:id', authorize('super_admin'), workspaceController.delete);

export default router;

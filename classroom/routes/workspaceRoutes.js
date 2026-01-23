import { Router } from 'express';
import { authenticate, authorize } from 'shared';
import { validate } from 'shared';
import { workspaceCreateSchema } from '../validations/schemas.js';
import workspaceController from '../controllers/workspaceController.js';

const router = Router();
router.use(authenticate);

router.post('/', authorize('super_admin', 'admin', 'program_controller', 'teacher'), validate(workspaceCreateSchema), workspaceController.create);
router.get('/', authorize('teacher', 'student'), workspaceController.listMine);
router.get('/pending', authorize('teacher'), workspaceController.listPending);
router.get('/:id', authorize('super_admin', 'admin', 'program_controller', 'teacher', 'student'), workspaceController.get);
router.patch('/:id', authorize('super_admin', 'admin', 'program_controller'), workspaceController.update);
router.post('/:id/archive', authorize('teacher', 'admin'), workspaceController.archive);
router.delete('/:id', authorize('super_admin', 'admin'), workspaceController.delete);
router.post('/:id/sync-roster', authorize('super_admin', 'admin', 'program_controller'), workspaceController.syncRoster);

export default router;

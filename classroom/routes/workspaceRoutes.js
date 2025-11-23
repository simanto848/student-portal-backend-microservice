import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate, workspaceCreateSchema } from '../middlewares/validate.js';
import workspaceController from '../controllers/workspaceController.js';

const router = Router();
router.use(authenticate);

router.post('/', authorize('super_admin','admin','program_controller','teacher'), validate(workspaceCreateSchema), workspaceController.create);
router.get('/', authorize('super_admin','admin','program_controller','teacher','student'), workspaceController.listMine);
router.get('/:id', authorize('super_admin','admin','program_controller','teacher','student'), workspaceController.get);
router.patch('/:id', authorize('super_admin','admin','program_controller','teacher'), workspaceController.update);
router.delete('/:id', authorize('super_admin','admin'), workspaceController.delete);
router.post('/:id/sync-roster', authorize('super_admin','admin','program_controller','teacher'), workspaceController.syncRoster);

export default router;

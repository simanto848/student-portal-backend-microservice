import { Router } from 'express';
import { authenticate, authorize } from 'shared';
import rubricController from '../controllers/rubricController.js';

const router = Router();
router.use(authenticate);

router.post('/', authorize('super_admin','admin','program_controller','teacher'), rubricController.create);
router.get('/:workspaceId', authorize('super_admin','admin','program_controller','teacher'), rubricController.list);
router.get('/item/:id', authorize('super_admin','admin','program_controller','teacher'), rubricController.get);
router.patch('/:id', authorize('super_admin','admin','program_controller','teacher'), rubricController.update);
router.delete('/:id', authorize('super_admin','admin','program_controller','teacher'), rubricController.delete);

export default router;

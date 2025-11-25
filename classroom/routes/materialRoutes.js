import { Router } from 'express';
import { authenticate, authorize } from 'shared';
import { validate } from 'shared';
import { materialCreateSchema } from '../validations/schemas.js';
import materialController from '../controllers/materialController.js';

const router = Router();
router.use(authenticate);

router.post('/', authorize('super_admin','admin','program_controller','teacher'), validate(materialCreateSchema), materialController.create);
router.get('/:workspaceId', authorize('super_admin','admin','program_controller','teacher','student'), materialController.list);
router.get('/item/:id', authorize('super_admin','admin','program_controller','teacher','student'), materialController.get);
router.patch('/:id', authorize('super_admin','admin','program_controller','teacher'), materialController.update);
router.delete('/:id', authorize('super_admin','admin','program_controller','teacher'), materialController.delete);

export default router;

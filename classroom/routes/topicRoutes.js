import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate, topicCreateSchema } from '../middlewares/validate.js';
import topicController from '../controllers/topicController.js';

const router = Router();
router.use(authenticate);

router.post('/', authorize('super_admin','admin','program_controller','teacher'), validate(topicCreateSchema), topicController.create);
router.get('/:workspaceId', authorize('super_admin','admin','program_controller','teacher','student'), topicController.list);
router.patch('/:id', authorize('super_admin','admin','program_controller','teacher'), topicController.update);
router.delete('/:id', authorize('super_admin','admin','program_controller','teacher'), topicController.delete);

export default router;

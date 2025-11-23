import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate, assignmentCreateSchema } from '../middlewares/validate.js';
import assignmentController from '../controllers/assignmentController.js';

const router = Router();
router.use(authenticate);

router.post('/', authorize('super_admin','admin','program_controller','teacher'), validate(assignmentCreateSchema), assignmentController.create);
router.get('/:workspaceId', authorize('super_admin','admin','program_controller','teacher','student'), assignmentController.list);
router.get('/item/:id', authorize('super_admin','admin','program_controller','teacher','student'), assignmentController.get);
router.patch('/:id', authorize('super_admin','admin','program_controller','teacher'), assignmentController.update);
router.post('/:id/publish', authorize('super_admin','admin','program_controller','teacher'), assignmentController.publish);
router.post('/:id/close', authorize('super_admin','admin','program_controller','teacher'), assignmentController.close);
router.delete('/:id', authorize('super_admin','admin','program_controller','teacher'), assignmentController.delete);

export default router;

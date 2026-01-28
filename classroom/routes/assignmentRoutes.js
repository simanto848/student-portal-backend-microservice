import { Router } from 'express';
import { authenticate, authorize } from 'shared';
import { validate } from 'shared';
import { assignmentCreateSchema } from '../validations/schemas.js';
import { createUpload } from '../middlewares/uploadMiddleware.js';
import assignmentController from '../controllers/assignmentController.js';

const router = Router();
router.use(authenticate);

router.post('/', authorize('teacher'), validate(assignmentCreateSchema), assignmentController.create);
router.get('/:workspaceId', authorize('teacher', 'student'), assignmentController.list);
router.get('/item/:id', authorize('teacher', 'student'), assignmentController.get);
router.patch('/:id', authorize('teacher'), assignmentController.update);
router.post('/:id/publish', authorize('teacher'), assignmentController.publish);
router.post('/:id/close', authorize('teacher'), assignmentController.close);
router.post('/upload', authorize('teacher'), createUpload('assignments').array('files'), assignmentController.upload);
router.get('/item/:id/attachments/:attachmentId/download', authorize('teacher', 'student'), assignmentController.downloadAttachment);
router.delete('/:id', authorize('teacher'), assignmentController.delete);

export default router;

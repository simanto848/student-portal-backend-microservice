import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate, submissionSchema, gradeSchema, feedbackSchema } from '../middlewares/validate.js';
import submissionController from '../controllers/submissionController.js';

const router = Router();
router.use(authenticate);

router.post('/:assignmentId', authorize('super_admin','admin','program_controller','teacher','student'), validate(submissionSchema), submissionController.submitOrUpdate);
router.get('/:assignmentId', authorize('super_admin','admin','program_controller','teacher'), submissionController.listByAssignment);
router.get('/item/:id', authorize('super_admin','admin','program_controller','teacher','student'), submissionController.get);
router.post('/:id/grade', authorize('super_admin','admin','program_controller','teacher'), validate(gradeSchema), submissionController.grade);
router.post('/:id/feedback', authorize('super_admin','admin','program_controller','teacher','student'), validate(feedbackSchema), submissionController.addFeedback);

export default router;

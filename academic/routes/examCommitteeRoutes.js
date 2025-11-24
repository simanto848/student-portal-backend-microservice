import express from 'express';
import examCommitteeController from '../controllers/examCommitteeController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { addMemberSchema } from '../validations/examCommitteeValidation.js';

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('admin', 'super_admin'), validate(addMemberSchema), examCommitteeController.addMember);
router.delete('/:id', authorize('admin', 'super_admin'), examCommitteeController.removeMember);
router.get('/', authorize('admin', 'super_admin', 'teacher'), examCommitteeController.listMembers);

export default router;

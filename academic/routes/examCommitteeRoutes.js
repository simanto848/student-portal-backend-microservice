import express from 'express';
import examCommitteeController from '../controllers/examCommitteeController.js';
import { authenticate, authorize } from 'shared';
import { validate } from 'shared';
import { addMemberSchema } from '../validations/examCommitteeValidation.js';

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('department_head', 'teacher'), validate(addMemberSchema), examCommitteeController.addMember);
router.patch('/:id', authorize('department_head', 'teacher'), examCommitteeController.updateMember);
router.delete('/:id', authorize('department_head', 'teacher'), examCommitteeController.removeMember);
router.get('/', authorize('department_head', 'teacher', 'super_admin'), examCommitteeController.listMembers);
router.get('/deleted', authorize('department_head', 'teacher'), examCommitteeController.listDeletedMembers);
router.patch('/:id/restore', authorize('department_head', 'teacher'), examCommitteeController.restoreMember);

export default router;

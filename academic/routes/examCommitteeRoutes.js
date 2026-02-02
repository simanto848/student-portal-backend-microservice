import express from 'express';
import examCommitteeController from '../controllers/examCommitteeController.js';
import { authenticate, authorize } from 'shared';
import { validate } from 'shared';
import { addMemberSchema } from '../validations/examCommitteeValidation.js';

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('department_head', 'teacher', 'super_admin', 'admin'), examCommitteeController.listMembers);
router.get('/deleted', authorize('department_head', 'teacher', 'super_admin'), examCommitteeController.listDeletedMembers);
router.post('/', authorize('department_head', 'teacher', 'super_admin', 'admin'), validate(addMemberSchema), examCommitteeController.addMember);
router.patch('/:id', authorize('department_head', 'teacher', 'super_admin', 'admin'), examCommitteeController.updateMember);
router.patch('/:id/restore', authorize('department_head', 'teacher', 'super_admin'), examCommitteeController.restoreMember);
router.delete('/:id', authorize('department_head', 'teacher', 'super_admin'), examCommitteeController.removeMember);

export default router;

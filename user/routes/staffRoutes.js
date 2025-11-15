import express from 'express';
import staffController from '../controllers/staffController.js';
import { validate } from '../middlewares/validate.js';
import {
    createStaffSchema,
    updateStaffSchema,
    updateStaffRoleSchema
} from '../validations/staffValidation.js';

const router = express.Router();

router.get('/', staffController.getAll);
router.get('/statistics', staffController.getStatistics);
router.get('/department/:departmentId', staffController.getByDepartment);
router.get('/:id', staffController.getById);
router.post('/', validate(createStaffSchema), staffController.create);
router.patch('/:id', validate(updateStaffSchema), staffController.update);
router.patch('/:id/role', validate(updateStaffRoleSchema), staffController.updateRole);
router.delete('/:id', staffController.delete);
router.post('/:id/restore', staffController.restore);

export default router;


import express from 'express';
import adminController from '../controllers/adminController.js';
import { validate } from '../middlewares/validate.js';
import {
    createAdminSchema,
    updateAdminSchema,
    updateAdminRoleSchema
} from '../validations/adminValidation.js';

const router = express.Router();

router.get('/', adminController.getAll);
router.get('/statistics', adminController.getStatistics);
router.get('/:id', adminController.getById);
router.post('/', validate(createAdminSchema), adminController.create);
router.patch('/:id', validate(updateAdminSchema), adminController.update);
router.patch('/:id/role', validate(updateAdminRoleSchema), adminController.updateRole);
router.delete('/:id', adminController.delete);
router.post('/:id/restore', adminController.restore);

export default router;


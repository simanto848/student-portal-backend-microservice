import express from 'express';
import { validate } from '../validations/index.js';
import {
    createDepartmentSchema,
    updateDepartmentSchema,
    getDepartmentByIdSchema,
    deleteDepartmentSchema,
    getDepartmentsSchema,
    assignDepartmentHeadSchema,
    removeDepartmentHeadSchema,
} from '../validations/index.js';
import departmentController from '../controllers/departmentController.js';

const router = express.Router();

router.get('/', validate(getDepartmentsSchema), departmentController.getAll);
router.get('/:id', validate(getDepartmentByIdSchema), departmentController.getById);
router.post('/', validate(createDepartmentSchema), departmentController.create);
router.patch('/:id', validate(updateDepartmentSchema), departmentController.update);
router.delete('/:id', validate(deleteDepartmentSchema), departmentController.delete);
router.get('/:id/programs', validate(getDepartmentByIdSchema), departmentController.getProgramsByDepartment);
router.post('/:id/assign-head', validate(assignDepartmentHeadSchema), departmentController.assignDepartmentHead);
router.delete('/:id/head', validate(removeDepartmentHeadSchema), departmentController.removeDepartmentHead);

export default router;


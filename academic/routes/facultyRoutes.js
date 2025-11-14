import express from 'express';
import { validate } from '../validations/index.js';
import {
    createFacultySchema,
    updateFacultySchema,
    getFacultyByIdSchema,
    deleteFacultySchema,
    getFacultiesSchema,
    assignDeanSchema,
    removeDeanSchema,
} from '../validations/index.js';
import facultyController from '../controllers/facultyController.js';

const router = express.Router();

router.get('/', validate(getFacultiesSchema), facultyController.getAll);
router.get('/:id', validate(getFacultyByIdSchema), facultyController.getById);
router.post('/', validate(createFacultySchema), facultyController.create);
router.patch('/:id', validate(updateFacultySchema), facultyController.update);
router.delete('/:id', validate(deleteFacultySchema), facultyController.delete);
router.get('/:id/departments', validate(getFacultyByIdSchema), facultyController.getDepartmentsByFaculty);
router.post('/:id/assign-dean', validate(assignDeanSchema), facultyController.assignDean);
router.delete('/:id/dean', validate(removeDeanSchema), facultyController.removeDean);

export default router;
import express from 'express';
import { validate } from '../validations/index.js';
import {
    createClassroomSchema,
    updateClassroomSchema,
    getClassroomByIdSchema,
    deleteClassroomSchema,
    getClassroomsSchema,
} from '../validations/index.js';
import classroomController from '../controllers/classroomController.js';

const router = express.Router();

router.get('/', validate(getClassroomsSchema), classroomController.getAll);
router.get('/:id', validate(getClassroomByIdSchema), classroomController.getById);
router.post('/', validate(createClassroomSchema), classroomController.create);
router.patch('/:id', validate(updateClassroomSchema), classroomController.update);
router.delete('/:id', validate(deleteClassroomSchema), classroomController.delete);

export default router;


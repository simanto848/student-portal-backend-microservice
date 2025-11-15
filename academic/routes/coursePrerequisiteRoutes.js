import express from 'express';
import { validate } from '../validations/index.js';
import {
    createCoursePrerequisiteSchema,
    updateCoursePrerequisiteSchema,
    getCoursePrerequisiteByIdSchema,
    deleteCoursePrerequisiteSchema,
    getCoursePrerequisitesSchema,
} from '../validations/index.js';
import coursePrerequisiteController from '../controllers/coursePrerequisiteController.js';

const router = express.Router();

router.get('/', validate(getCoursePrerequisitesSchema), coursePrerequisiteController.getAll);
router.get('/:id', validate(getCoursePrerequisiteByIdSchema), coursePrerequisiteController.getById);
router.post('/', validate(createCoursePrerequisiteSchema), coursePrerequisiteController.create);
router.patch('/:id', validate(updateCoursePrerequisiteSchema), coursePrerequisiteController.update);
router.delete('/:id', validate(deleteCoursePrerequisiteSchema), coursePrerequisiteController.delete);

export default router;

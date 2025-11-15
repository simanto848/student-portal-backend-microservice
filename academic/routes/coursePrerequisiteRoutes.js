import express from 'express';
import { validate } from '../validations/index.js';
import {
    createCoursePrerequisiteSchema,
    getCoursePrerequisiteByIdSchema,
    deleteCoursePrerequisiteSchema,
    getCoursePrerequisitesSchema,
    getPrerequisitesByCourseSchema,
} from '../validations/index.js';
import coursePrerequisiteController from '../controllers/coursePrerequisiteController.js';

const router = express.Router();

router.get('/', validate(getCoursePrerequisitesSchema), coursePrerequisiteController.getAll);
router.get('/:id', validate(getCoursePrerequisiteByIdSchema), coursePrerequisiteController.getById);
router.post('/', validate(createCoursePrerequisiteSchema), coursePrerequisiteController.create);
router.delete('/:id', validate(deleteCoursePrerequisiteSchema), coursePrerequisiteController.delete);
router.get('/course/:courseId', validate(getPrerequisitesByCourseSchema), coursePrerequisiteController.getPrerequisitesByCourse);

export default router;

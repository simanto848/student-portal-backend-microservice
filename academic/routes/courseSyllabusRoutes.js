import express from 'express';
import { validate } from '../validations/index.js';
import {
    createCourseSyllabusSchema,
    updateCourseSyllabusSchema,
    getCourseSyllabusByIdSchema,
    deleteCourseSyllabusSchema,
    getCourseSyllabusesSchema,
    approveSyllabusSchema,
    publishSyllabusSchema,
} from '../validations/index.js';
import courseSyllabusController from '../controllers/courseSyllabusController.js';

const router = express.Router();

router.get('/', validate(getCourseSyllabusesSchema), courseSyllabusController.getAll);
router.get('/:id', validate(getCourseSyllabusByIdSchema), courseSyllabusController.getById);
router.post('/', validate(createCourseSyllabusSchema), courseSyllabusController.create);
router.patch('/:id', validate(updateCourseSyllabusSchema), courseSyllabusController.update);
router.delete('/:id', validate(deleteCourseSyllabusSchema), courseSyllabusController.delete);

router.post('/:id/approve', validate(approveSyllabusSchema), courseSyllabusController.approveSyllabus);
router.post('/:id/publish', validate(publishSyllabusSchema), courseSyllabusController.publishSyllabus);

export default router;


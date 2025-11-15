import express from 'express';
import { validate } from '../validations/index.js';
import {
  createCourseSchema,
  updateCourseSchema,
  getCourseByIdSchema,
  deleteCourseSchema,
  getCoursesSchema,
} from '../validations/index.js';
import courseController from '../controllers/courseController.js';
import coursePrerequisiteRoutes from './coursePrerequisiteRoutes.js';

const router = express.Router();

router.use('/prerequisites', coursePrerequisiteRoutes);

router.get('/', validate(getCoursesSchema), courseController.getAll);
router.get('/:id', validate(getCourseByIdSchema), courseController.getById);
router.post('/', validate(createCourseSchema), courseController.create);
router.patch('/:id', validate(updateCourseSchema), courseController.update);
router.delete('/:id', validate(deleteCourseSchema), courseController.delete);


export default router;

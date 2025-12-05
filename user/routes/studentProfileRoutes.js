import express from 'express';
import studentProfileController from '../controllers/studentProfileController.js';
import { authenticate, authorize } from 'shared';
import { validate } from '../middlewares/validate.js';
import {
    studentProfileCreateValidation,
    studentProfileUpdateValidation,
    addEducationRecordValidation,
} from '../validations/studentProfileValidation.js';

const router = express.Router();

router.use(authenticate);

router.get('/:studentId', authorize('super_admin', 'admin', 'staff', 'teacher', 'student'), studentProfileController.getByStudentId);
router.post('/:studentId', authorize('super_admin', 'admin', 'staff'), validate(studentProfileCreateValidation), studentProfileController.create);
router.put('/:studentId', authorize('super_admin', 'admin', 'staff'), validate(studentProfileCreateValidation), studentProfileController.upsert);
router.patch('/:studentId', authorize('super_admin', 'admin', 'staff'), validate(studentProfileUpdateValidation), studentProfileController.update);
router.delete('/:studentId', authorize('super_admin', 'admin', 'staff'), studentProfileController.delete);
router.post('/:studentId/restore', authorize('super_admin', 'admin', 'staff'), studentProfileController.restore);
router.post('/:studentId/education', authorize('super_admin', 'admin', 'staff'), validate(addEducationRecordValidation), studentProfileController.addEducationRecord);
router.patch('/:studentId/education/:index', authorize('super_admin', 'admin', 'staff'), validate(addEducationRecordValidation), studentProfileController.updateEducationRecord);
router.delete('/:studentId/education/:index', authorize('super_admin', 'admin', 'staff'), studentProfileController.removeEducationRecord);

export default router;
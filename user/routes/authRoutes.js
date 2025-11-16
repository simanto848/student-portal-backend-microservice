import express from 'express';
import authController from '../controllers/authController.js';
import { validate } from '../middlewares/validate.js';
import {
    adminLoginSchema,
    staffLoginSchema,
    teacherLoginSchema,
    studentLoginSchema
} from '../validations/loginValidation.js';

const router = express.Router();

router.post('/admins/login', validate(adminLoginSchema), authController.loginAdmin);
router.post('/staffs/login', validate(staffLoginSchema), authController.loginStaff);
router.post('/teachers/login', validate(teacherLoginSchema), authController.loginTeacher);
router.post('/students/login', validate(studentLoginSchema), authController.loginStudent);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

export default router;


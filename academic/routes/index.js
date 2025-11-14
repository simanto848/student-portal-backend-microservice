import express from 'express';
import facultyRoutes from "./facultyRoutes.js";
import departmentRoutes from "./departmentRoutes.js";
import programRoutes from "./programRoutes.js";
import sessionRoutes from "./sessionRoutes.js";

const router = express.Router();

router.use('/faculties', facultyRoutes);
router.use('/departments', departmentRoutes);
router.use('/programs', programRoutes);
router.use('/sessions', sessionRoutes);

export default router;
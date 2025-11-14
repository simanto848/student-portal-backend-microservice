import express from 'express';
import facultyRoutes from "./facultyRoutes.js";
import departmentRoutes from "./departmentRoutes.js";
import programRoutes from "./programRoutes.js";

const router = express.Router();

router.use('/faculties', facultyRoutes);
router.use('/departments', departmentRoutes);
router.use('/programs', programRoutes);

export default router;
import express from 'express';
import facultyRoutes from "./facultyRoutes.js";
import departmentRoutes from "./departmentRoutes.js";

const router = express.Router();

router.use('/faculties', facultyRoutes);
router.use('/departments', departmentRoutes);

export default router;
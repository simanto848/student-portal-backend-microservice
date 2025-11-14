import express from 'express';
import facultyRoutes from "./facultyRoutes.js";

const router = express.Router();

router.use('/faculties', facultyRoutes);

export default router;
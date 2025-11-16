import express from 'express';
import adminRoutes from './adminRoutes.js';
import staffRoutes from './staffRoutes.js';
import authRoutes from './authRoutes.js';

const router = express.Router();

router.use('/admins', adminRoutes);
router.use('/staffs', staffRoutes);
router.use('/auth', authRoutes);

export default router;

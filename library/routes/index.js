import express from 'express';
import libraryRoutes from './libraryRoutes.js';
import bookRoutes from './bookRoutes.js';
import bookCopyRoutes from './bookCopyRoutes.js';
import borrowingRoutes from './borrowingRoutes.js';

const router = express.Router();

router.use('/libraries', libraryRoutes);
router.use('/books', bookRoutes);
router.use('/copies', bookCopyRoutes);
router.use('/borrowings', borrowingRoutes);

export default router;

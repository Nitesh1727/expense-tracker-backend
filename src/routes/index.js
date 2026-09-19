import express from 'express';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import expenseRoutes from './expense.routes.js';
import analyticsRoutes from './analytics.routes.js';
import exportRoutes from './export.routes.js';
import publicRoutes from './public.routes.js';

const { Router } = express;
const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/expenses', expenseRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/export', exportRoutes);
router.use('/public', publicRoutes);

export default router;

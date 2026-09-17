import express from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';
import requireAuth from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { summarySchema, trendSchema } from '../validators/analytics.validator.js';

const { Router } = express;

const router = Router();

router.use(requireAuth);

router.get('/summary', validate(summarySchema), analyticsController.summary);
router.get('/trend', validate(trendSchema), analyticsController.trend);

export default router;

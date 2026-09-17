import express from 'express';
import * as exportController from '../controllers/export.controller.js';
import requireAuth from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { exportQuerySchema } from '../validators/expense.validator.js';

const { Router } = express;

const router = Router();

router.use(requireAuth);

router.get('/csv', validate(exportQuerySchema), exportController.csv);

export default router;

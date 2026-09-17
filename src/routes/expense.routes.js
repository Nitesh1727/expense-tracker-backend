import express from 'express';
import * as expenseController from '../controllers/expense.controller.js';
import requireAuth from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesSchema,
  dailySummarySchema,
} from '../validators/expense.validator.js';
import { idParamSchema } from '../validators/common.validator.js';

const { Router } = express;

const router = Router();

router.use(requireAuth);

router.get('/', validate(listExpensesSchema), expenseController.list);
router.post('/', validate(createExpenseSchema), expenseController.create);
// Must come before /:id — otherwise "daily-summary" would be matched as an :id param.
router.get('/daily-summary', validate(dailySummarySchema), expenseController.dailySummary);
router.get('/:id', validate(idParamSchema), expenseController.getOne);
router.put('/:id', validate(updateExpenseSchema), expenseController.update);
router.delete('/:id', validate(idParamSchema), expenseController.remove);

export default router;

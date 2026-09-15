const { Router } = require('express');
const expenseController = require('../controllers/expense.controller');
const requireAuth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createExpenseSchema, updateExpenseSchema, listExpensesSchema } = require('../validators/expense.validator');
const { idParamSchema } = require('../validators/common.validator');

const router = Router();

router.use(requireAuth);

router.get('/', validate(listExpensesSchema), expenseController.list);
router.post('/', validate(createExpenseSchema), expenseController.create);
router.get('/:id', validate(idParamSchema), expenseController.getOne);
router.put('/:id', validate(updateExpenseSchema), expenseController.update);
router.delete('/:id', validate(idParamSchema), expenseController.remove);

module.exports = router;

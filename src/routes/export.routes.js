const { Router } = require('express');
const exportController = require('../controllers/export.controller');
const requireAuth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { exportQuerySchema } = require('../validators/expense.validator');

const router = Router();

router.use(requireAuth);

router.get('/csv', validate(exportQuerySchema), exportController.csv);

module.exports = router;

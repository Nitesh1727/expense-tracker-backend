const { Router } = require('express');

const router = Router();

router.use('/auth', require('./auth.routes'));
router.use('/categories', require('./category.routes'));
router.use('/expenses', require('./expense.routes'));
router.use('/analytics', require('./analytics.routes'));
router.use('/export', require('./export.routes'));

module.exports = router;

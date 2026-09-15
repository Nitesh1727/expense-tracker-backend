const { Router } = require('express');
const analyticsController = require('../controllers/analytics.controller');
const requireAuth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { summarySchema, trendSchema } = require('../validators/analytics.validator');

const router = Router();

router.use(requireAuth);

router.get('/summary', validate(summarySchema), analyticsController.summary);
router.get('/trend', validate(trendSchema), analyticsController.trend);

module.exports = router;

const { Router } = require('express');
const categoryController = require('../controllers/category.controller');
const requireAuth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createCategorySchema, updateCategorySchema } = require('../validators/category.validator');
const { idParamSchema } = require('../validators/common.validator');

const router = Router();

router.use(requireAuth);

router.get('/', categoryController.list);
router.post('/', validate(createCategorySchema), categoryController.create);
router.put('/:id', validate(updateCategorySchema), categoryController.update);
router.delete('/:id', validate(idParamSchema), categoryController.remove);

module.exports = router;

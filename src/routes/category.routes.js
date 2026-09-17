import express from 'express';
import * as categoryController from '../controllers/category.controller.js';
import requireAuth from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator.js';
import { idParamSchema } from '../validators/common.validator.js';

const { Router } = express;

const router = Router();

router.use(requireAuth);

router.get('/', categoryController.list);
router.post('/', validate(createCategorySchema), categoryController.create);
router.put('/:id', validate(updateCategorySchema), categoryController.update);
router.delete('/:id', validate(idParamSchema), categoryController.remove);

export default router;

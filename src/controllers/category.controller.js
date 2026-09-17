import * as categoryService from '../services/category.service.js';

async function list(req, res) {
  const categories = await categoryService.listCategories(req.userId);
  res.status(200).json({ categories });
}

async function create(req, res) {
  const category = await categoryService.createCategory(req.userId, req.valid.body);
  res.status(201).json({ category });
}

async function update(req, res) {
  const category = await categoryService.updateCategory(req.userId, req.valid.params.id, req.valid.body);
  res.status(200).json({ category });
}

async function remove(req, res) {
  await categoryService.deleteCategory(req.userId, req.valid.params.id);
  res.status(204).send();
}

export { list, create, update, remove };

const expenseService = require('../services/expense.service');

async function create(req, res) {
  const expense = await expenseService.createExpense(req.userId, req.valid.body);
  res.status(201).json({ expense });
}

async function list(req, res) {
  const result = await expenseService.listExpenses(req.userId, req.valid.query);
  res.status(200).json(result);
}

async function getOne(req, res) {
  const expense = await expenseService.getExpenseById(req.userId, req.valid.params.id);
  res.status(200).json({ expense });
}

async function update(req, res) {
  const expense = await expenseService.updateExpense(req.userId, req.valid.params.id, req.valid.body);
  res.status(200).json({ expense });
}

async function remove(req, res) {
  await expenseService.deleteExpense(req.userId, req.valid.params.id);
  res.status(204).send();
}

module.exports = { create, list, getOne, update, remove };

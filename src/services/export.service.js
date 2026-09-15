const expenseService = require('./expense.service');
const { expensesToCsv } = require('../utils/csv.util');

async function exportCsv(userId, filters) {
  const expenses = await expenseService.findInRange(userId, filters);
  return expensesToCsv(expenses);
}

module.exports = { exportCsv };

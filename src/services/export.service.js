import * as expenseService from './expense.service.js';
import { expensesToCsv } from '../utils/csv.util.js';

async function exportCsv(userId, filters) {
  const expenses = await expenseService.findInRange(userId, filters);
  return expensesToCsv(expenses);
}

export { exportCsv };

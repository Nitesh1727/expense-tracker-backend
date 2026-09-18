import * as expenseService from './expense.service.js';
import { expensesToWorkbook } from '../utils/excel.util.js';

async function exportXlsx(userId, { label, ...filters }) {
  const expenses = await expenseService.findInRange(userId, filters);
  const workbook = await expensesToWorkbook(expenses, label || 'All expenses');
  return workbook.xlsx.writeBuffer();
}

export { exportXlsx };

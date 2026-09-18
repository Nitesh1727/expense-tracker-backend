import ExcelJS from 'exceljs';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * `date.toISOString().slice(0, 10)` gives the UTC calendar date, which is
 * the wrong date for anything logged between midnight and 5:30am IST (see
 * dateRange.util.js — same underlying issue, caught the same way, live on
 * the Analytics screen). Shift into IST before reading the date part.
 */
function toIstDateString(date) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

const CURRENCY_FORMAT = '"₹"#,##0.00';
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCC5F3B' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };
const TOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3EDE8' } };

function styleHeaderRow(row) {
  row.height = 20;
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle' };
  });
}

/**
 * Excel sheet names can't exceed 31 characters or contain : \ / ? * [ ] —
 * the period label the app passes ("September 2026", "14 Sep 2026 – 20 Sep
 * 2026") is free text a user could in theory tamper with via the query
 * param, so this guards the sheet name rather than trusting it verbatim.
 */
function sanitizeSheetName(label) {
  const cleaned = label.replace(/[:\\/?*[\]]/g, '').trim();
  return cleaned.slice(0, 31) || 'Expenses';
}

/**
 * One sheet: a title row, the expense table with a total row beneath it,
 * then a by-category breakdown with each category's share of the total.
 * @param {Array<{date: Date, category: {name: string}, description: string, amount: number}>} expenses
 * @param {string} label - human period label, e.g. "September 2026" — always carries its own year (see Formatters.periodLabel on the frontend, which this mirrors).
 */
async function expensesToWorkbook(expenses, label) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Expense Tracker';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sanitizeSheetName(label), {
    views: [{ state: 'frozen', ySplit: 3 }],
  });
  sheet.columns = [{ width: 14 }, { width: 20 }, { width: 34 }, { width: 16 }];

  sheet.mergeCells('A1:D1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `Expenses — ${label}`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF2D2A26' } };
  sheet.getRow(1).height = 26;

  sheet.addRow([]);
  styleHeaderRow(sheet.addRow(['Date', 'Category', 'Description', 'Amount']));

  let total = 0;
  const byCategory = new Map();
  for (const expense of expenses) {
    const row = sheet.addRow([
      toIstDateString(expense.date),
      expense.category?.name ?? '',
      expense.description,
      expense.amount,
    ]);
    row.getCell(4).numFmt = CURRENCY_FORMAT;
    total += expense.amount;

    const name = expense.category?.name ?? 'Uncategorized';
    byCategory.set(name, (byCategory.get(name) ?? 0) + expense.amount);
  }

  sheet.addRow([]);
  const totalRow = sheet.addRow(['Total', '', '', total]);
  sheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
  totalRow.eachCell((cell) => (cell.fill = TOTAL_FILL));
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(4).font = { bold: true };
  totalRow.getCell(4).numFmt = CURRENCY_FORMAT;

  sheet.addRow([]);
  sheet.addRow([]);
  sheet.addRow(['By category']).getCell(1).font = { bold: true, size: 12 };
  styleHeaderRow(sheet.addRow(['Category', 'Amount', '% of total']));

  const sortedCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  for (const [name, amount] of sortedCategories) {
    const row = sheet.addRow([name, amount, total === 0 ? 0 : amount / total]);
    row.getCell(2).numFmt = CURRENCY_FORMAT;
    row.getCell(3).numFmt = '0.0%';
  }

  return workbook;
}

export { expensesToWorkbook };

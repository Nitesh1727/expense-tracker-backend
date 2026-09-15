/**
 * Plain string-builder CSV — the shape is too simple (4 flat columns, no
 * nested/quoted data beyond descriptions) to justify a dependency.
 */

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

function escapeCsvField(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** @param {Array<{date: Date, category: {name: string}, description: string, amount: number}>} expenses */
function expensesToCsv(expenses) {
  const header = ['Date', 'Category', 'Description', 'Amount'];
  const rows = expenses.map((e) => [
    toIstDateString(e.date),
    e.category?.name ?? '',
    e.description,
    e.amount,
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsvField).join(',')).join('\n');
}

module.exports = { expensesToCsv };

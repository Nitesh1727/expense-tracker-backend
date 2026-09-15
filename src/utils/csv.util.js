/**
 * Plain string-builder CSV — the shape is too simple (4 flat columns, no
 * nested/quoted data beyond descriptions) to justify a dependency.
 */

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
    e.date.toISOString().slice(0, 10),
    e.category?.name ?? '',
    e.description,
    e.amount,
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsvField).join(',')).join('\n');
}

module.exports = { expensesToCsv };

import * as exportService from '../services/export.service.js';

async function csv(req, res) {
  const csvBody = await exportService.exportCsv(req.userId, req.valid.query);

  res.status(200);
  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', `attachment; filename="expenses-${Date.now()}.csv"`);
  res.send(csvBody);
}

export { csv };

import * as exportService from '../services/export.service.js';

/**
 * Strips characters that are unsafe in a filesystem name, then forces the
 * result down to printable ASCII — a raw (non `filename*=`-encoded) HTTP
 * header value can't carry arbitrary Unicode. Period labels routinely
 * contain one (the Week tab's "14 – 20 Sep 2026" uses an en dash), which
 * otherwise makes `res.set('Content-Disposition', ...)` throw
 * `ERR_INVALID_CHAR` and 500 the whole request — caught live, this is why
 * export failed on the very first attempt (default period is Week).
 */
function sanitizeFilename(label) {
  return (
    label
      .replace(/[/\\:*?"<>|]/g, '')
      .replace(/[‐-―]/g, '-') // en/em/figure dashes -> plain hyphen
      .replace(/[^\x20-\x7E]/g, '') // anything else outside printable ASCII
      .trim() || 'expenses'
  );
}

async function xlsx(req, res) {
  const { label, ...filters } = req.valid.query;
  const buffer = await exportService.exportXlsx(req.userId, { label, ...filters });

  const filename = `Expenses - ${sanitizeFilename(label || 'All expenses')}.xlsx`;

  res.status(200);
  res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  // Plain ASCII-safe fallback plus an RFC 5987 UTF-8 form (filename* — for
  // the em dash and any non-ASCII category/period text) since the plain
  // `filename` param isn't reliably read as UTF-8 by every client.
  res.set('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send(buffer);
}

export { xlsx };

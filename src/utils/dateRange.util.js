/**
 * Turns a period name ("day" | "week" | "month" | "year") + an anchor date
 * into the {start, end} bounds used by analytics/export $match queries.
 *
 * Deliberately UTC-based rather than reading the server's local timezone —
 * a server's local TZ depends on where it's deployed and shouldn't silently
 * change what "today" means for users. This is a known v1 simplification:
 * for a single-timezone user base it's correct enough; if users end up
 * spread across timezones, this should take an explicit UTC offset from the
 * client instead of assuming UTC day boundaries.
 *
 * Weeks start Monday (ISO 8601).
 */

const PERIODS = ['day', 'week', 'month', 'year'];

function startOfUtcDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addUtcDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function getDateRange(period, anchor = new Date()) {
  if (!PERIODS.includes(period)) {
    throw new Error(`Unknown period: ${period}`);
  }

  const anchorDay = startOfUtcDay(anchor);

  if (period === 'day') {
    return { start: anchorDay, end: addUtcDays(anchorDay, 1) };
  }

  if (period === 'week') {
    const dayOfWeek = anchorDay.getUTCDay(); // 0=Sun..6=Sat
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const start = addUtcDays(anchorDay, -daysSinceMonday);
    return { start, end: addUtcDays(start, 7) };
  }

  if (period === 'month') {
    const start = new Date(Date.UTC(anchorDay.getUTCFullYear(), anchorDay.getUTCMonth(), 1));
    const end = new Date(Date.UTC(anchorDay.getUTCFullYear(), anchorDay.getUTCMonth() + 1, 1));
    return { start, end };
  }

  // year
  const start = new Date(Date.UTC(anchorDay.getUTCFullYear(), 0, 1));
  const end = new Date(Date.UTC(anchorDay.getUTCFullYear() + 1, 0, 1));
  return { start, end };
}

/** Trend charts bucket by day within a week/month, by month within a year. */
function getTrendBucketUnit(period) {
  return period === 'year' ? 'month' : 'day';
}

module.exports = { PERIODS, getDateRange, getTrendBucketUnit, startOfUtcDay, addUtcDays };

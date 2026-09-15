/**
 * Turns a period name ("day" | "week" | "month" | "year") + an anchor date
 * into the {start, end} bounds used by analytics/export $match queries.
 *
 * Boundaries are computed in IST (UTC+5:30), not true UTC. This was
 * originally written as UTC-based, but that meant every day/week/month/year
 * boundary was off by 5.5 hours for the app's actual user base (India,
 * single timezone, INR default currency) — caught by manually testing the
 * Analytics screen, where a "today" expense showed up bucketed under
 * yesterday's date. Fixed by shifting to IST wall-clock time before
 * truncating, then shifting back to get the real UTC instant for the query.
 * India has no DST, so a fixed offset is correct, not just an approximation.
 * If the user base ever spans multiple timezones, this needs to take an
 * explicit per-request offset from the client instead of a hardcoded one.
 *
 * Weeks start Monday (ISO 8601).
 */

const PERIODS = ['day', 'week', 'month', 'year'];
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const toIstShifted = (date) => new Date(date.getTime() + IST_OFFSET_MS);
const fromIstShifted = (date) => new Date(date.getTime() - IST_OFFSET_MS);

function startOfShiftedDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addShiftedDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function getDateRange(period, anchor = new Date()) {
  if (!PERIODS.includes(period)) {
    throw new Error(`Unknown period: ${period}`);
  }

  const anchorDay = startOfShiftedDay(toIstShifted(anchor));

  if (period === 'day') {
    return { start: fromIstShifted(anchorDay), end: fromIstShifted(addShiftedDays(anchorDay, 1)) };
  }

  if (period === 'week') {
    const dayOfWeek = anchorDay.getUTCDay(); // 0=Sun..6=Sat, in shifted (IST) time
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const start = addShiftedDays(anchorDay, -daysSinceMonday);
    return { start: fromIstShifted(start), end: fromIstShifted(addShiftedDays(start, 7)) };
  }

  if (period === 'month') {
    const start = new Date(Date.UTC(anchorDay.getUTCFullYear(), anchorDay.getUTCMonth(), 1));
    const end = new Date(Date.UTC(anchorDay.getUTCFullYear(), anchorDay.getUTCMonth() + 1, 1));
    return { start: fromIstShifted(start), end: fromIstShifted(end) };
  }

  // year
  const start = new Date(Date.UTC(anchorDay.getUTCFullYear(), 0, 1));
  const end = new Date(Date.UTC(anchorDay.getUTCFullYear() + 1, 0, 1));
  return { start: fromIstShifted(start), end: fromIstShifted(end) };
}

/** Trend charts bucket by day within a week/month, by month within a year. */
function getTrendBucketUnit(period) {
  return period === 'year' ? 'month' : 'day';
}

module.exports = { PERIODS, getDateRange, getTrendBucketUnit };

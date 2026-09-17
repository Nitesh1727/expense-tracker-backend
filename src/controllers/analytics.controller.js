import * as analyticsService from '../services/analytics.service.js';

async function summary(req, res) {
  const { period, anchor } = req.valid.query;
  const result = await analyticsService.getSummary(req.userId, period, anchor);
  res.status(200).json(result);
}

async function trend(req, res) {
  const { period, anchor } = req.valid.query;
  const result = await analyticsService.getTrend(req.userId, period, anchor);
  res.status(200).json(result);
}

export { summary, trend };

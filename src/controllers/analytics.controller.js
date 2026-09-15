const analyticsService = require('../services/analytics.service');

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

module.exports = { summary, trend };

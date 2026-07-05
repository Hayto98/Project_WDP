const analyticsService = require('../services/analytics.service');
const ApiResponse = require('../utils/apiResponse');

async function getTrends(req, res) {
  try {
    const data = await analyticsService.getTrends(req.query);
    return ApiResponse.success(res, data);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function getGrowth(req, res) {
  try {
    const data = await analyticsService.getGrowth(req.query);
    return ApiResponse.success(res, data);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function getCooccurrence(req, res) {
  try {
    const data = await analyticsService.getCooccurrence();
    return ApiResponse.success(res, data);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function getGaps(req, res) {
  try {
    const data = await analyticsService.getGaps(req.query);
    return ApiResponse.success(res, data);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

module.exports = { getTrends, getGrowth, getCooccurrence, getGaps };

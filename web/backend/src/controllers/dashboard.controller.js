const dashboardService = require('../services/dashboard.service');
const ApiResponse = require('../utils/apiResponse');

async function getOverview(req, res) {
  try {
    const data = await dashboardService.getDashboardOverview(req.user.id);
    return ApiResponse.success(res, data);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

module.exports = { getOverview };

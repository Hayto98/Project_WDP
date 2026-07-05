const paperService = require('../services/paper.service');
const ApiResponse = require('../utils/apiResponse');

async function search(req, res) {
  try {
    const { papers, page, limit, total } = await paperService.searchPapers(req.query);
    return ApiResponse.paginated(res, papers, page, limit, total);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function getById(req, res) {
  try {
    const paper = await paperService.getPaperById(
      req.params.id,
      req.user?.id,
      req.query.source || 'Search_Result',
    );
    return ApiResponse.success(res, paper);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function getTrending(req, res) {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const limit = parseInt(req.query.limit, 10) || 10;
    const results = await paperService.getTrendingPapers(days, limit);
    return ApiResponse.success(res, results);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

module.exports = { search, getById, getTrending };

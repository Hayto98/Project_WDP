const ApiResponse = require('../utils/apiResponse');
const aiService = require('../services/ai.service');

async function summarize(req, res) {
  try {
    const result = await aiService.summarizePaper(req.body);
    return ApiResponse.success(res, result);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function explainTerm(req, res) {
  try {
    const result = await aiService.explainTerm(req.body);
    return ApiResponse.success(res, result);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function suggestDirections(req, res) {
  try {
    const result = await aiService.suggestDirections(req.body);
    return ApiResponse.success(res, result);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function getInsights(req, res) {
  try {
    const insights = await aiService.getInsights(req.query);
    return ApiResponse.success(res, insights);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function relatedPapers(req, res) {
  try {
    const result = await aiService.getRelatedPapers(req.body);
    return ApiResponse.success(res, result);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

module.exports = { summarize, explainTerm, suggestDirections, getInsights, relatedPapers };

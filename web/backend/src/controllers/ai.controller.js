const ApiResponse = require('../utils/apiResponse');

/**
 * AI endpoints — placeholder implementations.
 * Actual LLM integration will be added once API is confirmed (FR-009 open question).
 * Results are NOT stored in MongoDB (BR-033, BR-035).
 */

async function summarize(req, res) {
  try {
    const { abstract, title } = req.body;
    // TODO: Call LLM API to summarize
    const summary = `[AI Tóm tắt] ${title}: ${abstract ? abstract.substring(0, 200) + '...' : 'Không có abstract.'}`;
    return ApiResponse.success(res, { summary });
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function explainTerm(req, res) {
  try {
    const { term } = req.body;
    // TODO: Call LLM API to explain
    const explanation = `[AI Giải thích] "${term}": Đang chờ tích hợp LLM API.`;
    return ApiResponse.success(res, { term, explanation });
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function suggestDirections(req, res) {
  try {
    const { field, gaps } = req.body;
    // TODO: Call LLM API with gap data to suggest research directions
    const directions = [
      {
        topic: `Hướng nghiên cứu mới trong ${field || 'lĩnh vực đã chọn'}`,
        rationale: 'Đang chờ tích hợp LLM API để phân tích chi tiết.',
      },
    ];
    return ApiResponse.success(res, { directions });
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function getInsights(req, res) {
  try {
    // TODO: Generate AI insights from gap analysis data
    const insights = {
      summary: 'Đang chờ tích hợp LLM API.',
      directions: [],
      evidence: [],
    };
    return ApiResponse.success(res, insights);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

module.exports = { summarize, explainTerm, suggestDirections, getInsights };

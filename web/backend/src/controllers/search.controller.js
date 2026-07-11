const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const searchService = require('../services/search.service');

const getSavedSearches = asyncHandler(async (req, res) => {
  const searches = await searchService.getSavedSearches(req.user.id);
  return ApiResponse.success(res, searches);
});

const createSavedSearch = asyncHandler(async (req, res) => {
  const search = await searchService.createSavedSearch(req.user.id, req.body);
  return ApiResponse.created(res, search);
});

const deleteSavedSearch = asyncHandler(async (req, res) => {
  const result = await searchService.deleteSavedSearch(req.user.id, req.params.id);
  return ApiResponse.success(res, result);
});

module.exports = { getSavedSearches, createSavedSearch, deleteSavedSearch };

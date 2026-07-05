const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

async function getSavedSearches(req, res) {
  try {
    const user = await User.findById(req.user.id).select('saved_searches').lean();
    return ApiResponse.success(res, user?.saved_searches || []);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function createSavedSearch(req, res) {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $push: { saved_searches: req.body } },
      { new: true },
    ).select('saved_searches');
    return ApiResponse.created(res, user.saved_searches[user.saved_searches.length - 1]);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function deleteSavedSearch(req, res) {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { saved_searches: { search_id: req.params.id } },
    });
    return ApiResponse.success(res, { message: 'Saved search deleted' });
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

module.exports = { getSavedSearches, createSavedSearch, deleteSavedSearch };

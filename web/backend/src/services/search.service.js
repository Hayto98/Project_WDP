const User = require('../models/User');

function normalizeCriteria(criteria = {}) {
  return {
    keywords: Array.isArray(criteria.keywords) ? criteria.keywords : [],
    year_gte: criteria.year_gte,
    year_lte: criteria.year_lte,
    authors: Array.isArray(criteria.authors) ? criteria.authors : [],
    research_fields: Array.isArray(criteria.research_fields) ? criteria.research_fields : [],
    source_names: Array.isArray(criteria.source_names) ? criteria.source_names : [],
    logic: criteria.logic === 'OR' ? 'OR' : 'AND',
  };
}

async function getSavedSearches(userId) {
  const user = await User.findById(userId).select('saved_searches').lean();
  return user?.saved_searches || [];
}

async function createSavedSearch(userId, payload) {
  const savedSearch = {
    name: payload.name,
    criteria: normalizeCriteria(payload.criteria || {}),
  };

  const user = await User.findByIdAndUpdate(
    userId,
    { $push: { saved_searches: savedSearch } },
    { returnDocument: 'after' },
  ).select('saved_searches');

  return user.saved_searches[user.saved_searches.length - 1];
}

async function deleteSavedSearch(userId, searchId) {
  await User.findByIdAndUpdate(userId, {
    $pull: { saved_searches: { search_id: searchId } },
  });
  return { message: 'Saved search deleted' };
}

module.exports = {
  getSavedSearches,
  createSavedSearch,
  deleteSavedSearch,
};

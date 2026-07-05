const libraryService = require('../services/library.service');
const ApiResponse = require('../utils/apiResponse');

async function getCollections(req, res) {
  try {
    const collections = await libraryService.getCollections(req.user.id);
    return ApiResponse.success(res, collections);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function createCollection(req, res) {
  try {
    const col = await libraryService.createCollection(req.user.id, req.body);
    return ApiResponse.created(res, col);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function updateCollection(req, res) {
  try {
    const col = await libraryService.updateCollection(req.user.id, req.params.id, req.body);
    return ApiResponse.success(res, col);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function deleteCollection(req, res) {
  try {
    await libraryService.deleteCollection(req.user.id, req.params.id);
    return ApiResponse.success(res, { message: 'Collection deleted' });
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function getPapers(req, res) {
  try {
    const { papers, page, limit, total } = await libraryService.getSavedPapers(req.user.id, req.query);
    return ApiResponse.paginated(res, papers, page, limit, total);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function savePaper(req, res) {
  try {
    const result = await libraryService.savePaper(req.user.id, req.body);
    return ApiResponse.created(res, result);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function updatePaper(req, res) {
  try {
    const result = await libraryService.updateSavedPaper(
      req.user.id,
      req.params.collectionId,
      req.params.paperId,
      req.body,
    );
    return ApiResponse.success(res, result);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function removePaper(req, res) {
  try {
    await libraryService.removePaper(req.user.id, req.params.collectionId, req.params.paperId);
    return ApiResponse.success(res, { message: 'Paper removed from collection' });
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getPapers,
  savePaper,
  updatePaper,
  removePaper,
};

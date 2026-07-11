const UserCollection = require('../models/UserCollection');
const Paper = require('../models/Paper');
const { parsePagination } = require('../utils/pagination');

/**
 * Get all collections for a user (BR-028).
 */
async function getCollections(userId) {
  return UserCollection.find({ user_id: userId })
    .select('collection_name description created_at updated_at')
    .sort({ updated_at: -1 })
    .lean();
}

/**
 * Create a new collection.
 */
async function createCollection(userId, { collection_name, description }) {
  return UserCollection.create({
    user_id: userId,
    collection_name,
    description: description || '',
    saved_papers: [],
  });
}

/**
 * Update a collection (name/description).
 */
async function updateCollection(userId, collectionId, updates) {
  const col = await UserCollection.findOneAndUpdate(
    { _id: collectionId, user_id: userId },
    { collection_name: updates.collection_name, description: updates.description },
    { returnDocument: 'after', runValidators: true },
  );
  if (!col) throw Object.assign(new Error('Collection not found'), { statusCode: 404 });
  return col;
}

/**
 * Delete a collection.
 */
async function deleteCollection(userId, collectionId) {
  const result = await UserCollection.deleteOne({ _id: collectionId, user_id: userId });
  if (result.deletedCount === 0) {
    throw Object.assign(new Error('Collection not found'), { statusCode: 404 });
  }
}

/**
 * Get all saved papers across collections (with filtering).
 */
async function getSavedPapers(userId, query) {
  const { page, limit, skip } = parsePagination(query);

  const match = { user_id: userId };
  if (query.collection) match._id = query.collection;

  const collections = await UserCollection.find(match).lean();

  // Flatten saved_papers from all matching collections
  let allPapers = [];
  for (const col of collections) {
    for (const sp of col.saved_papers) {
      allPapers.push({ ...sp, collection_id: col._id, collection_name: col.collection_name });
    }
  }

  // Filter by status
  if (query.status) {
    allPapers = allPapers.filter((p) => p.status === query.status);
  }

  // Sort by saved_at desc
  allPapers.sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at));

  const total = allPapers.length;
  const paginated = allPapers.slice(skip, skip + limit);

  // Enrich with full paper data
  const paperIds = paginated.map((p) => p.paper_id).filter(Boolean);
  const papers = await Paper.find({ _id: { $in: paperIds } }).lean();
  const paperMap = new Map(papers.map((p) => [p._id.toString(), p]));

  const enriched = paginated.map((sp) => ({
    ...sp,
    paper: sp.paper_id ? paperMap.get(sp.paper_id.toString()) || null : null,
  }));

  return { papers: enriched, page, limit, total };
}

/**
 * Save a paper to collection(s) (BR-027).
 */
async function savePaper(userId, { paper_id, collection_ids, note }) {
  const paper = await Paper.findById(paper_id).lean();
  if (!paper) throw Object.assign(new Error('Paper not found'), { statusCode: 404 });

  const entry = {
    paper_id: paper._id,
    saved_at: new Date(),
    title_snapshot: paper.title,
    availability: paper.status === 'Archived' ? 'Archived' : 'Available',
    status: 'unread',
    note: note || '',
  };

  const results = [];
  for (const colId of collection_ids) {
    const existing = await UserCollection.findOne({
      _id: colId,
      user_id: userId,
      'saved_papers.paper_id': paper._id,
    }).select('_id').lean();
    if (existing) continue;

    const col = await UserCollection.findOneAndUpdate(
      { _id: colId, user_id: userId },
      { $push: { saved_papers: entry } },
      { returnDocument: 'after' },
    );
    if (col) results.push(col);
  }

  return results;
}

/**
 * Update a saved paper entry (status, note, etc.).
 */
async function updateSavedPaper(userId, collectionId, paperId, updates) {
  const setFields = {};
  if (updates.status) setFields['saved_papers.$.status'] = updates.status;
  if (updates.note !== undefined) setFields['saved_papers.$.note'] = updates.note;

  const col = await UserCollection.findOneAndUpdate(
    { _id: collectionId, user_id: userId, 'saved_papers.paper_id': paperId },
    { $set: setFields },
    { returnDocument: 'after' },
  );
  if (!col) throw Object.assign(new Error('Paper not found in collection'), { statusCode: 404 });
  return col;
}

/**
 * Remove a paper from a collection.
 */
async function removePaper(userId, collectionId, paperId) {
  const col = await UserCollection.findOneAndUpdate(
    { _id: collectionId, user_id: userId },
    { $pull: { saved_papers: { paper_id: paperId } } },
    { returnDocument: 'after' },
  );
  if (!col) throw Object.assign(new Error('Collection not found'), { statusCode: 404 });
  return col;
}

module.exports = {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getSavedPapers,
  savePaper,
  updateSavedPaper,
  removePaper,
};
